import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="page page-narrow">
      <h1 className="page-title">Page not found</h1>
      <p>
        Nothing lives at this address. Head back to the <Link to="/">home page</Link> to check a
        company.
      </p>
    </div>
  );
}
