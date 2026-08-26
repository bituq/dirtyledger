import { streamLines } from './download.js';
import { normalizeCountry } from './normalize.js';
import type { EntityStore } from './store.js';
import type { SourceMeta } from './types.js';

const FEED_URL = 'https://data.opensanctions.org/datasets/latest/sanctions/entities.ftm.json';
const CACHE_NAME = 'opensanctions-sanctions-entities.ftm.json';

const KEPT_SCHEMAS = new Set(['Organization', 'Company']);

/** Human labels for OpenSanctions FtM topics; unknown topics fall back to the raw topic. */
const TOPIC_LABELS: Record<string, string> = {
  sanction: 'sanctioned entity',
  'sanction.linked': 'sanction-linked entity',
  'sanction.counter': 'counter-sanctioned entity',
  crime: 'crime',
  'crime.fin': 'financial crime',
  'crime.fraud': 'fraud',
  'crime.cyber': 'cybercrime',
  'crime.theft': 'theft',
  'crime.war': 'war crimes',
  'crime.terror': 'terrorism',
  'crime.traffick': 'trafficking',
  'crime.boss': 'criminal leadership',
  debarment: 'debarred entity',
  'export.control': 'export controlled',
  'export.risk': 'trade risk',
  'reg.action': 'regulatory action',
  'reg.warn': 'regulator warning',
  'asset.frozen': 'frozen asset',
  poi: 'person of interest',
  wanted: 'wanted',
  mil: 'military',
  'gov.soe': 'state-owned enterprise',
};

interface FtmEntity {
  id: string;
  caption?: string;
  schema: string;
  datasets?: string[];
  first_seen?: string;
  properties?: Record<string, string[]>;
}

/**
 * Stream the OpenSanctions default (sanctions) dataset, keeping only
 * Organization/Company entities that carry at least one topic.
 * `limit` (DIRTYLEDGER_OS_LIMIT) caps the number of kept entities.
 */
export async function ingestOpenSanctions(
  store: EntityStore,
  downloadsDir: string,
  limit: number | null,
): Promise<SourceMeta> {
  let lines = 0;
  let kept = 0;

  await streamLines(FEED_URL, downloadsDir, CACHE_NAME, (line) => {
    lines++;
    if (lines % 250_000 === 0) console.log(`  ...${lines} lines, ${kept} entities kept`);

    let entity: FtmEntity;
    try {
      entity = JSON.parse(line) as FtmEntity;
    } catch {
      return true; // tolerate a malformed line rather than aborting the build
    }
    if (!KEPT_SCHEMAS.has(entity.schema)) return true;

    const props = entity.properties ?? {};
    const topics = props['topics'] ?? [];
    if (topics.length === 0) return true;

    const names = props['name'] ?? [];
    const name = names[0] ?? entity.caption;
    if (!name) return true;
    const aliases = [...names.slice(1), ...(props['alias'] ?? [])];

    const datasets = entity.datasets ?? [];
    const datasetList =
      datasets.slice(0, 3).join(', ') + (datasets.length > 3 ? ', …' : '');
    const listedDate = props['createdAt']?.[0] ?? entity.first_seen ?? null;
    const country =
      (props['country'] ?? []).map(normalizeCountry).find((c) => c !== null) ?? null;

    store.upsert({
      name,
      aliases,
      country,
      lei: props['leiCode']?.[0] ?? null,
      entityType: entity.schema === 'Organization' ? 'organization' : 'company',
      flags: topics.map((topic) => ({
        category: 'sanctions' as const,
        sourceKey: 'opensanctions',
        detail: `OpenSanctions: ${TOPIC_LABELS[topic] ?? topic} — datasets: ${datasetList}`,
        evidenceUrl: `https://www.opensanctions.org/entities/${entity.id}/`,
        listedDate,
      })),
    });

    kept++;
    return limit === null || kept < limit;
  });

  console.log(`  OpenSanctions: ${kept} entities kept from ${lines} lines`);
  return {
    key: 'opensanctions',
    name: 'OpenSanctions (default dataset, org-type entities with topics)',
    url: 'https://www.opensanctions.org/',
    license: 'CC BY-NC 4.0',
    fetchedAt: new Date().toISOString().slice(0, 10),
    datasetDate: null,
  };
}
