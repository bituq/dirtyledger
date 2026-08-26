import { describe, expect, it } from 'vitest';
import { normalizeName } from './normalize.js';

describe('normalizeName', () => {
  it('lowercases and collapses whitespace', () => {
    expect(normalizeName('  Lockheed   Martin ')).toBe('lockheed martin');
  });

  it('strips punctuation', () => {
    expect(normalizeName('Lockheed-Martin')).toBe('lockheed martin');
    expect(normalizeName('Lockheed Martin Corp.')).toBe('lockheed martin');
  });

  it('strips diacritics', () => {
    expect(normalizeName('Škoda Aŭto')).toBe('skoda auto');
  });

  it('strips a single legal suffix', () => {
    expect(normalizeName('Nordwind Defense Group')).toBe('nordwind defense');
    expect(normalizeName('Aerodyne Systems Ltd')).toBe('aerodyne systems');
    expect(normalizeName('Desert Infrastructure BV')).toBe('desert infrastructure');
  });

  it('strips stacked legal suffixes', () => {
    expect(normalizeName('Acme Holdings Inc.')).toBe('acme');
    expect(normalizeName('Foo Group Limited')).toBe('foo');
  });

  it('keeps a name that consists only of legal suffixes', () => {
    expect(normalizeName('Group Inc')).toBe('group inc');
    expect(normalizeName('Holdings')).toBe('holdings');
  });

  it('does not strip suffix words in the middle of a name', () => {
    expect(normalizeName('Group Therapy Records')).toBe('group therapy records');
  });

  it('returns empty string for punctuation-only input', () => {
    expect(normalizeName('---')).toBe('');
  });
});
