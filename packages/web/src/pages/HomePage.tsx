import { Link } from "react-router";
import { SearchBox } from "../components/SearchBox";

const SOURCE_STRIP = [
  {
    name: "SIPRI Top 100",
    what: "The world's hundred largest arms producers, ranked by arms revenue.",
  },
  {
    name: "PAX: Don't Bank on the Bomb",
    what: "Producers of nuclear weapons and the financial institutions that invest in them.",
  },
  {
    name: "UN OHCHR settlements database",
    what: "Businesses involved in Israeli settlement activity in occupied territory.",
  },
  {
    name: "AFSC Investigate",
    what: "Companies tied to militarism, occupation and the prison industry.",
  },
  {
    name: "OpenSanctions",
    what: "Companies and organizations on government sanctions lists worldwide.",
  },
  {
    name: "GLEIF ownership data",
    what: "Who owns whom, so flags surface through corporate structures.",
  },
];

export function HomePage() {
  return (
    <div className="page page-home">
      <section className="hero">
        <h1 className="hero-title">Check a company</h1>
        <p className="hero-sub">
          Type a name to see whether it appears on published lists tied to the arms trade, nuclear
          weapons, occupation economies, sanctions or the prison industry.
        </p>
        <SearchBox variant="hero" autoFocus placeholder="Company name, e.g. Lockheed" />
      </section>

      <section className="home-explain">
        <h2>What this site checks</h2>
        <p>
          Dirty Ledger cross-references published datasets and shows you the raw entry for each
          match: which list a company appears on, what the list says, and where the evidence lives.
          A listing means exactly that, membership of a published list. It is a starting point for
          your own research, not a verdict of guilt.
        </p>
        <dl className="source-strip">
          {SOURCE_STRIP.map((source) => (
            <div className="source-strip-row" key={source.name}>
              <dt>{source.name}</dt>
              <dd>{source.what}</dd>
            </div>
          ))}
        </dl>
        <p className="home-links">
          Read the <Link to="/methodology">methodology</Link> for what a listing does and does not
          mean, or see the <Link to="/sources">sources</Link> for licenses and data freshness.
        </p>
      </section>
    </div>
  );
}
