import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Download,
  LockKeyhole,
  LogOut,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
import { csv, money, readBackup, today, type Data } from "../domain";
import { download, isAndroid, Native } from "../storage";
import { PrismSurface } from "./PrismSurface";

type Update = (fn: (live: Data) => Data) => Promise<void>;
export function SettingsView({
  data,
  busy,
  online,
  signedIn,
  onChange,
  attempt,
  onRestore,
  onFamily,
  onReplay,
  onSignOut,
  onDiscardEdits,
  cloudBackup,
}: {
  data: Data;
  busy: boolean;
  online: boolean;
  signedIn: boolean;
  onChange: Update;
  attempt: (fn: () => Promise<void>) => Promise<void>;
  onRestore: (data: Data, revision?: number) => Promise<void>;
  onFamily: () => void;
  onReplay: (kind: "welcome" | "intro") => void;
  onSignOut: () => Promise<void>;
  onDiscardEdits: () => Promise<void>;
  cloudBackup: (request: (data: Data, revision: number) => void) => ReactNode;
}) {
  const [tab, setTab] = useState("appearance"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [restore, setRestore] = useState<{
    data: Data;
    revision?: number;
  } | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const tabs = [
    ["appearance", "Appearance"],
    ["personal", "Personal"],
    ["backup", "Backups"],
    ["account", "Account"],
  ];
  const run = (fn: () => Promise<void>) => {
    setError("");
    setNotice("");
    void attempt(async () => {
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };
  return (
    <div className="settings-view">
      <div className="settings-profile">
        <PrismSurface tone="ink" />
        <span className="settings-avatar">
          {data.name.trim().slice(0, 1) || "Y"}
        </span>
        <div>
          <strong>{data.name || "Your space"}</strong>
          <span>
            {data.accounts.length}{" "}
            {data.accounts.length === 1 ? "account" : "accounts"} ·{" "}
            {data.entries.filter((e) => !e.deleted).length} records
          </span>
        </div>
        <ShieldCheck size={20} />
      </div>
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map(([id, label]) => (
          <button
            type="button"
            role="tab"
            id={`settings-tab-${id}`}
            aria-controls={`settings-panel-${id}`}
            aria-selected={tab === id}
            key={id}
            onClick={() => {
              setTab(id);
              setError("");
              setNotice("");
            }}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const index = tabs.findIndex((t) => t[0] === tab),
                next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (e.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
              setTab(tabs[next][0]);
              document.getElementById(`settings-tab-${tabs[next][0]}`)?.focus();
            }}
            tabIndex={tab === id ? 0 : -1}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="settings-feedback" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      <section
        role="tabpanel"
        id={`settings-panel-${tab}`}
        aria-labelledby={`settings-tab-${tab}`}
        className="settings-panel"
      >
        {tab === "appearance" && (
          <>
            <div className="settings-section">
              <span className="eyebrow">MAKE IT FEEL RIGHT</span>
              <h3>Your everyday view</h3>
              <p className="caption">
                Choose a look that feels comfortable in your light.
              </p>
              <div className="theme-options">
                {(
                  [
                    { v: "system", label: "System", icon: Monitor },
                    { v: "light", label: "Light", icon: Sun },
                    { v: "dark", label: "Dark", icon: Moon },
                  ] as const
                ).map(({ v, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={v}
                    className={
                      "theme-option " + (data.theme === v ? "selected" : "")
                    }
                    aria-pressed={data.theme === v}
                    onClick={() =>
                      run(() => onChange((live) => ({ ...live, theme: v })))
                    }
                  >
                    <Icon size={23} />
                    <span
                      className={`theme-miniature miniature-${v}`}
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                    </span>
                    <span>{label}</span>
                    {data.theme === v && <Check size={15} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-section settings-replay">
              <h3>A little County</h3>
              <button
                className="setting-row"
                onClick={() => onReplay("welcome")}
              >
                <ArrowUpRight size={20} />
                <div>
                  <strong>Replay welcome tour</strong>
                  <small>Take another look around</small>
                </div>
                <ChevronRight size={17} />
              </button>
              <button className="setting-row" onClick={() => onReplay("intro")}>
                <RefreshCw size={20} />
                <div>
                  <strong>Replay coin intro</strong>
                  <small>A quiet entrance to your space</small>
                </div>
                <ChevronRight size={17} />
              </button>
            </div>
          </>
        )}
        {tab === "personal" && (
          <>
            <div className="settings-section">
              <span className="eyebrow">JUST FOR YOU</span>
              <h3>Your personal space</h3>
              <label>
                Your name
                <input
                  value={data.name}
                  maxLength={40}
                  onChange={(e) => {
                    const name = e.target.value;
                    void onChange((live) => ({ ...live, name }));
                  }}
                />
              </label>
              <button className="setting-row" onClick={onFamily}>
                <Users size={21} />
                <div>
                  <strong>Your household</strong>
                  <small>Manage the people you share expenses with</small>
                </div>
                <ChevronRight size={17} />
              </button>
              <button
                className="setting-row"
                disabled={!isAndroid || busy}
                onClick={() =>
                  run(async () => {
                    await Native.authenticate();
                    await onChange((live) => ({ ...live, lock: !live.lock }));
                  })
                }
              >
                <LockKeyhole size={21} />
                <div>
                  <strong>Device app lock</strong>
                  <small>
                    {isAndroid
                      ? "Use your phone’s secure screen lock"
                      : "Available in the Android app"}
                  </small>
                </div>
                <span className={"toggle " + (data.lock ? "on" : "")} />
              </button>
            </div>
            <div className="settings-section">
              <h3>Your categories</h3>
              <div className="category-tokens">
                {data.categories.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    name = String(new FormData(form).get("category")).trim();
                  if (!name) return;
                  run(async () => {
                    if (data.categories.includes(name))
                      throw new Error("That category already exists.");
                    await onChange((live) => ({
                      ...live,
                      categories: live.categories.includes(name)
                        ? live.categories
                        : [...live.categories, name],
                    }));
                    form.reset();
                    setNotice("Category added.");
                  });
                }}
              >
                <label>
                  New category
                  <input
                    name="category"
                    placeholder="e.g. Pets"
                    required
                    maxLength={40}
                  />
                </label>
                <button
                  className="secondary"
                  aria-label="Add category"
                  disabled={busy}
                >
                  <Plus size={20} />
                </button>
              </form>
            </div>
          </>
        )}
        {tab === "backup" && (
          <>
            <div className="settings-section">
              <span className="eyebrow">KEEP A COPY</span>
              <h3>Records you can take with you</h3>
              <p className="caption">
                A full backup includes your accounts, transactions and
                preferences. Store exported files somewhere private.
              </p>
              <button
                className="setting-row"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const time = new Date().toISOString();
                    await download(
                      "county-backup-" + today() + ".json",
                      JSON.stringify({ ...data, lastBackup: time }, null, 2),
                      "application/json",
                    );
                    await onChange((live) => ({ ...live, lastBackup: time }));
                    setNotice("Backup prepared. Keep the exported file safe.");
                  })
                }
              >
                <Download size={21} />
                <div>
                  <strong>Save a full backup</strong>
                  <small>
                    {data.lastBackup
                      ? "Last prepared " +
                        new Date(data.lastBackup).toLocaleDateString("en-IN")
                      : "A complete copy of your space"}
                  </small>
                </div>
                <ChevronRight size={17} />
              </button>
              <label className="setting-row file-label">
                <Upload size={21} />
                <div>
                  <strong>Restore a backup</strong>
                  <small>Review it before replacing this phone’s records</small>
                </div>
                <input
                  type="file"
                  aria-label="Restore a backup"
                  accept=".json"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      run(async () =>
                        setRestore({ data: readBackup(await file.text()) }),
                      );
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                className="setting-row"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await download(
                      "county-transactions.csv",
                      csv(data.entries, data.accounts),
                      "text/csv",
                    );
                    setNotice("Transactions exported.");
                  })
                }
              >
                <ArrowUpRight size={21} />
                <div>
                  <strong>Export transactions</strong>
                  <small>A CSV for spreadsheets</small>
                </div>
                <ChevronRight size={17} />
              </button>
            </div>
            {cloudBackup((next, revision) => {
              setError("");
              setRestore({ data: next, revision });
            })}
            {!!data.sharedEdits?.length && (
              <div className="settings-section">
                <p className="caption">
                  {data.sharedEdits.length} household edits are waiting to sync.
                </p>
                {discardOpen ? (
                  <div className="restore-review" role="alert">
                    <h3>Discard pending edits?</h3>
                    <p>
                      Your personal transactions will be kept. Changes waiting
                      to be sent to other people’s shared entries will be
                      removed.
                    </p>
                    <div className="confirmation-actions">
                      <button
                        className="secondary"
                        onClick={() => setDiscardOpen(false)}
                      >
                        Keep edits
                      </button>
                      <button
                        className="danger-button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await onDiscardEdits();
                            setDiscardOpen(false);
                            setNotice("Pending household edits discarded.");
                          })
                        }
                      >
                        Discard edits
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="text-button"
                    onClick={() => setDiscardOpen(true)}
                  >
                    Discard pending household edits
                  </button>
                )}
              </div>
            )}
            {restore && (
              <div className="restore-review" role="alert">
                <div className="section-top">
                  <h3>Replace this phone’s records?</h3>
                  <button
                    className="icon-button"
                    aria-label="Cancel restore"
                    onClick={() => setRestore(null)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <p>
                  {`This backup contains ${restore.data.accounts.length} ${restore.data.accounts.length === 1 ? "account" : "accounts"} and ${restore.data.entries.filter((e) => !e.deleted).length} ${restore.data.entries.filter((e) => !e.deleted).length === 1 ? "record" : "records"}.`}{" "}
                  Export your current records first if you need to keep a copy.
                </p>
                <div className="restore-summary">
                  <span>{restore.data.name || "County backup"}</span>
                  <span>
                    {money(
                      restore.data.entries
                        .filter((e) => !e.deleted && e.type === "expense")
                        .reduce((s, e) => s + e.amount, 0),
                    )}{" "}
                    in expenses
                  </span>
                </div>
                <div className="confirmation-actions">
                  <button
                    className="secondary"
                    onClick={() => setRestore(null)}
                  >
                    Keep current records
                  </button>
                  <button
                    className="danger-button"
                    disabled={busy}
                    onClick={() =>
                      run(() => onRestore(restore.data, restore.revision))
                    }
                  >
                    Replace records
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {tab === "account" && (
          <>
            <div className="settings-section">
              <span className="eyebrow">YOUR COUNTY ACCOUNT</span>
              <h3>One person. One private space.</h3>
              <div className="account-connection">
                <span className="connection-symbol">
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <strong>{signedIn ? "Signed in" : "Offline access"}</strong>
                  <span>
                    {online
                      ? "Your verified account is connected"
                      : "Your records are available on this device"}
                  </span>
                </div>
              </div>
              <p className="caption">
                Your balances belong to you. Only expenses you choose to share
                appear in your household.
              </p>
              <button className="setting-row" onClick={onFamily}>
                <Users size={21} />
                <div>
                  <strong>Manage household</strong>
                  <small>Create, join or invite your family</small>
                </div>
                <ChevronRight size={17} />
              </button>
              <button
                className="setting-row signout-row"
                aria-label="Sign out"
                aria-describedby="signout-note"
                disabled={busy}
                onClick={() => run(onSignOut)}
              >
                <LogOut size={21} />
                <div>
                  <strong>Sign out</strong>
                  <small id="signout-note">
                    You’ll need an email code to open this space again
                  </small>
                </div>
                <ChevronRight size={17} />
              </button>
            </div>
            <p className="caption">
              Local records remain on this phone after signing out.
            </p>
          </>
        )}
      </section>
      <footer className="settings-footer">
        county<span>.</span>
        <small>Your money. A little clearer.</small>
      </footer>
    </div>
  );
}
