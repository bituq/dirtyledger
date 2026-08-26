export const CATEGORY_ORDER = [
  "arms",
  "nuclear",
  "occupation",
  "sanctions",
  "financier",
  "prisons",
  "other",
] as const;

export type FlagCategory = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<FlagCategory, string> = {
  arms: "Arms industry",
  nuclear: "Nuclear weapons",
  occupation: "Occupation ties",
  sanctions: "Sanctions",
  financier: "Weapons financing",
  prisons: "Prison industry",
  other: "Other listings",
};

export const CATEGORY_BLURBS: Record<FlagCategory, string> = {
  arms: "Ranked among the world's largest arms producers.",
  nuclear: "Named as a producer of nuclear weapons or key components.",
  occupation: "Listed for business activity tied to occupied territory.",
  sanctions: "Appears on government sanctions lists.",
  financier: "Named as an investor in or financier of weapons producers.",
  prisons: "Listed for involvement in the prison and detention industry.",
  other: "Listed by one of our sources outside the categories above.",
};

export function isFlagCategory(value: string): value is FlagCategory {
  return (CATEGORY_ORDER as readonly string[]).includes(value);
}

export function sortCategories(categories: FlagCategory[]): FlagCategory[] {
  return [...categories].sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
}

export function parseCategories(joined: string | null): FlagCategory[] {
  if (!joined) return [];
  const unique = [...new Set(joined.split(","))].filter(isFlagCategory);
  return sortCategories(unique);
}
