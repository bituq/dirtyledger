// All database access lives here. The SQLite file is served as a static asset
// and queried client-side over HTTP range requests via sql.js-httpvfs: a web
// worker runs SQLite compiled to wasm with a virtual filesystem that fetches
// only the pages a query touches.

import { createDbWorker } from "sql.js-httpvfs";
import type { WorkerHttpvfs } from "sql.js-httpvfs";
import workerUrl from "sql.js-httpvfs/dist/sqlite.worker.js?url";
import wasmUrl from "sql.js-httpvfs/dist/sql-wasm.wasm?url";
import { parseCategories, type FlagCategory } from "./categories";

export interface SearchHit {
  entityId: number;
  slug: string;
  name: string;
  country: string | null;
  flagCount: number;
  categories: FlagCategory[];
}

export interface EntityRow {
  id: number;
  slug: string;
  name: string;
  country: string | null;
  lei: string | null;
  entityType: string;
}

export interface FlagRow {
  id: number;
  category: FlagCategory;
  detail: string;
  evidenceUrl: string | null;
  listedDate: string | null;
  sourceKey: string;
  sourceName: string;
  sourceUrl: string;
}

export interface CompanyRecord {
  entity: EntityRow;
  aliases: string[];
  flags: FlagRow[];
}

export type RelType = "direct_parent" | "ultimate_parent" | "subsidiary_curated";

export interface OwnershipEntry {
  entityId: number;
  slug: string;
  name: string;
  country: string | null;
  relType: RelType;
  flagCount: number;
  categories: FlagCategory[];
}

export interface Ownership {
  parents: OwnershipEntry[];
  children: OwnershipEntry[];
}

export interface SourceRow {
  key: string;
  name: string;
  url: string;
  license: string;
  fetchedAt: string;
  datasetDate: string | null;
}

// The DB page size is 4096 (SQLite default, enforced by the fixture script and
// the ingest build); requestChunkSize must match it.
const REQUEST_CHUNK_SIZE = 4096;

let workerPromise: Promise<WorkerHttpvfs> | null = null;

function getWorker(): Promise<WorkerHttpvfs> {
  if (!workerPromise) {
    const dbUrl = new URL(
      `${import.meta.env.BASE_URL}data/dirtyledger.db`,
      window.location.origin
    ).toString();
    workerPromise = createDbWorker(
      [
        {
          from: "inline",
          config: {
            serverMode: "full",
            url: dbUrl,
            requestChunkSize: REQUEST_CHUNK_SIZE,
          },
        },
      ],
      workerUrl,
      wasmUrl
    );
    workerPromise.catch(() => {
      // Allow a retry on the next call instead of caching the failure forever.
      workerPromise = null;
    });
  }
  return workerPromise;
}

async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const worker = await getWorker();
  // The worker forwards its arguments to sql.js `exec(sql, bindParams)`, so
  // the bind parameters must be passed as a single array argument.
  return (await worker.db.query(sql, params)) as T[];
}

/**
 * Turns free text into an FTS5 prefix query: every token quoted, the last one
 * matched as a prefix. Returns null when there is nothing searchable.
 */
function buildMatchExpression(q: string): string | null {
  const tokens = q
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((token, i) => `"${token}"${i === tokens.length - 1 ? "*" : ""}`).join(" ");
}

interface SearchHitRaw {
  entityId: number;
  slug: string;
  name: string;
  country: string | null;
  flagCount: number;
  categories: string | null;
}

export async function searchCompanies(q: string): Promise<SearchHit[]> {
  const match = buildMatchExpression(q);
  if (!match) return [];
  const rows = await query<SearchHitRaw>(
    `SELECT e.id AS entityId,
            e.slug AS slug,
            e.name AS name,
            e.country AS country,
            COUNT(DISTINCT f.id) AS flagCount,
            GROUP_CONCAT(DISTINCT f.category) AS categories,
            MIN(fts.rank) AS bestRank
     FROM entity_fts AS fts
     JOIN entities AS e ON e.id = fts.entity_id
     LEFT JOIN flags AS f ON f.entity_id = e.id
     WHERE entity_fts MATCH ?
     GROUP BY e.id
     ORDER BY bestRank, e.name
     LIMIT 20`,
    [match]
  );
  return rows.map((row) => ({
    entityId: row.entityId,
    slug: row.slug,
    name: row.name,
    country: row.country,
    flagCount: row.flagCount,
    categories: parseCategories(row.categories),
  }));
}

