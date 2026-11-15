import { totals, type Entry } from "../domain";
import { BurstMark } from "./BurstMark";
export function MonthPulse({
  entries,
  month,
  onSelectDay,
}: {
  entries: Entry[];
  month: string;
  onSelectDay: (day: string) => void;
}) {
  const count = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const first = new Date(month + "-01T12:00:00").getDay();
  const offset = (first + 6) % 7;
  const days = Array.from({ length: count }, (_, i) => {
    const date = month + "-" + String(i + 1).padStart(2, "0");
    return {
      date,
      amount: totals(entries.filter((e) => e.date === date)).expense,
    };
  });
  const max = Math.max(...days.map((d) => d.amount), 1);
  return (
    <section className="month-pulse">
      <div className="pulse-heading">
        <div>
          <span className="eyebrow">THE RHYTHM OF YOUR MONTH</span>
          <h2>
            Little days. <span>One picture.</span>
          </h2>
        </div>
        <span className="pulse-key">
          <BurstMark /> Spending days
        </span>
      </div>
      <div className="pulse-weekdays">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="pulse-days">
        {Array.from({ length: offset }, (_, i) => (
          <span key={"empty" + i} />
        ))}
        {days.map((d, i) => (
          <button
            key={d.date}
            className={"pulse-day " + (d.amount ? "has-spend" : "")}
            aria-label={"View transactions for " + d.date}
            title={`${i + 1} · ₹${(d.amount / 100).toLocaleString("en-IN")}`}
            style={
              {
                "--day-intensity": 0.22 + (0.78 * d.amount) / max,
              } as React.CSSProperties
            }
            onClick={() => onSelectDay(d.date)}
          >
            <span>{String(i + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
      <div className="pulse-footer">
        <span>
          {days
            .filter((d) => d.amount > 0)
            .length.toString()
            .padStart(2, "0")}{" "}
          days with spending
        </span>
        <span>Tap a day to explore ↗</span>
      </div>
    </section>
  );
}
