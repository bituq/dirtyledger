-- dirtyledger SQLite schema. Built from scratch on every ingest run.

CREATE TABLE sources (
  key TEXT PRIMARY KEY,            -- 'sipri' | 'pax' | 'un_ohchr' | 'afsc' | 'opensanctions' | 'gleif'
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  license TEXT NOT NULL,
  fetched_at TEXT NOT NULL,        -- ISO date the data was fetched/curated
  dataset_date TEXT                -- date the underlying dataset refers to, if known
);

CREATE TABLE entities (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,       -- url-safe, from canonical name
  name TEXT NOT NULL,              -- canonical display name
  country TEXT,                    -- ISO 3166-1 alpha-2 where known
  lei TEXT,                        -- LEI if known (nullable, indexed)
  entity_type TEXT NOT NULL DEFAULT 'company'  -- 'company' | 'organization' | 'state_body'
);
CREATE INDEX idx_entities_lei ON entities(lei) WHERE lei IS NOT NULL;

CREATE TABLE aliases (
  entity_id INTEGER NOT NULL REFERENCES entities(id),
  name TEXT NOT NULL,
  PRIMARY KEY (entity_id, name)
);

CREATE TABLE flags (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER NOT NULL REFERENCES entities(id),
  category TEXT NOT NULL,          -- 'arms' | 'nuclear' | 'occupation' | 'sanctions' | 'financier' | 'prisons' | 'other'
  source_key TEXT NOT NULL REFERENCES sources(key),
  detail TEXT NOT NULL,            -- human-readable, e.g. "SIPRI Top 100 rank 3 (2024), arms revenue $30.1bn"
  evidence_url TEXT,               -- deep link to the source record where possible
  listed_date TEXT                 -- when the source listed it, if known
);
CREATE INDEX idx_flags_entity ON flags(entity_id);

CREATE TABLE relationships (
  parent_id INTEGER NOT NULL REFERENCES entities(id),
  child_id INTEGER NOT NULL REFERENCES entities(id),
  rel_type TEXT NOT NULL,          -- 'direct_parent' | 'ultimate_parent' | 'subsidiary_curated'
  source_key TEXT NOT NULL REFERENCES sources(key),
  PRIMARY KEY (parent_id, child_id, rel_type)
);
CREATE INDEX idx_rel_child ON relationships(child_id);

-- Search: names + aliases, prefix-friendly.
CREATE VIRTUAL TABLE entity_fts USING fts5(
  name,
  entity_id UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);
