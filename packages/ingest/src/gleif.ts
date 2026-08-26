import { createReadStream } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { parse } from 'csv-parse';
import unzipper from 'unzipper';
import { downloadToCache } from './download.js';
import { normalizeCountry } from './normalize.js';
import type { EntityStore } from './store.js';
import type { SourceMeta } from './types.js';

const PUBLISHES_URL =
  'https://goldencopy.gleif.org/api/v2/golden-copies/publishes?format=json&per_page=5';
const LEI_RECORDS_URL = 'https://api.gleif.org/api/v1/lei-records';
const CACHE_NAME = 'gleif-rr-golden-copy.csv.zip';

/** Max LEIs resolved through the LEI-records API per run. */
const MAX_LOOKUPS = 2000;
const LOOKUP_BATCH_SIZE = 100;
const LOOKUP_PAUSE_MS = 1500;

const REL_TYPES: Record<string, 'direct_parent' | 'ultimate_parent'> = {
  isdirectlyconsolidatedby: 'direct_parent',
  isultimatelyconsolidatedby: 'ultimate_parent',
};

interface RawEdge {
  childLei: string;
  parentLei: string;
  relType: 'direct_parent' | 'ultimate_parent';
}

interface PublishesResponse {
  data?: {
    publish_date?: string;
    rr?: { full_file?: { csv?: { url?: string } } };
  }[];
}

async function discoverLatestRrCsvUrl(): Promise<{ url: string; publishDate: string | null }> {
  const res = await fetch(PUBLISHES_URL);
  if (!res.ok) throw new Error(`GLEIF publishes API failed: ${res.status} ${res.statusText}`);
  const body = (await res.json()) as PublishesResponse;
  for (const pub of body.data ?? []) {
    const url = pub.rr?.full_file?.csv?.url;
    if (url) return { url, publishDate: pub.publish_date ?? null };
  }
  throw new Error('GLEIF publishes API returned no rr csv full file');
}

/**
 * GLEIF Level 2 (RR CDF) ingest. Runs after all other entities are in the
 * store: filters the relationship golden copy to edges touching our LEIs,
 * resolves names for related-but-unknown LEIs (batched, capped), inserts them
 * as unflagged entities, and records the parent/child edges.
 */
export async function ingestGleif(store: EntityStore, downloadsDir: string): Promise<SourceMeta> {
  const ourLeis = store.leiSet();
  console.log(`  ${ourLeis.size} LEIs in the entity set`);

  const { url, publishDate } = await discoverLatestRrCsvUrl();
  const zipPath = await downloadToCache(url, downloadsDir, CACHE_NAME);

  const edges: RawEdge[] = [];
  const dir = await unzipper.Open.file(zipPath);
  const csvFile = dir.files.find((f) => f.path.toLowerCase().endsWith('.csv'));
  if (!csvFile) throw new Error(`no csv inside ${zipPath}`);

  const parser = csvFile.stream().pipe(
    parse({ columns: true, bom: true, relax_column_count: true }),
  );
  let rows = 0;
  for await (const row of parser as AsyncIterable<Record<string, string>>) {
    rows++;
    if (rows % 100_000 === 0) console.log(`  ...${rows} relationship rows scanned`);

    const relTypeRaw = (row['Relationship.RelationshipType'] ?? '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const relType = REL_TYPES[relTypeRaw];
    if (!relType) continue;
    if ((row['Relationship.RelationshipStatus'] ?? 'ACTIVE').toUpperCase() !== 'ACTIVE') continue;

    const childLei = row['Relationship.StartNode.NodeID']?.trim();
    const parentLei = row['Relationship.EndNode.NodeID']?.trim();
    if (!childLei || !parentLei || childLei === parentLei) continue;
    if (!ourLeis.has(childLei) && !ourLeis.has(parentLei)) continue;
    edges.push({ childLei, parentLei, relType });
  }
  console.log(`  ${edges.length} relevant edges from ${rows} rows`);

  // Resolve LEIs that aren't entities yet so the ownership tree can render.
  const byLei = store.byLeiMap();
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    for (const lei of [edge.parentLei, edge.childLei]) {
      if (!byLei.has(lei) && !seen.has(lei)) {
        seen.add(lei);
        unknown.push(lei);
      }
    }
  }
  const toResolve = unknown.slice(0, MAX_LOOKUPS);
  if (unknown.length > toResolve.length) {
    console.warn(
      `  ${unknown.length} unknown LEIs, resolving first ${toResolve.length} (cap ${MAX_LOOKUPS}); edges to the rest are dropped`,
    );
  }
  const resolved = await resolveLeiNames(toResolve);
  for (const [lei, info] of resolved) {
    store.upsert({
      name: info.name,
      lei,
      country: info.country,
      entityType: 'company',
    });
  }
  console.log(`  resolved ${resolved.size}/${toResolve.length} related LEIs via GLEIF API`);

  let inserted = 0;
  for (const edge of edges) {
    const parent = byLei.get(edge.parentLei);
    const child = byLei.get(edge.childLei);
    if (!parent || !child) continue; // unresolved (beyond cap or retired LEI)
    store.addRelationship({ parent, child, relType: edge.relType, sourceKey: 'gleif' });
    inserted++;
  }
  console.log(`  ${inserted} relationships recorded`);

  return {
    key: 'gleif',
    name: 'GLEIF Level 2 relationship data (RR CDF)',
    url: 'https://www.gleif.org/en/lei-data/gleif-golden-copy',
    license: 'CC0 1.0',
    fetchedAt: new Date().toISOString().slice(0, 10),
    datasetDate: publishDate ? publishDate.slice(0, 10) : null,
  };
}

interface LeiRecordsResponse {
  data?: {
    attributes?: {
      lei?: string;
      entity?: {
        legalName?: { name?: string };
        legalAddress?: { country?: string };
      };
    };
  }[];
}

/**
 * Resolve LEI -> legal name/country via the GLEIF LEI-records API, in batches
 * (filter[lei] accepts a comma-separated list) with a polite pause between
 * requests. A failed batch is skipped, not fatal.
 */
async function resolveLeiNames(
  leis: string[],
): Promise<Map<string, { name: string; country: string | null }>> {
  const out = new Map<string, { name: string; country: string | null }>();
  for (let i = 0; i < leis.length; i += LOOKUP_BATCH_SIZE) {
    if (i > 0) await sleep(LOOKUP_PAUSE_MS);
    const batch = leis.slice(i, i + LOOKUP_BATCH_SIZE);
    const url = `${LEI_RECORDS_URL}?filter%5Blei%5D=${batch.join(',')}&page%5Bsize%5D=${LOOKUP_BATCH_SIZE}`;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/vnd.api+json' } });
      if (!res.ok) {
        console.warn(`  GLEIF lookup batch failed (${res.status}), skipping ${batch.length} LEIs`);
        continue;
      }
      const body = (await res.json()) as LeiRecordsResponse;
      for (const rec of body.data ?? []) {
        const lei = rec.attributes?.lei;
        const name = rec.attributes?.entity?.legalName?.name;
        if (!lei || !name) continue;
        out.set(lei, {
          name,
          country: normalizeCountry(rec.attributes?.entity?.legalAddress?.country),
        });
      }
    } catch (err) {
      console.warn(`  GLEIF lookup batch error, skipping: ${(err as Error).message}`);
    }
  }
  return out;
}
