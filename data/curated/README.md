# Curated datasets

Hand/agent-maintained JSON, committed to the repo. All files share one shape so the ingest
merge layer can treat them uniformly:

```jsonc
{
  "source": {
    "key": "sipri",
    "name": "SIPRI Top 100 Arms-producing Companies",
    "url": "https://www.sipri.org/databases/armsindustry",
    "license": "SIPRI terms, facts non-commercial",
    "fetched_at": "2026-08-26",
    "dataset_date": "2024"
  },
  "companies": [
    {
      "name": "Lockheed Martin",           // canonical name as the source spells it
      "aliases": ["Lockheed Martin Corp."], // optional
      "country": "US",                      // ISO alpha-2, optional
      "lei": null,                          // optional, fill when known
      "flags": [
        {
          "category": "arms",              // arms|nuclear|occupation|sanctions|financier|prisons|other
          "detail": "SIPRI Top 100 rank 1 (2024), arms revenue $64.7bn",
          "evidence_url": "https://...",   // optional deep link
          "listed_date": "2025-12"         // optional
        }
      ],
      "subsidiaries": ["Sikorsky"]          // optional, creates curated relationship edges
    }
  ]
}
```

Files: `sipri.json`, `pax.json`, `un_ohchr.json`, `afsc.json`.
`merge-overrides.json` maps alternate spellings to canonical names:
`{ "merge": { "Lockheed Martin Corporation": "Lockheed Martin" } }`.
