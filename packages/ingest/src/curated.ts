import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { EntityStore } from './store.js';
import type { CuratedFile, MergeOverrides, SourceMeta } from './types.js';

export const CURATED_FILES = ['sipri.json', 'pax.json', 'un_ohchr.json', 'afsc.json'] as const;

export async function loadMergeOverrides(curatedDir: string): Promise<Record<string, string>> {
  try {
    const raw = await readFile(path.join(curatedDir, 'merge-overrides.json'), 'utf8');
    const parsed = JSON.parse(raw) as MergeOverrides;
    return parsed.merge ?? {};
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('  no merge-overrides.json, continuing without overrides');
      return {};
    }
    throw err;
  }
}

/**
 * Load one curated JSON (contract in data/curated/README.md) into the store.
 * Returns the source metadata, or null when the file doesn't exist yet.
 */
export async function loadCuratedFile(
  store: EntityStore,
  curatedDir: string,
  file: string,
): Promise<SourceMeta | null> {
  let raw: string;
  try {
    raw = await readFile(path.join(curatedDir, file), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`  ${file} not found, skipping`);
      return null;
    }
    throw err;
  }

  const data = JSON.parse(raw) as CuratedFile;
  const sourceKey = data.source.key;
  let companies = 0;

  for (const company of data.companies) {
    const rec = store.upsert({
      name: company.name,
      aliases: company.aliases,
      country: company.country,
      lei: company.lei,
      entityType: 'company',
      flags: company.flags.map((f) => ({
        category: f.category,
        sourceKey,
        detail: f.detail,
        evidenceUrl: f.evidence_url ?? null,
        listedDate: f.listed_date ?? null,
      })),
    });
    for (const sub of company.subsidiaries ?? []) {
      const child = store.upsert({ name: sub, entityType: 'company' });
      store.addRelationship({
        parent: rec,
        child,
        relType: 'subsidiary_curated',
        sourceKey,
      });
    }
    companies++;
  }

  console.log(`  ${file}: ${companies} companies`);
  return {
    key: sourceKey,
    name: data.source.name,
    url: data.source.url,
    license: data.source.license,
    fetchedAt: data.source.fetched_at,
    datasetDate: data.source.dataset_date ?? null,
  };
}
