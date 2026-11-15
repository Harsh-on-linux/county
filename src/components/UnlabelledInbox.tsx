import { useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { duplicate, money, today, type Data, type Suggestion } from "../domain";
import { suggestionStatus } from "../capture";
import { ChoiceField } from "./ChoiceField";
import { scanBounds, type ScanRange } from "../scanRange";

export function UnlabelledInbox({
  data,
  android,
  scanning,
  scanError,
  onScan,
  onToggle,
  onPaste,
  onReview,
  onDiscard,
  onRestore,
  onMatch,
  onAccount,
}: {
  data: Data;
  android: boolean;
  scanning: boolean;
  scanError: string;
  onScan: (range: ScanRange) => Promise<boolean>;
  onToggle: () => void;
  onPaste: (body: string, date: string) => Promise<void>;
  onReview: (suggestion: Suggestion) => void;
  onDiscard: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onMatch: (id: string) => Promise<void>;
  onAccount: () => void;
}) {
  const [view, setView] = useState("unlabelled"),
    [query, setQuery] = useState(""),
    [paste, setPaste] = useState(false),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false),
    [undo, setUndo] = useState<string | null>(null);
  const [period, setPeriod] = useState(data.smsScanRange ? "custom" : "30");
  const [from, setFrom] = useState(
    data.smsScanRange?.from ||
      new Date(Date.now() - 29 * 86400000).toLocaleDateString("en-CA"),
  );
  const [to, setTo] = useState(data.smsScanRange?.to || today());
  function selectPeriod(value: string) {
    setPeriod(value);
    setError("");
    if (value !== "custom") {
      const start = new Date();
      start.setDate(start.getDate() - Number(value) + 1);
      setFrom(start.toLocaleDateString("en-CA"));
      setTo(today());
    }
  }
  const pending = data.suggestions.filter(
    (s) => suggestionStatus(s, data.entries) === "unlabelled",
  );
  const discarded = data.suggestions.filter(
    (s) => suggestionStatus(s, data.entries) === "discarded",
  );
  const [captureOpen, setCaptureOpen] = useState(pending.length === 0);
  const results = useRef<HTMLDivElement>(null);
  const rows = (view === "unlabelled" ? pending : discarded)
    .filter((s) =>
      [
        s.payee,
        s.sender,
        s.accountHint,
        s.reference,
        s.date,
        s.amount / 100,
        money(s.amount, true),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  async function act(fn: () => Promise<void>) {
    setWorking(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="review-inbox">
      <div className="review-overview">
        <div>
          <span className="eyebrow">WAITING FOR YOUR SAY</span>
          <strong>
            {pending.length.toString().padStart(2, "0")}
            <span>to review</span>
          </strong>
        </div>
        <span className="review-device-note">
          <ShieldCheck size={17} />
          On this device
        </span>
      </div>
      <section className="capture-panel" aria-label="Message capture">
        <div className="capture-panel-heading">
          <span className="capture-symbol">
            <Inbox size={20} strokeWidth={1.5} />
          </span>
          <div>
            <h2>Capture payments</h2>
            <p>Your balance changes only after you label and save.</p>
          </div>
          <button
            className="capture-options-button"
            type="button"
            aria-expanded={captureOpen}
            aria-controls="capture-options"
            onClick={() => setCaptureOpen(!captureOpen)}
          >
            <SlidersHorizontal size={18} />
            <span>{captureOpen ? "Hide options" : "Scan options"}</span>
          </button>
        </div>
        <div id="capture-options" hidden={!captureOpen}>
          <div className="scan-period">
            <ChoiceField
              label="Scan period"
              value={period}
              onChange={selectPeriod}
              options={[
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
                { value: "custom", label: "Custom dates" },
              ]}
            />
            {period === "custom" && (
              <div className="scan-dates">
                <label>
                  From date
                  <input
                    type="date"
                    value={from}
                    max={to || today()}
                    onChange={(e) => setFrom(e.target.value)}
                    disabled={scanning}
                  />
                </label>
                <label>
                  To date
                  <input
                    type="date"
                    value={to}
                    min={from}
                    max={today()}
                    onChange={(e) => setTo(e.target.value)}
                    disabled={scanning}
                  />
                </label>
              </div>
            )}
            <p>
              Choose which messages to check. Automatic checks look for new
              messages.
            </p>
          </div>
          <div className="capture-controls">
            {android ? (
              <button
                className="secondary"
                disabled={scanning}
                onClick={async () => {
                  try {
                    scanBounds({ from, to });
                    setError("");
                    if (await onScan({ from, to })) {
                      setCaptureOpen(false);
                      requestAnimationFrame(() => {
                        results.current
                          ?.querySelector<HTMLButtonElement>("button")
                          ?.focus({ preventScroll: true });
                        results.current?.scrollIntoView({
                          behavior: matchMedia(
                            "(prefers-reduced-motion: reduce)",
                          ).matches
                            ? "auto"
                            : "smooth",
                          block: "start",
                        });
                      });
                    }
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <RefreshCw
                  size={15}
                  className={scanning ? "capture-scanning" : ""}
                />
                {scanning
                  ? "Checking messages…"
                  : data.smsCapture
                    ? "Check messages"
                    : "Enable message capture"}
              </button>
            ) : (
              <span className="caption">
                Automatic message capture is available on Android.
              </span>
            )}
          </div>
          {android && data.smsCapture && (
            <label className="capture-auto">
              <input
                type="checkbox"
                checked={!!data.smsCapture}
                onChange={onToggle}
              />
              <span>Check automatically while County is open</span>
            </label>
          )}
          {data.lastSmsScan && (
            <p className="capture-last">
              Last checked{" "}
              {new Date(data.lastSmsScan).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        {scanError && (
          <p className="error" role="alert">
            {scanError}
          </p>
        )}
        <div className="capture-quick-actions">
          <button
            className="text-button"
            onClick={() => setPaste(!paste)}
            aria-expanded={paste}
          >
            {paste ? <X size={16} /> : <PlusMark />}
            {paste ? "Close" : "Paste a bank message"}
          </button>
          <span className="capture-local-caption">
            Kept private, until you choose
          </span>
        </div>
        {paste && (
          <form
            className="paste-message"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              void act(async () => {
                await onPaste(String(f.get("body")), String(f.get("date")));
                form.reset();
                setPaste(false);
                setView("unlabelled");
                setQuery("");
              });
            }}
          >
            <label>
              Bank message
              <textarea
                name="body"
                required
                maxLength={5000}
                placeholder="Paste the payment message from your bank"
              />
            </label>
            <label>
              Message date
              <input
                type="date"
                name="date"
                required
                defaultValue={today()}
                max={today()}
              />
            </label>
            <p className="caption">
              Only the payment details are saved. The message text is not
              stored.
            </p>
            <button className="primary" disabled={working}>
              {working ? "Checking…" : "Add to unlabelled"}
              <ArrowRight size={15} />
            </button>
          </form>
        )}
      </section>
      {!data.accounts.length && (
        <div className="review-account-prompt">
          <p>Add an account before saving a captured payment.</p>
          <button className="text-button" onClick={onAccount}>
            Add account <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="review-toolbar" ref={results}>
        <div className="review-tabs" aria-label="Captured transaction status">
          {[
            ["unlabelled", "Unlabelled", pending.length],
            ["discarded", "Discarded", discarded.length],
          ].map(([value, label, count]) => (
            <button
              key={value}
              aria-pressed={view === value}
              onClick={() => {
                setView(String(value));
                setQuery("");
              }}
            >
              {label}
              <span>{count}</span>
            </button>
          ))}
        </div>
        <label className="review-search">
          <Search size={16} />
          <input
            aria-label="Search captured transactions"
            placeholder="Search payments"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {undo && discarded.some((s) => s.id === undo) && (
        <div className="review-undo" role="status">
          <span>Moved to discarded.</span>
          <button
            className="text-button"
            disabled={working}
            onClick={() =>
              void act(async () => {
                await onRestore(undo);
                setUndo(null);
              })
            }
          >
            Undo <Undo2 size={14} />
          </button>
        </div>
      )}
      <section
        className="review-list"
        aria-label={
          view === "unlabelled"
            ? "Unlabelled transactions"
            : "Discarded transactions"
        }
      >
        {rows.map((s) => {
          const match = duplicate(s, data.entries);
          return (
            <article className="review-row" key={s.id}>
              <div className="review-row-main">
                <span className={"review-direction " + s.type}>
                  {s.type === "expense" ? (
                    <ArrowUpRight size={19} />
                  ) : (
                    <ArrowDownLeft size={19} />
                  )}
                </span>
                <div className="review-payee">
                  <h3>{s.payee}</h3>
                  <p>
                    {new Date(s.date + "T12:00:00").toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                    {s.sender ? ` · ${s.sender}` : " · Bank message"}
                    {s.accountHint ? ` · ••${s.accountHint}` : ""}
                  </p>
                </div>
                <strong className="review-amount">
                  {s.type === "income" ? "+" : "−"}
                  {money(s.amount, true)}
                </strong>
              </div>
              {view === "unlabelled" && match && (
                <div className="review-match">
                  <p>
                    A similar {money(match.amount)} payment to{" "}
                    {match.payee || match.category} is already recorded.
                  </p>
                  <button
                    className="text-button"
                    disabled={working}
                    onClick={() => void act(() => onMatch(s.id))}
                  >
                    Match existing <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <div className="review-row-actions">
                <span className="review-type">
                  {s.type === "expense" ? "Money out" : "Money in"}
                </span>
                {view === "discarded" ? (
                  <button
                    className="text-button"
                    disabled={working}
                    onClick={() => void act(() => onRestore(s.id))}
                  >
                    <Undo2 size={14} />
                    Restore to unlabelled
                  </button>
                ) : (
                  <>
                    <button
                      className="review-discard"
                      disabled={working}
                      onClick={() =>
                        void act(async () => {
                          await onDiscard(s.id);
                          setUndo(s.id);
                        })
                      }
                    >
                      <Trash2 size={14} />
                      Discard
                    </button>
                    <button
                      className="review-label"
                      disabled={working}
                      onClick={() => onReview(s)}
                    >
                      Label <ArrowRight size={15} />
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {!rows.length && (
          <div className="review-empty">
            <Inbox size={29} strokeWidth={1.25} />
            <h2>
              {query
                ? "No matching payments"
                : view === "discarded"
                  ? "Nothing discarded"
                  : "All clear."}
            </h2>
            <p>
              {query
                ? "Try another name or amount."
                : view === "discarded"
                  ? "Discarded messages stay here, so you can restore them."
                  : "Newly captured payments will wait here for you to label."}
            </p>
          </div>
        )}
      </section>
      <p className="review-privacy">
        <ShieldCheck size={14} />
        Messages are checked on this device. Nothing is added or shared
        automatically.
      </p>
    </div>
  );
}

function PlusMark() {
  return <span aria-hidden="true">+</span>;
}
