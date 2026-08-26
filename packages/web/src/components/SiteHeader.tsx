import { Link, NavLink, useLocation } from "react-router";
import { SearchBox } from "./SearchBox";

export function SiteHeader() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-wordmark">
          Dirty Ledger
        </Link>
        {!isHome && (
          <div className="site-header-search">
            <SearchBox variant="compact" placeholder="Check another company" />
          </div>
        )}
        <nav className="site-nav">
          <NavLink to="/methodology">Methodology</NavLink>
          <NavLink to="/sources">Sources</NavLink>
        </nav>
      </div>
    </header>
  );
}