interface EntityRaw {
  id: number;
  slug: string;
  name: string;
  country: string | null;
  lei: string | null;
  entityType: string;
}

export async function getCompany(slug: string): Promise<CompanyRecord | null> {
  const entities = await query<EntityRaw>(
    `SELECT id, slug, name, country, lei, entity_type AS entityType
     FROM entities
     WHERE slug = ?`,
    [slug]
  );
  const entity = entities[0];
  if (!entity) return null;

  const [aliasRows, flagRows] = await Promise.all([
    query<{ name: string }>(
      `SELECT name FROM aliases WHERE entity_id = ? ORDER BY name`,
      [entity.id]
    ),
    query<FlagRow>(
      `SELECT f.id AS id,
              f.category AS category,
              f.detail AS detail,
              f.evidence_url AS evidenceUrl,
              f.listed_date AS listedDate,
              s.key AS sourceKey,
              s.name AS sourceName,
              s.url AS sourceUrl
       FROM flags AS f
       JOIN sources AS s ON s.key = f.source_key
       WHERE f.entity_id = ?
       ORDER BY f.category, s.name, f.id`,
      [entity.id]
    ),
  ]);

  return {
    entity,
    aliases: aliasRows.map((row) => row.name),
    flags: flagRows,
  };
}

interface OwnershipRaw {
  entityId: number;
  slug: string;
  name: string;
  country: string | null;
  relType: RelType;
  flagCount: number;
  categories: string | null;
}

const REL_TYPE_PRIORITY: Record<RelType, number> = {
  direct_parent: 0,
  subsidiary_curated: 1,
  ultimate_parent: 2,
};

/** Collapses duplicate edges to the same entity, keeping the most direct one. */
function dedupeEdges(rows: OwnershipRaw[]): OwnershipEntry[] {
  const byEntity = new Map<number, OwnershipRaw>();
  for (const row of rows) {
    const existing = byEntity.get(row.entityId);
    if (!existing || REL_TYPE_PRIORITY[row.relType] < REL_TYPE_PRIORITY[existing.relType]) {
      byEntity.set(row.entityId, row);
    }
  }
  return [...byEntity.values()]
    .map((row) => ({
      entityId: row.entityId,
      slug: row.slug,
      name: row.name,
      country: row.country,
      relType: row.relType,
      flagCount: row.flagCount,
      categories: parseCategories(row.categories),
    }))
    .sort((a, b) => b.flagCount - a.flagCount || a.name.localeCompare(b.name));
}

export async function getOwnership(entityId: number): Promise<Ownership> {
  const [parentRows, childRows] = await Promise.all([
    query<OwnershipRaw>(
      `SELECT e.id AS entityId,
              e.slug AS slug,
              e.name AS name,
              e.country AS country,
              r.rel_type AS relType,
              COUNT(DISTINCT f.id) AS flagCount,
              GROUP_CONCAT(DISTINCT f.category) AS categories
       FROM relationships AS r
       JOIN entities AS e ON e.id = r.parent_id
       LEFT JOIN flags AS f ON f.entity_id = e.id
       WHERE r.child_id = ?
       GROUP BY e.id, r.rel_type`,
      [entityId]
    ),
    query<OwnershipRaw>(
      `SELECT e.id AS entityId,
              e.slug AS slug,
              e.name AS name,
              e.country AS country,
              r.rel_type AS relType,
              COUNT(DISTINCT f.id) AS flagCount,
              GROUP_CONCAT(DISTINCT f.category) AS categories
       FROM relationships AS r
       JOIN entities AS e ON e.id = r.child_id
       LEFT JOIN flags AS f ON f.entity_id = e.id
       WHERE r.parent_id = ?
       GROUP BY e.id, r.rel_type`,
      [entityId]
    ),
  ]);
  return {
    parents: dedupeEdges(parentRows),
    children: dedupeEdges(childRows),
  };
}

export async function getSources(): Promise<SourceRow[]> {
  return query<SourceRow>(
    `SELECT key, name, url, license, fetched_at AS fetchedAt, dataset_date AS datasetDate
     FROM sources
     ORDER BY name`
  );
}
