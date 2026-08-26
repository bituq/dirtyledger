import { Link } from "react-router";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>
          Dirty Ledger is a non-commercial project. A listing here means a company appears on a
          published list from SIPRI, PAX, the UN OHCHR, the AFSC, OpenSanctions or GLEIF. It is
          list membership, not a verdict of guilt.
        </p>
        <p>
          <Link to="/methodology">Methodology</Link> · <Link to="/sources">Sources and licenses</Link>
        </p>
      </div>
    </footer>
  );
}
