import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  GhostFlagBlock,
  GhostFrame,
  GhostOwnershipRows,
} from "../components/Ghost";
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type FlagCategory,
} from "../lib/categories";
import {
  getCompany,
  getOwnership,
  type CompanyRecord,
  type FlagRow,
  type Ownership,
  type OwnershipEntry,
} from "../lib/db";
import {
  countryName,
  ENTITY_TYPE_LABELS,
  formatDate,
  openSanctionsUrl,
  violationTrackerUrl,
} from "../lib/format";

type LoadState =
  | { kind: "loading" }
  | { kind: "not-found" }
  | { kind: "error" }
  | { kind: "ready"; company: CompanyRecord; ownership: Ownership };

export function CompanyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const company = await getCompany(slug);
        if (cancelled) return;
        if (!company) {
          setState({ kind: "not-found" });
          return;
        }
        const ownership = await getOwnership(company.entity.id);
        if (cancelled) return;
        setState({ kind: "ready", company, ownership });
      } catch (error) {
        console.error("Failed to load company", error);
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === "loading") return <CompanyGhost />;

  if (state.kind === "not-found") {
    return (
      <div className="page page-narrow">
        <h1 className="page-title">Not in the ledger</h1>
        <p>
          There is no company at this address in our data. It may have been renamed or merged with
          another entry. Try searching from the <Link to="/">home page</Link>.
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="page page-narrow">
        <h1 className="page-title">Database unavailable</h1>
        <p>The database could not be reached. Reload the page to try again.</p>
      </div>
    );
  }

  const { company, ownership } = state;
  const { entity, aliases, flags } = company;
  const sourceCount = new Set(flags.map((f) => f.sourceKey)).size;
  const flaggedParents = ownership.parents.filter((p) => p.flagCount > 0);
  const flaggedChildren = ownership.children.filter((c) => c.flagCount > 0);
  const meta = [
    countryName(entity.country),
    ENTITY_TYPE_LABELS[entity.entityType] ?? entity.entityType,
    entity.lei ? `LEI ${entity.lei}` : null,
  ].filter(Boolean);

  return (
    <div className="page page-company">
      <header className="company-header">
        <h1 className="company-name">{entity.name}</h1>
        <p className="company-meta">{meta.join(" · ")}</p>
        {aliases.length > 0 && (
          <p className="company-aliases">Also known as {aliases.join(", ")}</p>
        )}
        {flags.length > 0 ? (
          <p className="company-summary is-flagged">
            {flags.length} {flags.length === 1 ? "listing" : "listings"} across {sourceCount}{" "}
            {sourceCount === 1 ? "source" : "sources"}
          </p>
        ) : (
          <p className="company-summary">
            {flaggedParents.length > 0 || flaggedChildren.length > 0 ? (
              <>
                No direct listings in our data.{" "}
                {flaggedParents.length > 0 && flaggedChildren.length > 0
                  ? "This company is owned by and owner of flagged companies, shown below."
                  : flaggedParents.length > 0
                    ? "This company is owned by a flagged company, shown below."
                    : "This company owns flagged companies, shown below."}
              </>
            ) : (
              "No listings in our data for this company."
            )}
          </p>
        )}
      </header>

      <section className="company-section">
        <h2>Listings</h2>
        {flags.length > 0 ? (
          <FlagGroups flags={flags} />
        ) : (
          <GhostFrame label="No listings from our sources for this company">
            <GhostFlagBlock />
          </GhostFrame>
        )}
      </section>

      <section className="company-section">
        <h2>Ownership</h2>
        <p className="section-note">
          Ownership records from GLEIF and curated sources. Flagged companies are highlighted;
          companies without listings of their own are dimmed.
        </p>
        {ownership.parents.length === 0 && ownership.children.length === 0 ? (
          <GhostFrame label="No ownership records in our data for this company">
            <GhostOwnershipRows rows={2} />
          </GhostFrame>
        ) : (
          <div className="ownership-groups">
            {ownership.parents.length > 0 && (
              <OwnershipGroup title="Owned by" entries={ownership.parents} />
            )}
            {ownership.children.length > 0 && (
              <OwnershipGroup title="Owns" entries={ownership.children} />
            )}
          </div>
        )}
      </section>

      <section className="company-section">
        <h2>Check elsewhere</h2>
        <div className="elsewhere">
          <a
            className="elsewhere-row"
            href={violationTrackerUrl(entity.name)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="elsewhere-name">Violation Tracker</span>
            <span className="elsewhere-desc">
              Regulatory fines and settlements collected by Good Jobs First, mostly US enforcement
              actions.
            </span>
          </a>
          <a
            className="elsewhere-row"
            href={openSanctionsUrl(entity.name)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="elsewhere-name">OpenSanctions</span>
            <span className="elsewhere-desc">
              Full sanctions and watchlist records, beyond the extract used on this site.
            </span>
          </a>
        </div>
      </section>

      <p className="company-caveat">
        A listing is membership of a published list, not a verdict of guilt. Read the{" "}
        <Link to="/methodology">methodology</Link> for what each source covers.
      </p>
    </div>
  );
}

function FlagGroups({ flags }: { flags: FlagRow[] }) {
  const grouped = new Map<FlagCategory, FlagRow[]>();
  for (const flag of flags) {
    const list = grouped.get(flag.category) ?? [];
    list.push(flag);
    grouped.set(flag.category, list);
  }
  return (
    <div className="flag-groups">
      {CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => (
        <section className="flag-group" key={category}>
          <header className="flag-group-header">
            <h3 className="flag-group-title">{CATEGORY_LABELS[category]}</h3>
            <p className="flag-group-blurb">{CATEGORY_BLURBS[category]}</p>
          </header>
          {grouped.get(category)!.map((flag) => (
            <article className="flag-item" key={flag.id}>
              <p className="flag-source">{flag.sourceName}</p>
              <p className="flag-detail">{flag.detail}</p>
              <p className="flag-footer">
                {flag.listedDate && <span>Listed {formatDate(flag.listedDate)}</span>}
                {flag.evidenceUrl && (
                  <a href={flag.evidenceUrl} target="_blank" rel="noopener noreferrer">
                    View evidence
                  </a>
                )}
              </p>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

const REL_TYPE_LABELS: Record<OwnershipEntry["relType"], string> = {
  direct_parent: "direct",
  ultimate_parent: "ultimate",
  subsidiary_curated: "curated",
};

function OwnershipGroup({ title, entries }: { title: string; entries: OwnershipEntry[] }) {
  return (
    <div className="ownership-group">
      <h3 className="ownership-title">{title}</h3>
      <ul className="ownership-list">
        {entries.map((entry) => (
          <li key={entry.entityId}>
            <Link
              to={`/company/${entry.slug}`}
              className={`ownership-row${entry.flagCount > 0 ? " is-flagged" : " is-muted"}`}
            >
              <span className="ownership-main">
                <span className="ownership-name">{entry.name}</span>
                <span className="ownership-meta">
                  {[countryName(entry.country), REL_TYPE_LABELS[entry.relType]]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {entry.flagCount > 0 ? (
                <span className="ownership-flags">
                  {entry.categories.map((c) => CATEGORY_LABELS[c]).join(", ")}
                </span>
              ) : (
                <span className="ownership-flags">No listings</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompanyGhost() {
  return (
    <div className="page page-company">
      <header className="company-header ghost-row">
        <span className="ghost-bar ghost-bar-title" />
        <span className="ghost-bar ghost-bar-sub" style={{ width: "16rem" }} />
      </header>
      <section className="company-section">
        <h2>Listings</h2>
        <GhostFrame>
          <GhostFlagBlock />
        </GhostFrame>
      </section>
      <section className="company-section">
        <h2>Ownership</h2>
        <GhostFrame>
          <GhostOwnershipRows rows={2} />
        </GhostFrame>
      </section>
    </div>
  );
}
