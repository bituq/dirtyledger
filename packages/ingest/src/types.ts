export type FlagCategory =
  | 'arms'
  | 'nuclear'
  | 'occupation'
  | 'sanctions'
  | 'financier'
  | 'prisons'
  | 'other';

export interface FlagInput {
  category: FlagCategory;
  sourceKey: string;
  detail: string;
  evidenceUrl?: string | null;
  listedDate?: string | null;
}

export interface SourceMeta {
  key: string;
  name: string;
  url: string;
  license: string;
  fetchedAt: string;
  datasetDate?: string | null;
}

/** Shape of the curated JSON files, see data/curated/README.md. */
export interface CuratedFile {
  source: {
    key: string;
    name: string;
    url: string;
    license: string;
    fetched_at: string;
    dataset_date?: string | null;
  };
  companies: CuratedCompany[];
}

export interface CuratedCompany {
  name: string;
  aliases?: string[];
  country?: string | null;
  lei?: string | null;
  flags: {
    category: FlagCategory;
    detail: string;
    evidence_url?: string | null;
    listed_date?: string | null;
  }[];
  subsidiaries?: string[];
}

export interface MergeOverrides {
  merge?: Record<string, string>;
}
