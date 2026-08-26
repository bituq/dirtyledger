import { useEffect, useState } from "react";
import { GhostFrame, GhostTableRows } from "../components/Ghost";
import { getSources, type SourceRow } from "../lib/db";
import { formatDate } from "../lib/format";

const SOURCE_ROLES: Record<string, string> = {
  sipri: "Arms industry rankings",
  pax: "Nuclear weapon producers and their financiers",
  un_ohchr: "Business activity in occupied territory",
  afsc: "Militarism, occupation and prison industry research",
  opensanctions: "Government sanctions lists",
  gleif: "Corporate ownership records",
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; sources: SourceRow[] };

export function SourcesPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    getSources().then(
      (sources) => {
        if (!cancelled) setState({ kind: "ready", sources });
      },
      (error) => {
        console.error("Failed to load sources", error);
        if (!cancelled) setState({ kind: "error" });
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page page-prose">
      <h1 className="page-title">Sources</h1>
      <p className="page-intro">
        Everything on this site comes from the published datasets below. The fetched date is read
        live from the same database that powers search, so it reflects exactly the data you are
        querying. Dirty Ledger is non-commercial; the OpenSanctions extract is used under its
        CC BY-NC license, and each source remains the property of its publisher.
      </p>

      {state.kind === "error" && (
        <p>The database could not be reached. Reload the page to try again.</p>
      )}

      {state.kind === "loading" && (
        <GhostFrame>
          <table className="sources-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Used for</th>
                <th>License</th>
                <th>Fetched</th>
              </tr>
            </thead>
            <tbody>
              <GhostTableRows rows={6} />
            </tbody>
          </table>
        </GhostFrame>
      )}

      {state.kind === "ready" && (
        <div className="table-scroll">
          <table className="sources-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Used for</th>
                <th>License</th>
                <th>Fetched</th>
              </tr>
            </thead>
            <tbody>
              {state.sources.map((source) => (
                <tr key={source.key}>
                  <td>
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.name}
                    </a>
                  </td>
                  <td>{SOURCE_ROLES[source.key] ?? "Supporting data"}</td>
                  <td>{source.license}</td>
                  <td>
                    {formatDate(source.fetchedAt)}
                    {source.datasetDate && (
                      <span className="table-sub">dataset {formatDate(source.datasetDate)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Attribution</h2>
      <p>
        Arms industry data: SIPRI Arms Industry Database, Stockholm International Peace Research
        Institute. Nuclear weapons and financing data: PAX, Don't Bank on the Bomb. Settlement
        activity data: United Nations Office of the High Commissioner for Human Rights. Corporate
        research: American Friends Service Committee, Investigate. Sanctions data: OpenSanctions,
        CC BY-NC 4.0. Ownership data: Global Legal Entity Identifier Foundation, CC0. Errors
        introduced by our matching and aggregation are ours, not the publishers'.
      </p>
    </div>
  );
}
