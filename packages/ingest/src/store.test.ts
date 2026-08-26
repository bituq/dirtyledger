import { describe, expect, it } from 'vitest';
import { EntityStore } from './store.js';
import type { FlagInput } from './types.js';

const flag = (category: FlagInput['category'], sourceKey: string, detail = 'x'): FlagInput => ({
  category,
  sourceKey,
  detail,
});

describe('EntityStore merge decisions', () => {
  it('merges by LEI even when names differ completely', () => {
    const store = new EntityStore();
    const a = store.upsert({ name: 'Lockheed Martin', lei: 'LEI1', flags: [flag('arms', 'sipri')] });
    const b = store.upsert({
      name: 'LM Aeronautics International',
      lei: 'LEI1',
      flags: [flag('nuclear', 'pax')],
    });
    expect(b).toBe(a);
    expect(store.entities).toHaveLength(1);
    expect(a.flags.map((f) => f.category).sort()).toEqual(['arms', 'nuclear']);
    expect(a.aliases).toContain('LM Aeronautics International');
  });

  it('merges when normalized names are exactly equal (suffix + punctuation)', () => {
    const store = new EntityStore();
    const a = store.upsert({ name: 'Nordwind Defense Group', flags: [flag('arms', 'sipri')] });
    const b = store.upsert({ name: 'Nordwind Defense', flags: [flag('nuclear', 'pax')] });
    expect(b).toBe(a);
    const c = store.upsert({ name: 'Lockheed-Martin' });
    const d = store.upsert({ name: 'Lockheed Martin Corp.' });
    expect(d).toBe(c);
  });

  it('does not merge different normalized names', () => {
    const store = new EntityStore();
    store.upsert({ name: 'Lockheed Martin' });
    store.upsert({ name: 'Lockheed Aviation' });
    expect(store.entities).toHaveLength(2);
  });

  it('does not name-merge two entities carrying different LEIs', () => {
    const store = new EntityStore();
    store.upsert({ name: 'Acme Industries', lei: 'LEI_A' });
    store.upsert({ name: 'Acme Industries', lei: 'LEI_B' });
    expect(store.entities).toHaveLength(2);
  });

  it('merges via alias match', () => {
    const store = new EntityStore();
    const a = store.upsert({ name: 'Lockheed Martin' });
    const b = store.upsert({ name: 'LM Corp', aliases: ['Lockheed Martin Corporation'] });
    expect(b).toBe(a);
    expect(a.aliases).toContain('LM Corp');
  });

  it('applies merge-overrides before matching', () => {
    const store = new EntityStore({ 'Desert Infra Holdings': 'Desert Infrastructure BV' });
    const a = store.upsert({ name: 'Desert Infrastructure BV', flags: [flag('occupation', 'un_ohchr')] });
    const b = store.upsert({ name: 'Desert Infra Holdings', flags: [flag('occupation', 'afsc')] });
    expect(b).toBe(a);
    expect(store.entities).toHaveLength(1);
    expect(a.aliases).toContain('Desert Infra Holdings');
    expect(a.flags).toHaveLength(2);
  });

  it('fills missing country and LEI on merge, keeps first canonical name', () => {
    const store = new EntityStore();
    const a = store.upsert({ name: 'Aerodyne Systems' });
    store.upsert({ name: 'Aerodyne Systems Ltd', country: 'gb', lei: 'LEI9' });
    expect(a.name).toBe('Aerodyne Systems');
    expect(a.country).toBe('GB');
    expect(a.lei).toBe('LEI9');
  });

  it('dedupes identical flags from the same source', () => {
    const store = new EntityStore();
    const a = store.upsert({ name: 'Acme', flags: [flag('arms', 'sipri', 'rank 1')] });
    store.upsert({ name: 'Acme', flags: [flag('arms', 'sipri', 'rank 1')] });
    expect(a.flags).toHaveLength(1);
  });
});
