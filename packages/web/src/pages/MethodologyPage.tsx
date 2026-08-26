import { Link } from "react-router";

export function MethodologyPage() {
  return (
    <div className="page page-narrow page-prose">
      <h1 className="page-title">Methodology</h1>

      <h2>What a listing means</h2>
      <p>
        Every flag on this site is literal list membership: the company appears on a published
        dataset from one of the sources below. We show the source, the entry text, the date it
        was listed where known, and a link to the evidence. We do not score companies, weigh
        sources against each other, or add findings of our own.
      </p>
      <p>
        A listing is not a verdict of guilt. Inclusion criteria differ per source: SIPRI ranks
        companies by arms revenue, which is legal business; sanctions lists are government
        decisions that can be politically motivated; the UN settlements database records business
        activity the Human Rights Council considers linked to occupation. Read the source's own
        criteria before drawing conclusions. The absence of a listing is not a clean bill of health
        either, since each source covers a specific slice of the world.
      </p>

      <h2>The sources</h2>
      <dl className="method-sources">
        <div>
          <dt>SIPRI Arms Industry Database</dt>
          <dd>
            The Stockholm International Peace Research Institute publishes the Top 100 arms
            producers each year, ranked by revenue from military sales. We flag every company on
            the current list under the arms category, with its rank and arms revenue.
          </dd>
        </div>
        <div>
          <dt>PAX: Don't Bank on the Bomb</dt>
          <dd>
            The Dutch peace organization PAX identifies companies involved in producing nuclear
            weapons or key components, and the financial institutions that invest in them.
            Producers are flagged under nuclear weapons; investors under weapons financing.
          </dd>
        </div>
        <div>
          <dt>UN OHCHR settlements database</dt>
          <dd>
            The UN Office of the High Commissioner for Human Rights maintains a database of
            business enterprises involved in specified activities related to Israeli settlements
            in the occupied Palestinian territory (report A/HRC/60/19 and its updates). Companies
            on it are flagged under occupation ties.
          </dd>
        </div>
        <div>
          <dt>AFSC Investigate</dt>
          <dd>
            The American Friends Service Committee researches corporate involvement in militarism,
            occupation and mass incarceration. Its entries carry the AFSC's own categorization,
            which we map to arms, occupation ties, or the prison industry.
          </dd>
        </div>
        <div>
          <dt>BDS movement target list</dt>
          <dd>
            The Boycott, Divestment and Sanctions movement publishes the companies it currently
            targets, from consumer boycott priorities to divestment and institutional pressure
            lists. Unlike the sources above this is an activist campaign list, not a research
            database: inclusion reflects the movement's own strategic choices and stated reasons,
            which we quote in each flag. It is shown under occupation ties, clearly attributed, so
            you can weigh it yourself.
          </dd>
        </div>
        <div>
          <dt>OpenSanctions</dt>
          <dd>
            OpenSanctions aggregates official sanctions lists and watchlists worldwide. We include
            companies and organizations from its default dataset that carry sanction topics, and
            flag them under sanctions with the designating programs in the detail text.
          </dd>
        </div>
        <div>
          <dt>GLEIF relationship data</dt>
          <dd>
            The Global Legal Entity Identifier Foundation publishes who-owns-whom records reported
            by companies themselves. We use these edges, plus a small curated set, to connect
            subsidiaries and parents. Ownership adds no flag of its own: a clean subsidiary of a
            flagged parent stays clean, and the connection is simply shown.
          </dd>
        </div>
      </dl>

      <h2>How companies are matched</h2>
      <p>
        Sources spell company names differently. We merge entries across sources by Legal Entity
        Identifier where both sides have one, and otherwise by normalized name and known aliases,
        with manual overrides for the cases automation gets wrong. When you find a bad merge or a
        missed one, that is a data bug and worth reporting.
      </p>

      <h2>Update cadence</h2>
      <p>
        The database is rebuilt automatically every week. Sanctions and ownership data are
        downloaded fresh on every build. The curated sources move at their publishers' pace: SIPRI
        updates yearly, PAX and the UN database update when new reports appear, and the AFSC
        dataset is refreshed periodically. The <Link to="/sources">sources page</Link> shows the
        exact date each dataset was last fetched.
      </p>

      <h2>What this site is not</h2>
      <p>
        Dirty Ledger is a lookup tool for published lists, nothing more. It does not track court
        rulings, regulatory fines or news coverage. For those, every company page links out to
        Violation Tracker and OpenSanctions so you can continue the search where the primary data
        lives.
      </p>
    </div>
  );
}
