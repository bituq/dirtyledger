import { normalizeCountry, normalizeName } from './normalize.js';
import type { FlagInput } from './types.js';

export interface EntityRec {
  /** Stable per-run identity, assigned at creation. */
  uid: number;
  name: string;
  country: string | null;
  lei: string | null;
  entityType: 'company' | 'organization' | 'state_body';
  aliases: Set<string>;
  flags: FlagInput[];
}

export interface UpsertInput {
  name: string;
  aliases?: string[];
  country?: string | null;
  lei?: string | null;
  entityType?: EntityRec['entityType'];
  flags?: FlagInput[];
}

export interface RelationshipRec {
  parent: EntityRec;
  child: EntityRec;
  relType: 'direct_parent' | 'ultimate_parent' | 'subsidiary_curated';
  sourceKey: string;
}

/**
 * In-memory canonical entity store. Merge order per DESIGN.md:
 *   1. LEI match
 *   2. exact match on normalized name or alias (conservative: exact equality only)
 *   3. manual merge-overrides (alternate spelling -> canonical name), applied
 *      before matching so the override target's normalized name is what matches.
 * Records only ever merge INTO an existing record at upsert time, so EntityRec
 * object identity is stable and safe to hold on to.
 */
export class EntityStore {
  readonly entities: EntityRec[] = [];
  readonly relationships: RelationshipRec[] = [];

  private byLei = new Map<string, EntityRec>();
  private byNorm = new Map<string, EntityRec>();
  private overrides: Map<string, string>;
  private relKeys = new Set<string>();
  private nextUid = 1;

  constructor(overrides: Record<string, string> = {}) {
    this.overrides = new Map(Object.entries(overrides));
  }

  /** Apply merge-overrides.json: alternate spelling -> canonical name. */
  private canonicalRawName(name: string): string {
    return this.overrides.get(name) ?? name;
  }

  get(name: string, lei?: string | null): EntityRec | undefined {
    if (lei) {
      const rec = this.byLei.get(lei);
      if (rec) return rec;
    }
    const norm = normalizeName(this.canonicalRawName(name));
    return norm ? this.byNorm.get(norm) : undefined;
  }

  upsert(input: UpsertInput): EntityRec {
    const lei = input.lei?.trim() || null;
    const canonName = this.canonicalRawName(input.name);
    const candidateNames = [
      canonName,
      input.name,
      ...(input.aliases ?? []).map((a) => this.canonicalRawName(a)),
      ...(input.aliases ?? []),
    ];

    // 1. LEI match wins outright.
    let match = lei ? this.byLei.get(lei) : undefined;

    // 2. Normalized name/alias match, unless both sides carry different LEIs.
    if (!match) {
      for (const raw of candidateNames) {
        const norm = normalizeName(raw);
        if (!norm) continue;
        const found = this.byNorm.get(norm);
        if (found && !(found.lei && lei && found.lei !== lei)) {
          match = found;
          break;
        }
      }
    }

    if (!match) {
      match = {
        uid: this.nextUid++,
        name: canonName,
        country: normalizeCountry(input.country),
        lei,
        entityType: input.entityType ?? 'company',
        aliases: new Set(),
        flags: [],
      };
      this.entities.push(match);
    } else {
      if (!match.country) match.country = normalizeCountry(input.country);
      if (!match.lei && lei) match.lei = lei;
    }

    for (const raw of [input.name, canonName, ...(input.aliases ?? [])]) {
      if (raw && raw !== match.name) match.aliases.add(raw);
    }
    for (const flag of input.flags ?? []) {
      const dup = match.flags.some(
        (f) =>
          f.category === flag.category &&
          f.sourceKey === flag.sourceKey &&
          f.detail === flag.detail,
      );
      if (!dup) match.flags.push(flag);
    }

    // Index the (possibly newly filled) LEI and every name form.
    if (match.lei) this.byLei.set(match.lei, match);
    for (const raw of [match.name, ...candidateNames]) {
      const norm = normalizeName(raw);
      if (norm && !this.byNorm.has(norm)) this.byNorm.set(norm, match);
    }
    return match;
  }

  addRelationship(rel: RelationshipRec): void {
    if (rel.parent === rel.child) return;
    const key = `${rel.parent.uid}|${rel.child.uid}|${rel.relType}`;
    if (this.relKeys.has(key)) return;
    this.relKeys.add(key);
    this.relationships.push(rel);
  }

  /** LEIs of every entity currently in the store. */
  leiSet(): Set<string> {
    const set = new Set<string>();
    for (const e of this.entities) if (e.lei) set.add(e.lei);
    return set;
  }

  byLeiMap(): Map<string, EntityRec> {
    return this.byLei;
  }
}
