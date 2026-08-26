// Builds a small fixture SQLite database for local development.
// Usage: node scripts/fixture-db.mjs  (or: pnpm --filter @dirtyledger/web fixture-db)
//
// The real database is produced by packages/ingest in CI. This script fills the
// same schema (packages/ingest/schema.sql) with a handful of representative
// companies so `pnpm dev` works without running the full ingest.

import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, "../../ingest/schema.sql");
const outDir = path.resolve(here, "../public/data");
const outPath = path.join(outDir, "dirtyledger.db");

mkdirSync(outDir, { recursive: true });
rmSync(outPath, { force: true });

const db = new Database(outPath);
// Page size must match the requestChunkSize used by the web client (4096).
db.pragma("page_size = 4096");
db.pragma("journal_mode = DELETE");
db.exec(readFileSync(schemaPath, "utf8"));

const sources = [
  {
    key: "sipri",
    name: "SIPRI Arms Industry Database (Top 100)",
    url: "https://www.sipri.org/databases/armsindustry",
    license: "Free for non-commercial use, attribution required",
    fetched_at: "2026-08-18",
    dataset_date: "2024-12-02",
  },
  {
    key: "pax",
    name: "PAX: Don't Bank on the Bomb",
    url: "https://www.dontbankonthebomb.com/",
    license: "Free to share with attribution",
    fetched_at: "2026-08-18",
    dataset_date: "2024-04-01",
  },
  {
    key: "un_ohchr",
    name: "UN OHCHR settlements database (A/HRC/60/19)",
    url: "https://www.ohchr.org/en/hr-bodies/hrc/regular-sessions/session43/database-hrc3136",
    license: "Public UN document",
    fetched_at: "2026-08-18",
    dataset_date: "2025-06-30",
  },
  {
    key: "afsc",
    name: "AFSC Investigate",
    url: "https://investigate.afsc.org/",
    license: "Free for non-profit use, attribution required",
    fetched_at: "2026-08-18",
    dataset_date: "2026-05-14",
  },
  {
    key: "opensanctions",
    name: "OpenSanctions",
    url: "https://www.opensanctions.org/",
    license: "CC BY-NC 4.0",
    fetched_at: "2026-08-24",
    dataset_date: "2026-08-24",
  },
  {
    key: "gleif",
    name: "GLEIF Level 2 relationship data",
    url: "https://www.gleif.org/en/lei-data/access-and-use-lei-data",
    license: "CC0 1.0",
    fetched_at: "2026-08-24",
    dataset_date: "2026-08-23",
  },
];

const entities = [
  { id: 1, slug: "lockheed-martin", name: "Lockheed Martin Corporation", country: "US" },
  { id: 2, slug: "sikorsky-aircraft", name: "Sikorsky Aircraft Corporation", country: "US" },
  { id: 3, slug: "rtx", name: "RTX Corporation", country: "US" },
  { id: 4, slug: "pratt-whitney", name: "Pratt & Whitney", country: "US" },
  { id: 5, slug: "bae-systems", name: "BAE Systems plc", country: "GB" },
  { id: 6, slug: "elbit-systems", name: "Elbit Systems Ltd.", country: "IL" },
  { id: 7, slug: "rostec", name: "State Corporation Rostec", country: "RU", entity_type: "state_body" },
  { id: 8, slug: "rosoboronexport", name: "Rosoboronexport JSC", country: "RU" },
  { id: 9, slug: "blackrock", name: "BlackRock, Inc.", country: "US" },
  { id: 10, slug: "corecivic", name: "CoreCivic, Inc.", country: "US" },
  { id: 11, slug: "booking-holdings", name: "Booking Holdings Inc.", country: "US" },
  { id: 12, slug: "booking-com", name: "Booking.com B.V.", country: "NL" },
];

const aliases = [
  [1, "Lockheed"],
  [3, "Raytheon Technologies Corporation"],
  [3, "Raytheon"],
  [5, "British Aerospace"],
  [7, "Rostec"],
  [8, "Rosoboroneksport"],
  [10, "Corrections Corporation of America"],
  [10, "CCA"],
  [12, "Booking.com"],
];

