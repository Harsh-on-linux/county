import type { ReactNode } from "react";
import { ArrowUpRight, Plus, ShieldCheck, Users } from "lucide-react";
import { money, totals, type Entry } from "../domain";
import type { Household, Member } from "../cloud";
import { BurstMark } from "./BurstMark";
import { PrismSurface } from "./PrismSurface";

export function HouseholdView({
  group,
  members,
  name,
  entries,
  monthPicker,
  renderEntry,
  onManage,
  onAdd,
}: {
  group: Household | null;
  members: Member[];
  name: string;
  entries: Entry[];
  monthPicker: ReactNode;
  renderEntry: (entry: Entry, payer?: string) => ReactNode;
  onManage: () => void;
  onAdd: () => void;
}) {
  const total = totals(entries).expense;
  const people = members.length
    ? members
    : [{ user_id: "local", name: name || "You" }];
  const paid = Object.entries(
    entries.reduce<Record<string, number>>((r, e) => {
      const payer = (e as Entry & { payer: string }).payer || name || "You";
      r[payer] = (r[payer] || 0) + e.amount;
      return r;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <div className="household-view">
      <section className="household-hero">
        <BurstMark className="household-burst" />
        <PrismSurface tone="ember" />
        <span className="eyebrow">
          {group ? "YOUR SHARED SPACE" : "A SPACE FOR YOUR PEOPLE"}
        </span>
        <h2>{group?.name || "Good things, together."}</h2>
        <p>
          {group
            ? "One view of the everyday things you take care of together."
            : "Keep family expenses together. Keep your own balances yours."}
        </p>
        <div className="household-hero-bottom">
          <div className="member-stack">
            {people.map((m) => (
              <span className="avatar" title={m.name} key={m.user_id}>
                {m.name.slice(0, 1)}
              </span>
            ))}
            <span className="subtle">
              {group ? `${members.length} members` : "Not connected yet"}
            </span>
          </div>
          <button className="primary" onClick={onManage}>
            <Users size={18} />
            {group ? "Manage household" : "Connect your family"}
            <ArrowUpRight size={17} />
          </button>
        </div>
      </section>
      <div className="household-period">
        <span className="eyebrow">THE SHARED LEDGER</span>
        {monthPicker}
      </div>
      {!group && (
        <div className="household-local-note">
          <ShieldCheck size={19} />
          <p>
            These shared records are saved on this phone. Connect your family to
            see them together across phones.
          </p>
        </div>
      )}
      <div className="household-stats">
        <div className="card">
          <small>Household spending</small>
          <strong>{money(total)}</strong>
          <span>Only shared expenses</span>
        </div>
        <div className="card">
          <small>Shared expenses</small>
          <strong>{entries.length.toString().padStart(2, "0")}</strong>
          <span>Recorded together</span>
        </div>
      </div>
      <div className="household-ledgers">
        <section className="card shared-activity">
          <div className="section-top">
            <h2>Shared activity</h2>
            <span className="badge">Household only</span>
          </div>
          {[...entries]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => renderEntry(e, (e as Entry & { payer: string }).payer))}
          {!entries.length && (
            <div className="view-empty">
              <Users size={29} strokeWidth={1.3} />
              <h3>The everyday, together</h3>
              <p>
                Add an expense and turn on “Share with household” to include it
                here.
              </p>
              <button className="secondary" onClick={onAdd}>
                <Plus size={17} />
                Add an expense
              </button>
            </div>
          )}
        </section>
        <section className="card household-contributions">
          <div className="section-top">
            <h2>Who paid</h2>
          </div>
          {paid.length ? (
            paid.map(([payer, amount]) => (
              <div className="contribution-row" key={payer}>
                <div>
                  <span className="avatar">{payer[0]}</span>
                  <strong>{payer}</strong>
                  <span>{money(amount)}</span>
                </div>
                <div className="contribution-track">
                  <span
                    style={{ width: `${total ? (amount / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="caption">
              Each person’s contribution will appear after an expense is shared.
            </p>
          )}
          <p className="caption">
            A record of contributions, not amounts owed between family members.
          </p>
        </section>
      </div>
      <p className="household-privacy">
        <ShieldCheck size={17} />
        Personal balances and private transactions stay out of this space.
      </p>
    </div>
  );
}
