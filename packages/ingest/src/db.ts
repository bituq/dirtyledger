import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { slugify } from './normalize.js';
import type { EntityStore } from './store.js';
import type { SourceMeta } from './types.js';

export function createDatabase(dbPath: string, schemaPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = OFF');
  db.pragma('synchronous = OFF');
  db.exec(readFileSync(schemaPath, 'utf8'));
  return db;
}

/** Write the whole store to SQLite: sources, entities, aliases, flags, relationships, FTS. */
export function writeStore(
  db: Database.Database,
  store: EntityStore,
  sources: SourceMeta[],
): void {
  const insertSource = db.prepare(
    'INSERT INTO sources (key, name, url, license, fetched_at, dataset_date) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertEntity = db.prepare(
    'INSERT INTO entities (id, slug, name, country, lei, entity_type) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertAlias = db.prepare(
    'INSERT OR IGNORE INTO aliases (entity_id, name) VALUES (?, ?)',
  );
  const insertFlag = db.prepare(
    'INSERT INTO flags (entity_id, category, source_key, detail, evidence_url, listed_date) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertRel = db.prepare(
    'INSERT OR IGNORE INTO relationships (parent_id, child_id, rel_type, source_key) VALUES (?, ?, ?, ?)',
  );
  const insertFts = db.prepare('INSERT INTO entity_fts (name, entity_id) VALUES (?, ?)');

  const writeAll = db.transaction(() => {
    for (const s of sources) {
      insertSource.run(s.key, s.name, s.url, s.license, s.fetchedAt, s.datasetDate ?? null);
    }

    // Assign ids and unique slugs in store order (deterministic per input data).
    const ids = new Map<number, number>(); // uid -> row id
    const usedSlugs = new Set<string>();
    let id = 0;
    for (const e of store.entities) {
      id++;
      ids.set(e.uid, id);
      const base = slugify(e.name) || 'entity';
      let slug = base;
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
      usedSlugs.add(slug);
      insertEntity.run(id, slug, e.name, e.country, e.lei, e.entityType);

      insertFts.run(e.name, id);
      for (const alias of e.aliases) {
        insertAlias.run(id, alias);
        insertFts.run(alias, id);
      }
      for (const f of e.flags) {
        insertFlag.run(id, f.category, f.sourceKey, f.detail, f.evidenceUrl ?? null, f.listedDate ?? null);
      }
    }

    for (const rel of store.relationships) {
      insertRel.run(ids.get(rel.parent.uid), ids.get(rel.child.uid), rel.relType, rel.sourceKey);
    }
  });
  writeAll();
}
