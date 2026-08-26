import { mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED_FILES, loadCuratedFile, loadMergeOverrides } from './curated.js';
import { createDatabase, writeStore } from './db.js';
import { ingestGleif } from './gleif.js';
import { ingestOpenSanctions } from './opensanctions.js';
import { EntityStore } from './store.js';
import type { SourceMeta } from './types.js';

const MAX_DB_BYTES = 900 * 1024 * 1024; // 900 MB Pages budget

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(pkgRoot, '..', '..');

const skipRemote = process.env.DIRTYLEDGER_SKIP_REMOTE === '1';
const skipGleif = skipRemote || process.env.DIRTYLEDGER_SKIP_GLEIF === '1';
const osLimit = process.env.DIRTYLEDGER_OS_LIMIT
  ? Number.parseInt(process.env.DIRTYLEDGER_OS_LIMIT, 10)
  : null;
// Relative DIRTYLEDGER_CURATED_DIR is resolved against the repo root (pnpm
// --filter runs this script with the package dir as cwd, which would surprise).
const curatedDir = process.env.DIRTYLEDGER_CURATED_DIR
  ? path.resolve(repoRoot, process.env.DIRTYLEDGER_CURATED_DIR)
  : path.join(repoRoot, 'data', 'curated');
const downloadsDir = path.join(repoRoot, 'downloads');
const distDir = path.join(repoRoot, 'dist-data');
const dbPath = path.join(distDir, 'dirtyledger.db');

async function main(): Promise<void> {
  console.log('dirtyledger ingest');
  console.log(`  curated dir: ${curatedDir}`);
  if (skipRemote) console.log('  DIRTYLEDGER_SKIP_REMOTE=1: curated sources only');
  else if (skipGleif) console.log('  DIRTYLEDGER_SKIP_GLEIF=1: skipping GLEIF');
  if (osLimit !== null) console.log(`  DIRTYLEDGER_OS_LIMIT=${osLimit}`);

  const sources: SourceMeta[] = [];
  const store = new EntityStore(await loadMergeOverrides(curatedDir));

  console.log('\n[1/4] curated sources');
  for (const file of CURATED_FILES) {
    const meta = await loadCuratedFile(store, curatedDir, file);
    if (meta) sources.push(meta);
  }

  if (!skipRemote) {
    console.log('\n[2/4] OpenSanctions');
    sources.push(await ingestOpenSanctions(store, downloadsDir, osLimit));
  } else {
    console.log('\n[2/4] OpenSanctions skipped');
  }

  if (!skipGleif) {
    console.log('\n[3/4] GLEIF Level 2 relationships');
    sources.push(await ingestGleif(store, downloadsDir));
  } else {
    console.log('\n[3/4] GLEIF skipped');
  }

  console.log('\n[4/4] writing database');
  mkdirSync(distDir, { recursive: true });
  rmSync(dbPath, { force: true });
  rmSync(`${dbPath}-journal`, { force: true });
  const db = createDatabase(dbPath, path.join(pkgRoot, 'schema.sql'));
  writeStore(db, store, sources);

  // Summary
  const entityCount = (db.prepare('SELECT COUNT(*) AS n FROM entities').get() as { n: number }).n;
  const flagRows = db
    .prepare('SELECT category, COUNT(*) AS n FROM flags GROUP BY category ORDER BY n DESC')
    .all() as { category: string; n: number }[];
  const relCount = (db.prepare('SELECT COUNT(*) AS n FROM relationships').get() as { n: number }).n;
  db.close();

  const dbBytes = statSync(dbPath).size;
  console.log('\nsummary');
  console.log(`  entities:      ${entityCount}`);
  console.log(`  relationships: ${relCount}`);
  console.log('  flags per category:');
  for (const row of flagRows) console.log(`    ${row.category.padEnd(10)} ${row.n}`);
  console.log(`  db: ${dbPath} (${(dbBytes / 1e6).toFixed(1)} MB)`);

  if (dbBytes > MAX_DB_BYTES) {
    console.error(`ERROR: database exceeds 900MB budget (${(dbBytes / 1e6).toFixed(1)} MB)`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
