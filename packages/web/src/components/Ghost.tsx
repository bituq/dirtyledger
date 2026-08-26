import type { ReactNode } from "react";

/**
 * Ghost placeholder rows: a faded structural preview of the real layout,
 * used both while loading and as the empty state. When a label is given the
 * rows read as an empty state; without one they read as a loading state.
 */
export function GhostFrame({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="ghost-frame" aria-hidden={label ? undefined : true}>
      <div className="ghost-rows">{children}</div>
      {label && <span className="ghost-label">{label}</span>}
    </div>
  );
}

export function GhostResultRows({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div className="result-row ghost-row" key={i}>
          <div className="ghost-main">
            <span className="ghost-bar" style={{ width: `${52 - i * 7}%` }} />
            <span className="ghost-bar ghost-bar-sub" style={{ width: "24%" }} />
          </div>
          <span className="ghost-bar ghost-bar-count" />
        </div>
      ))}
    </>
  );
}

export function GhostFlagBlock() {
  return (
    <section className="flag-group ghost-row">
      <header className="flag-group-header">
        <span className="ghost-bar" style={{ width: "10rem" }} />
      </header>
      <div className="flag-item">
        <span className="ghost-bar" style={{ width: "14rem" }} />
        <span className="ghost-bar ghost-bar-sub" style={{ width: "80%" }} />
        <span className="ghost-bar ghost-bar-sub" style={{ width: "38%" }} />
      </div>
      <div className="flag-item">
        <span className="ghost-bar" style={{ width: "11rem" }} />
        <span className="ghost-bar ghost-bar-sub" style={{ width: "64%" }} />
      </div>
    </section>
  );
}

export function GhostOwnershipRows({ rows = 2 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div className="ownership-row ghost-row" key={i}>
          <div className="ghost-main">
            <span className="ghost-bar" style={{ width: `${16 - i * 3}rem` }} />
            <span className="ghost-bar ghost-bar-sub" style={{ width: "9rem" }} />
          </div>
          <span className="ghost-bar ghost-bar-count" />
        </div>
      ))}
    </>
  );
}

export function GhostTableRows({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr className="ghost-row" key={i}>
          <td>
            <span className="ghost-bar" style={{ width: `${88 - i * 6}%` }} />
          </td>
          <td>
            <span className="ghost-bar" style={{ width: "70%" }} />
          </td>
          <td>
            <span className="ghost-bar" style={{ width: "60%" }} />
          </td>
          <td>
            <span className="ghost-bar" style={{ width: "60%" }} />
          </td>
        </tr>
      ))}
    </>
  );
}