const flags = [
  {
    entity_id: 1,
    category: "arms",
    source_key: "sipri",
    detail: "SIPRI Top 100 rank 1 (2023), arms revenue $60.8bn",
    evidence_url: "https://www.sipri.org/databases/armsindustry",
    listed_date: "2024-12-02",
  },
  {
    entity_id: 1,
    category: "nuclear",
    source_key: "pax",
    detail:
      "Named nuclear weapon producer: Trident II (D5) submarine-launched ballistic missile and long-range standoff weapon work",
    evidence_url: "https://www.dontbankonthebomb.com/",
    listed_date: "2024-04-01",
  },
  {
    entity_id: 3,
    category: "arms",
    source_key: "sipri",
    detail: "SIPRI Top 100 rank 2 (2023), arms revenue $40.7bn",
    evidence_url: "https://www.sipri.org/databases/armsindustry",
    listed_date: "2024-12-02",
  },
  {
    entity_id: 3,
    category: "nuclear",
    source_key: "pax",
    detail: "Named nuclear weapon producer: guidance and propulsion work for US intercontinental ballistic missiles",
    evidence_url: "https://www.dontbankonthebomb.com/",
    listed_date: "2024-04-01",
  },
  {
    entity_id: 5,
    category: "arms",
    source_key: "sipri",
    detail: "SIPRI Top 100 rank 6 (2023), arms revenue $29.8bn",
    evidence_url: "https://www.sipri.org/databases/armsindustry",
    listed_date: "2024-12-02",
  },
  {
    entity_id: 5,
    category: "nuclear",
    source_key: "pax",
    detail: "Named nuclear weapon producer: Dreadnought-class nuclear submarine programme for the UK deterrent",
    evidence_url: "https://www.dontbankonthebomb.com/",
    listed_date: "2024-04-01",
  },
  {
    entity_id: 6,
    category: "arms",
    source_key: "sipri",
    detail: "SIPRI Top 100 rank 28 (2023), arms revenue $4.9bn",
    evidence_url: "https://www.sipri.org/databases/armsindustry",
    listed_date: "2024-12-02",
  },
  {
    entity_id: 6,
    category: "occupation",
    source_key: "afsc",
    detail: "Supplies surveillance systems and drones used in the occupied Palestinian territory",
    evidence_url: "https://investigate.afsc.org/company/elbit-systems",
    listed_date: "2026-05-14",
  },
  {
    entity_id: 7,
    category: "sanctions",
    source_key: "opensanctions",
    detail: "Designated by the US, EU and UK in relation to Russia's defence sector (OFAC SDN, EU Regulation 833/2014)",
    evidence_url: "https://www.opensanctions.org/search/?q=Rostec",
    listed_date: "2022-06-28",
  },
  {
    entity_id: 8,
    category: "sanctions",
    source_key: "opensanctions",
    detail: "OFAC SDN list: blocked under Executive Order 14024 as a Russian state arms export agency",
    evidence_url: "https://www.opensanctions.org/search/?q=Rosoboronexport",
    listed_date: "2022-04-07",
  },
  {
    entity_id: 9,
    category: "financier",
    source_key: "pax",
    detail: "Don't Bank on the Bomb: reported investments of $38bn in nuclear weapon producers (2024 report)",
    evidence_url: "https://www.dontbankonthebomb.com/",
    listed_date: "2024-04-01",
  },
  {
    entity_id: 10,
    category: "prisons",
    source_key: "afsc",
    detail: "Operates private prisons and immigration detention centers in the United States",
    evidence_url: "https://investigate.afsc.org/company/corecivic",
    listed_date: "2026-05-14",
  },
  {
    entity_id: 12,
    category: "occupation",
    source_key: "un_ohchr",
    detail:
      "Listed in the UN database of business enterprises involved in settlement activity (provision of services supporting settlements)",
    evidence_url:
      "https://www.ohchr.org/en/hr-bodies/hrc/regular-sessions/session43/database-hrc3136",
    listed_date: "2025-06-30",
  },
];

const relationships = [
  // Lockheed Martin owns Sikorsky (unflagged subsidiary of a flagged parent).
  { parent_id: 1, child_id: 2, rel_type: "direct_parent", source_key: "gleif" },
  // RTX owns Pratt & Whitney.
  { parent_id: 3, child_id: 4, rel_type: "direct_parent", source_key: "gleif" },
  // Rostec owns Rosoboronexport; both edges present to exercise dedupe.
  { parent_id: 7, child_id: 8, rel_type: "direct_parent", source_key: "gleif" },
  { parent_id: 7, child_id: 8, rel_type: "ultimate_parent", source_key: "gleif" },
  // Booking Holdings (unflagged parent) owns Booking.com B.V. (flagged).
  { parent_id: 11, child_id: 12, rel_type: "ultimate_parent", source_key: "gleif" },
];

const insertSource = db.prepare(
  "INSERT INTO sources (key, name, url, license, fetched_at, dataset_date) VALUES (@key, @name, @url, @license, @fetched_at, @dataset_date)"
);
const insertEntity = db.prepare(
  "INSERT INTO entities (id, slug, name, country, lei, entity_type) VALUES (@id, @slug, @name, @country, @lei, @entity_type)"
);
const insertAlias = db.prepare("INSERT INTO aliases (entity_id, name) VALUES (?, ?)");
const insertFlag = db.prepare(
  "INSERT INTO flags (entity_id, category, source_key, detail, evidence_url, listed_date) VALUES (@entity_id, @category, @source_key, @detail, @evidence_url, @listed_date)"
);
const insertRel = db.prepare(
  "INSERT INTO relationships (parent_id, child_id, rel_type, source_key) VALUES (@parent_id, @child_id, @rel_type, @source_key)"
);

db.transaction(() => {
  for (const s of sources) insertSource.run(s);
  for (const e of entities) {
    insertEntity.run({ lei: null, entity_type: "company", ...e });
  }
  for (const [entityId, name] of aliases) insertAlias.run(entityId, name);
  for (const f of flags) insertFlag.run(f);
  for (const r of relationships) insertRel.run(r);
  db.exec("INSERT INTO entity_fts (name, entity_id) SELECT name, id FROM entities");
  db.exec("INSERT INTO entity_fts (name, entity_id) SELECT name, entity_id FROM aliases");
})();

db.exec("VACUUM");
db.close();

mkdirSync(path.join(outDir, "db"), { recursive: true });
copyFileSync(outPath, path.join(outDir, "db", "0"));
writeFileSync(
  path.join(outDir, "db-meta.json"),
  JSON.stringify({ size: statSync(outPath).size, buildId: String(Date.now()) })
);

console.log(`Fixture database written to ${outPath}`);
console.log(
  `${entities.length} entities, ${flags.length} flags, ${relationships.length} relationship edges, ${sources.length} sources`
);
