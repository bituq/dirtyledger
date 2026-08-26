/**
 * Name normalization for the merge layer. Two names are auto-merged only when
 * their normalized forms are exactly equal, so this must stay conservative.
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;

const LEGAL_SUFFIXES = new Set([
  'inc',
  'corp',
  'ltd',
  'plc',
  'nv',
  'bv',
  'sa',
  'ag',
  'co',
  'gmbh',
  'llc',
  'limited',
  'corporation',
  'incorporated',
  'holdings',
  'group',
]);

/**
 * Lowercase, strip diacritics and punctuation, collapse whitespace, and strip
 * trailing legal suffixes (repeatedly, so "X Holdings Inc" -> "x").
 * If stripping suffixes would leave nothing (a company literally named
 * "Group Inc"), the pre-strip normalized form is kept instead.
 */
export function normalizeName(name: string): string {
  const s = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '') // diacritics
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // punctuation and symbols -> space
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';

  const tokens = s.split(' ');
  let end = tokens.length;
  while (end > 1 && LEGAL_SUFFIXES.has(tokens[end - 1]!)) end--;
  // Guard: if everything was a legal suffix, keep the un-stripped form.
  if (end === 1 && LEGAL_SUFFIXES.has(tokens[0]!)) return s;
  return tokens.slice(0, end).join(' ');
}

/** URL-safe slug from a canonical name. Uniqueness is handled by the caller. */
export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'entity';
}

/** Uppercased ISO 3166-1 alpha-2 code, or null when the value isn't one. */
export function normalizeCountry(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  return /^[a-z]{2}$/i.test(v) ? v.toUpperCase() : null;
}
