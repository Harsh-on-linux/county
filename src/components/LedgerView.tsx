import { useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Inbox,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { money, today, totals, type Data, type Entry } from "../domain";
import { ChoiceField } from "./ChoiceField";
import { ContourLines } from "./ContourLines";

export type LedgerFilters = {
  category: string;
  account: string;
  kind: string;
  deleted: boolean;
};
export function LedgerView({
  data,
  entries,
  monthPicker,
  query,
  onQuery,
  filters,
  onFilters,
  day,
  onClearDay,
  pending,
  onInbox,
  onExport,
  renderEntry,
}: {
  data: Data;
  entries: Entry[];
  monthPicker: ReactNode;
  query: string;
  onQuery: (v: string) => void;
  filters: LedgerFilters;
  onFilters: (v: Partial<LedgerFilters>) => void;
  day: string;
  onClearDay: () => void;
  pending: number;
  onInbox: () => void;
  onExport: () => void;
  renderEntry: (e: Entry) => ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const active = [
    filters.category !== "All",
    filters.account !== "All",
    filters.kind !== "All",
  ].filter(Boolean).length;
  const sum = totals(entries);
  const days = new Map<string, Entry[]>();
  entries.forEach((e) => days.set(e.date, [...(days.get(e.date) || []), e]));
  return (
    <div className="ledger-view">
      <section className="ledger-statement" aria-label="Statement overview">
        <ContourLines className="statement-contours" />
        <div className="statement-heading">
          <span className="eyebrow">
            {active || query || day ? "IN THIS VIEW" : "YOUR STATEMENT"}
          </span>
          <span className="statement-count">
            {entries.length} {entries.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="statement-period">{monthPicker}</div>
        {!filters.deleted ? (
          <div className="statement-totals">
            <div>
              <span>
                <ArrowDownLeft size={17} /> Money in
              </span>
              <strong>{money(sum.income)}</strong>
            </div>
            <div>
              <span>
                <ArrowUpRight size={17} /> Money out
              </span>
              <strong>{money(sum.expense)}</strong>
            </div>
          </div>
        ) : (
          <p className="statement-note">
            Deleted records are kept here until you choose to restore them.
          </p>
        )}
      </section>
      <div className="ledger-search-row">
        <label className="search">
          <Search size={19} />
          <input
            aria-label="Search transactions"
            placeholder="Search a name, note or category"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQuery("")}
            >
              <X size={17} />
            </button>
          )}
        </label>
        <button
          className={
            "secondary ledger-filter-button " + (active ? "has-filters" : "")
          }
          aria-expanded={filterOpen}
          aria-controls="ledger-filters"
          onClick={() => setFilterOpen(!filterOpen)}
        >
          <SlidersHorizontal size={17} />
          Filters{active > 0 && <span className="count">{active}</span>}
        </button>
      </div>
      <div className="ledger-shortcuts">
        <button className="text-button" onClick={onInbox}>
          <Inbox size={17} />
          Unlabelled{pending > 0 && <span className="count">{pending}</span>}
        </button>
        <button
          className={"text-button " + (filters.deleted ? "selected" : "")}
          aria-pressed={filters.deleted}
          onClick={() => onFilters({ deleted: !filters.deleted })}
        >
          <Trash2 size={16} />
          Recently deleted
        </button>
      </div>
      {filterOpen && (
        <section
          className="ledger-filter-panel"
          id="ledger-filters"
          aria-label="Filter transactions"
        >
          <div className="section-top">
            <h2>Narrow it down</h2>
            <button
              className="text-button"
              disabled={!active}
              onClick={() =>
                onFilters({ category: "All", account: "All", kind: "All" })
              }
            >
              Reset filters
            </button>
          </div>
          <div className="filter-fields">
            <ChoiceField
              label="Category filter"
              value={filters.category}
              onChange={(category) => onFilters({ category })}
              options={[
                { value: "All", label: "All categories" },
                ...data.categories.map((c) => ({ value: c, label: c })),
              ]}
            />
            <ChoiceField
              label="Account filter"
              value={filters.account}
              onChange={(account) => onFilters({ account })}
              options={[
                { value: "All", label: "All accounts" },
                ...data.accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
            <ChoiceField
              label="Transaction type filter"
              value={filters.kind}
              onChange={(kind) => onFilters({ kind })}
              options={[
                { value: "All", label: "All types" },
                ...["expense", "income", "transfer", "adjustment"].map((t) => ({
                  value: t,
                  label: t[0].toUpperCase() + t.slice(1),
                })),
              ]}
            />
          </div>
        </section>
      )}
      {day && (
        <button className="day-filter-pill" onClick={onClearDay}>
          {new Date(day + "T12:00:00").toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
          })}
          <X size={14} />
          Clear day
        </button>
      )}
      <section className="card activity-card" aria-label="Transaction records">
        <div className="section-top">
          <h2>
            {filters.deleted ? "Deleted records" : "Transactions"}{" "}
            <span className="count">{entries.length}</span>
          </h2>
          <button className="text-button" onClick={onExport}>
            <Download size={16} />
            Export
          </button>
        </div>
        {[...days].map(([date, rows]) => (
          <section className="ledger-day" key={date}>
            <div className="ledger-day-heading">
              <h3>
                {date === today()
                  ? "Today"
                  : new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
              </h3>
              <span>
                {rows.length} {rows.length === 1 ? "record" : "records"}
              </span>
            </div>
            {rows.map((entry) => renderEntry(entry))}
          </section>
        ))}
        {!entries.length && (
          <div className="view-empty">
            <Search size={28} strokeWidth={1.3} />
            <h3>No records in view</h3>
            <p>
              {query || active || day
                ? "Try another search, month or filter."
                : filters.deleted
                  ? "Deleted transactions will appear here. You can restore them at any time."
                  : "Your first transaction will appear here. Tap Record to add one."}
            </p>
            {(query || active || day) && (
              <button
                className="secondary"
                onClick={() => {
                  onQuery("");
                  onFilters({ category: "All", account: "All", kind: "All" });
                  onClearDay();
                }}
              >
                Clear search & filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
