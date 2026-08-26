# dirtyledger — design

Check a company for involvement in the arms trade, war crimes, sanctions, and other ties that don't hold up. Static site on GitHub Pages, data rebuilt weekly by GitHub Actions. Non-commercial (OpenSanctions data is CC BY-NC); attribution page required.

## Architecture

Two pnpm workspace packages:

- `packages/ingest` — TypeScript scripts (run with tsx, better-sqlite3) that download/parse each source and build one SQLite file `dist-data/dirtyledger.db`. No server anywhere.
- `packages/web` — Vite + React SPA. Queries the DB **client-side** over HTTP range requests (sql.js-httpvfs pattern). Deployed to GitHub Pages together with the DB file.

CI: `.github/workflows/deploy.yml` runs on push to main + weekly cron + manual dispatch → `pnpm ingest` → `pnpm build` → deploy to Pages.

## Sources (v1)

| key | source | what it flags | how fetched |
|---|---|---|---|
| `sipri` | SIPRI Top 100 arms producers | category `arms` | curated JSON in `data/curated/sipri.json` (updated yearly by hand/agent) |
| `pax` | PAX Don't Bank on the Bomb | `nuclear` (producers) + `financier` (investors/financiers of producers) | curated JSON `data/curated/pax.json` |
| `un_ohchr` | UN OHCHR settlements database (A/HRC/60/19, 158 companies) | `occupation` | curated JSON `data/curated/un_ohchr.json` |
| `afsc` | AFSC Investigate dataset | `arms` / `occupation` / `prisons` per their categorisation | curated JSON `data/curated/afsc.json` (their download is free for non-profit use) |
| `opensanctions` | OpenSanctions default dataset, filtered to organizations/companies with topics | `sanctions` | downloaded in CI (bulk FtM JSON, no key needed) |
| `gleif` | GLEIF Level 2 relationship data (who owns whom) | ownership edges only | downloaded in CI, filtered to LEIs of flagged entities |

Violation Tracker: link-out on company pages, no ingest (paywalled bulk). OpenSecrets/AIPAC: v1.1.

## Data model (SQLite, see packages/ingest/schema.sql)

`entities` (canonical company), `aliases`, `flags` (entity × category × source with detail + url), `relationships` (parent/child from GLEIF + curated), `sources` (freshness + license). FTS5 table `entity_fts` over names + aliases for search. Merge across sources: LEI match first, else normalized-name/alias match, with manual overrides in `data/curated/merge-overrides.json`.

Flag categories: `arms`, `nuclear`, `occupation`, `sanctions`, `financier`, `prisons`, `other`.

## Web

Routes: `/` (search + explanation), `/company/:slug` (flags grouped per category, each with source + evidence link + listed date; ownership tree showing flagged parents/subsidiaries; link-outs to Violation Tracker search), `/methodology`, `/sources` (attribution, freshness, licenses). English UI. BrowserRouter with Vite `base`; `404.html` = copy of `index.html` for Pages SPA fallback.

Verdicts are literal list membership — no invented scores.

## Constraints

- pnpm, not bun (explicit project choice). Node 22 in CI.
- Published Pages artifact < 1GB → OpenSanctions filtered to org-type entities carrying topics; GLEIF filtered to relationship edges touching flagged entities.
- DB must be built deterministically in CI; curated JSONs are committed, large downloads are not.
