import { useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, CalendarDays } from "lucide-react";
import { money, monthEntries, today, totals, type Entry } from "../domain";
import { ContourLines } from "./ContourLines";

export function InsightsView({
  entries,
  month,
  categoryChart,
  calendar,
}: {
  entries: Entry[];
  month: string;
  categoryChart: (e: Entry[]) => ReactNode;
  calendar: ReactNode;
}) {
  const m = monthEntries(entries, month).filter((e) => !e.deleted),
    expenses = m.filter((e) => e.type === "expense");
  const sum = totals(m),
    days = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5)),
      0,
    ).getDate();
  const elapsed =
    month === today().slice(0, 7) ? Number(today().slice(-2)) : days;
  const largest = [...expenses].sort((a, b) => b.amount - a.amount)[0];
  const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, i) =>
    expenses.filter(
      (e) => Math.floor((Number(e.date.slice(-2)) - 1) / 7) === i,
    ),
  );
  const values = weeks.map((w) => totals(w).expense),
    max = Math.max(...values, 1);
  const [selected, setSelected] = useState<number | null>(null);
  const index =
    selected === null
      ? Math.max(0, values.indexOf(Math.max(...values)))
      : Math.min(selected, weeks.length - 1);
  return (
    <div className="insights-view">
      <section className="insight-overview" aria-label="Spending overview">
        <ContourLines className="insight-contours" />
        <span className="eyebrow">SPENDING, IN PERSPECTIVE</span>
        <span className="insight-main-label">Total spent</span>
        <strong className="insight-main-amount">{money(sum.expense)}</strong>
        <p>
          {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}{" "}
          this month
        </p>
        <div className="insight-facts">
          <div>
            <span>Daily average</span>
            <strong>{money(sum.expense / elapsed)}</strong>
            <small>
              Across {elapsed}{" "}
              {month === today().slice(0, 7) ? "days so far" : "calendar days"}
            </small>
          </div>
          <div>
            <span>Largest expense</span>
            <strong>{money(largest?.amount || 0)}</strong>
            <small>
              {largest?.payee || largest?.category || "No expenses yet"}
            </small>
          </div>
        </div>
      </section>
      <div className="insights-grid">
        <section className="card weekly-card">
          <div className="section-top">
            <h2>The month in moments</h2>
            <span className="badge">Weekly spend</span>
          </div>
          <div className="week-reading" aria-live="polite">
            <span>
              Days {index * 7 + 1}–{Math.min((index + 1) * 7, days)}
            </span>
            <strong>{money(values[index])}</strong>
            <small>
              {weeks[index].length}{" "}
              {weeks[index].length === 1 ? "expense" : "expenses"}
            </small>
          </div>
          <div className="week-chart" aria-label="Weekly spending">
            {weeks.map((w, i) => (
              <button
                className="week-column"
                key={i}
                aria-pressed={i === index}
                aria-label={`Days ${i * 7 + 1}–${Math.min((i + 1) * 7, days)}: ${money(values[i])}`}
                onClick={() => setSelected(i)}
              >
                <span className="week-bar-space">
                  <span
                    className="week-bar"
                    style={{
                      height: `${Math.max((values[i] / max) * 100, 2)}%`,
                    }}
                  />
                </span>
                <span>
                  {i * 7 + 1}–{Math.min((i + 1) * 7, days)}
                </span>
              </button>
            ))}
          </div>
          <p className="caption">Tap a week to see its total.</p>
        </section>
        <section className="card insight-categories">
          <div className="section-top">
            <h2>Spending by category</h2>
          </div>
          {categoryChart(m)}
        </section>
      </div>
      {largest && (
        <section className="expense-spotlight">
          <span className="spotlight-icon">
            <ArrowUpRight size={22} />
          </span>
          <div>
            <span className="eyebrow">THE LARGEST MOMENT</span>
            <h2>{largest.payee || largest.category}</h2>
            <p>
              {largest.category} ·{" "}
              {new Date(largest.date + "T12:00:00").toLocaleDateString(
                "en-IN",
                { day: "numeric", month: "short" },
              )}
            </p>
          </div>
          <strong>{money(largest.amount)}</strong>
        </section>
      )}
      <details className="insight-calendar">
        <summary>
          <CalendarDays size={20} />
          <span>Explore the days</span>
          <ChevronDown size={18} />
        </summary>
        {calendar}
      </details>
    </div>
  );
}
