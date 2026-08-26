# cleanhands

Check a company for involvement in the arms trade, war crimes, sanctions, and other ties that don't hold up. Every result is literal list membership on a published source (SIPRI, PAX Don't Bank on the Bomb, UN OHCHR settlements database, AFSC Investigate, OpenSanctions, GLEIF ownership data) with the evidence linked. No invented scores.

Fully static: the site and its SQLite database deploy to GitHub Pages, and the browser queries the database over HTTP range requests. A weekly GitHub Actions run rebuilds the data and redeploys.

## Develop

```sh
pnpm install
node packages/web/scripts/fixture-db.mjs   # small fake DB for dev
pnpm dev
```

Build the real database (curated sources only, skips the big downloads):

```sh
CLEANHANDS_SKIP_REMOTE=1 pnpm ingest
```

Full build (OpenSanctions + GLEIF, takes a while, needs disk):

```sh
pnpm ingest
pnpm build
```

See `DESIGN.md` for architecture and `data/curated/README.md` for the curated dataset format.

## License

Code MIT. Data: this site is non-commercial; OpenSanctions data is CC BY-NC 4.0, other sources under their own terms — see the Sources page for attribution.
