import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CATEGORY_LABELS } from "../lib/categories";
import { searchCompanies, type SearchHit } from "../lib/db";
import { countryName } from "../lib/format";
import { GhostFrame, GhostResultRows } from "./Ghost";

type SearchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "results"; hits: SearchHit[]; forQuery: string }
  | { kind: "error" };

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 180;

export function SearchBox({
  variant,
  placeholder = "Company name",
  autoFocus = false,
}: {
  variant: "hero" | "compact";
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setState({ kind: "idle" });
      setActiveIndex(-1);
      return;
    }
    let cancelled = false;
    setState((prev) => (prev.kind === "results" ? prev : { kind: "loading" }));
    const timer = setTimeout(() => {
      searchCompanies(trimmed).then(
        (hits) => {
          if (cancelled) return;
          setState({ kind: "results", hits, forQuery: trimmed });
          setActiveIndex(hits.length > 0 ? 0 : -1);
        },
        (error) => {
          if (cancelled) return;
          console.error("Search failed", error);
          setState({ kind: "error" });
        }
      );
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  // Close the compact dropdown on outside clicks.
  useEffect(() => {
    if (variant !== "compact" || !open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [variant, open]);

  const hits = state.kind === "results" ? state.hits : [];
  const showPanel = variant === "hero" ? state.kind !== "idle" : open && state.kind !== "idle";

  function reset() {
    setOpen(false);
    setQ("");
    setState({ kind: "idle" });
  }

  function go(hit: SearchHit) {
    reset();
    navigate(`/company/${hit.slug}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (hits.length === 0 ? -1 : Math.min(i + 1, hits.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (hits.length === 0 ? -1 : Math.max(i - 1, 0)));
    } else if (event.key === "Enter") {
      const hit = hits[activeIndex] ?? hits[0];
      if (hit) {
        event.preventDefault();
        go(hit);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      if (variant === "hero") setQ("");
    }
  }

  return (
    <div className={`search search-${variant}`} ref={rootRef}>
      <input
        type="search"
        className="search-input"
        value={q}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-label="Search for a company"
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showPanel && (
        <div className="search-panel" id={listId}>
          {state.kind === "loading" && (
            <GhostFrame>
              <GhostResultRows rows={3} />
            </GhostFrame>
          )}
          {state.kind === "error" && (
            <p className="search-note">
              The database could not be reached. Reload the page to try again.
            </p>
          )}
          {state.kind === "results" && hits.length === 0 && (
            <GhostFrame label={`No matches for "${state.forQuery}" in our data`}>
              <GhostResultRows rows={3} />
            </GhostFrame>
          )}
          {state.kind === "results" && hits.length > 0 && (
            <ul className="result-list">
              {hits.map((hit, index) => (
                <li key={hit.entityId}>
                  <Link
                    to={`/company/${hit.slug}`}
                    className={`result-row${index === activeIndex ? " is-active" : ""}`}
                    onClick={reset}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="result-main">
                      <span className="result-name">{hit.name}</span>
                      <span className="result-meta">
                        {[
                          countryName(hit.country),
                          hit.categories.map((c) => CATEGORY_LABELS[c]).join(", ") || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {hit.flagCount > 0 ? (
                      <span className="result-count is-flagged">
                        {hit.flagCount} {hit.flagCount === 1 ? "listing" : "listings"}
                      </span>
                    ) : (
                      <span className="result-count">No listings</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
