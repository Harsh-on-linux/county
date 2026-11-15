import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  Home,
  ListFilter,
  Users,
  ChartNoAxesCombined,
  Settings,
  Search,
  SlidersHorizontal,
  ArrowRight,
  WifiOff,
  ShieldCheck,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  ShoppingBag,
  Utensils,
  Car,
  Heart,
  Zap,
  ReceiptText,
  LockKeyhole,
  Inbox,
  LogOut,
} from "lucide-react";
import { Preferences } from "@capacitor/preferences";
import { App as CapacitorApp } from "@capacitor/app";
import {
  amountOf,
  balance,
  breakdown,
  csv,
  duplicate,
  money,
  monthEntries,
  householdLedger,
  parseSms,
  readBackup,
  today,
  totals,
  uid,
  validateEntry,
  type Account,
  type Data,
  type Entry,
  type SharedEntry,
  type Suggestion,
} from "./domain";
import { download, isAndroid, load, Native, save } from "./storage";
import {
  cloud,
  editShared,
  household,
  rpc,
  syncShared,
  fingerprint,
  SharedConflict,
  type SyncMark,
  type Household,
  type Member,
} from "./cloud";
import "./style.css";
import { MoneyField } from "./components/MoneyField";
import { ChoiceField } from "./components/ChoiceField";
import { CountyDock } from "./components/CountyDock";
import { MonthPulse } from "./components/MonthPulse";
import { BrandMark } from "./components/BrandMark";
import { Onboarding } from "./components/Onboarding";
import { OpeningScreen } from "./components/OpeningScreen";
import { BalanceSurface } from "./components/BalanceSurface";
import { UnlabelledInbox } from "./components/UnlabelledInbox";
import { FamilySettings } from "./components/FamilySettings";
import { EmailSignIn } from "./components/EmailSignIn";
import { SignInScreen } from "./components/SignInScreen";
import { BurstMark } from "./components/BurstMark";
import { AccountColour, accountColour } from "./components/AccountColour";
import { newAccountColour } from "./accountColours";
import { scanBounds, type ScanRange } from "./scanRange";
import {
  ingestMessages,
  matchSuggestion,
  setSuggestionStatus,
  suggestionStatus,
} from "./capture";
import "./design.css";
import "./typography.css";
import "./keypad.css";
import "./opening.css";
import "./balance-card.css";
import "./review.css";
import "./auth.css";
import "./readability.css";
import "./theme.css";
import "./motion.css";
import "./views.css";
import "./signature.css";
import { LedgerView } from "./components/LedgerView";
import { HouseholdView } from "./components/HouseholdView";
import { InsightsView } from "./components/InsightsView";
import { SettingsView } from "./components/SettingsView";

if (import.meta.env.PROD && "serviceWorker" in navigator && !isAndroid) {
  void navigator.serviceWorker.register("/sw.js").catch(console.error);
}

const icons: Record<string, typeof Home> = {
  "Food & drinks": Utensils,
  Groceries: ShoppingBag,
  Shopping: ShoppingBag,
  Transport: Car,
  Health: Heart,
  "Bills & utilities": Zap,
  Family: Users,
  Home,
  Rent: Home,
};
const accountIcon = {
  bank: Landmark,
  cash: Banknote,
  card: CreditCard,
  wallet: Wallet,
};
const monthLabel = (m: string) =>
  new Date(m + "-15T12:00:00").toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={"brand " + (small ? "small" : "")}>
      <BrandMark />
      <span>
        county<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
function App() {
  const [opening, setOpening] = useState(true);
  return (
    <>
      {opening && <OpeningScreen onDone={() => setOpening(false)} />}
      <CountyApp opening={opening} onReplayIntro={() => setOpening(true)} />
    </>
  );
}

function CountyApp({
  opening,
  onReplayIntro,
}: {
  opening: boolean;
  onReplayIntro: () => void;
}) {
  const [welcomePreview, setWelcomePreview] = useState(false),
    [signInFirst, setSignInFirst] = useState(false);
  const [data, setData] = useState<Data | null>(null),
    [fatal, setFatal] = useState(""),
    [tab, setTab] = useState("Home"),
    [modal, setModal] = useState<string | null>(null),
    [edit, setEdit] = useState<Entry | null>(null),
    [suggestion, setSuggestion] = useState<Suggestion | null>(null),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [locked, setLocked] = useState(false),
    [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false),
    [scanError, setScanError] = useState(""),
    [resumeEntry, setResumeEntry] = useState(false);
  const scanRunning = useRef(false),
    mutations = useRef<Promise<void>>(Promise.resolve());
  const [month, setMonth] = useState(today().slice(0, 7)),
    [dayFilter, setDayFilter] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [account, setAccount] = useState("All"),
    [kind, setKind] = useState("All"),
    [includeDeleted, setIncludeDeleted] = useState(false),
    [insightScope, setInsightScope] = useState("personal");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
  const [user, setUser] = useState<string | null>(null),
    [authReady, setAuthReady] = useState(!cloud),
    [offlineAccess, setOfflineAccess] = useState(false),
    [deviceOwner, setDeviceOwner] = useState<string | null>(null),
    [authError, setAuthError] = useState(""),
    [group, setGroup] = useState<Household | null>(null),
    [members, setMembers] = useState<Member[]>([]),
    [shared, setShared] = useState<SharedEntry[]>([]),
    [syncStatus, setSyncStatus] = useState("On this device"),
    [lastSync, setLastSync] = useState(""),
    [conflict, setConflict] = useState<SharedConflict | null>(null);
  const revisions = useRef<Record<string, SyncMark>>({}),
    current = useRef<Data | null>(null),
    syncRunning = useRef(false),
    backupRevision = useRef(0),
    unresolved = useRef<SharedConflict | null>(null),
    lastSynced = useRef("");
  const toast = (s: string) => setNotice(s);
  useEffect(() => {
    load()
      .then(async (d) => {
        document.documentElement.dataset.theme =
          d.theme === "system"
            ? matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : d.theme;
        current.current = d;
        setData(d);
        setLocked(d.lock && isAndroid);
      })
      .catch((e) => setFatal(String(e)));
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (!cloud) return;
    let active = true;
    const startupDeadline = setTimeout(() => {
      if (!active) return;
      setAuthReady(true);
      if (navigator.onLine)
        setAuthError(
          "Your connection is taking too long. Sign in again, or reopen County when connected.",
        );
    }, 4000);
    const accept = async (id: string | null) => {
      if (!id) {
        if (active) {
          setUser(null);
          setAuthReady(true);
        }
        return;
      }
      const owner = await Preferences.get({ key: "county-device-owner" });
      if (owner.value && owner.value !== id) {
        await cloud!.auth.signOut();
        toast(
          "These local records belong to a different account. Use that account on this phone to keep personal records private.",
        );
        if (active) {
          setAuthError(
            "These records belong to another account. Sign in with the email originally used on this phone.",
          );
          setAuthReady(true);
        }
        return;
      }
      await Preferences.set({ key: "county-device-owner", value: id });
      await Preferences.set({ key: "county-offline-access", value: "allowed" });
      if (active) {
        setUser(id);
        setDeviceOwner(id);
        setOfflineAccess(true);
        setAuthReady(true);
        setAuthError("");
      }
    };
    void (async () => {
      const cached = await Preferences.get({ key: "county-offline-access" });
      const owner = await Preferences.get({ key: "county-device-owner" });
      if (active) {
        setDeviceOwner(owner.value);
        setOfflineAccess(cached.value === "allowed" && !!owner.value);
        if (!navigator.onLine) setAuthReady(true);
      }
      const result = await cloud!.auth.getSession();
      if (result.error) throw result.error;
      await accept(result.data.session?.user.id || null);
    })()
      .catch(() => {
        if (active) {
          setAuthReady(true);
          if (navigator.onLine)
            setAuthError(
              "Could not check your session. Sign in again to continue.",
            );
        }
      })
      .finally(() => clearTimeout(startupDeadline));
    const {
      data: { subscription },
    } = cloud.auth.onAuthStateChange((event, s) => {
      setTimeout(() => {
        clearTimeout(startupDeadline);
        void (async () => {
          if (event === "SIGNED_OUT") {
            if (active) {
              setModal(null);
              setTab("Home");
            }
            await Preferences.remove({ key: "county-offline-access" });
            if (active) setOfflineAccess(false);
          }
          await accept(s?.user.id || null);
        })().catch(() => {
          if (active) {
            setUser(null);
            setAuthReady(true);
            setAuthError("Could not save your sign-in. Please try again.");
          }
        });
      }, 0);
    });
    return () => {
      active = false;
      clearTimeout(startupDeadline);
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const profile = user || (!online && offlineAccess ? deviceOwner : null);
    if (!profile) {
      setGroup(null);
      setMembers([]);
      setShared([]);
      revisions.current = {};
      backupRevision.current = 0;
      lastSynced.current = "";
      setSyncStatus("On this device");
      return;
    }
    void (async () => {
      const marks = await Preferences.get({ key: "county-marks-" + profile });
      revisions.current = JSON.parse(marks.value || "{}");
      const rev = await Preferences.get({
        key: "county-backup-revision-" + profile,
      });
      backupRevision.current = Number(rev.value || 0);
      const cache = await Preferences.get({ key: "county-household" });
      if (cache.value) {
        const c = JSON.parse(cache.value);
        if (c.user === profile) {
          setGroup(c.household);
          setMembers(c.members);
          setShared(c.entries);
        }
      }
    })();
  }, [user, online, offlineAccess, deviceOwner]);
  useEffect(() => {
    if (!data) return;
    try {
      localStorage.setItem("county-appearance", data.theme);
    } catch {}
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme =
        data.theme === "system" ? (mq.matches ? "dark" : "light") : data.theme;
      document.documentElement.dataset.theme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#303236" : "#d8d6c9");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [data?.theme]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!isAndroid) return;
    const listener = CapacitorApp.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (!isActive && current.current?.lock) setLocked(true);
      },
    );
    return () => {
      void listener.then((l) => l.remove());
    };
  }, []);
  function commit(update: Data | ((live: Data) => Data)) {
    const write = mutations.current
      .catch(() => {})
      .then(async () => {
        const next =
          typeof update === "function" ? update(current.current!) : update;
        await save(next);
        current.current = next;
        setData(next);
        if (user) setSyncStatus("Changes pending");
      });
    mutations.current = write;
    return write;
  }
  async function change(fn: (d: Data) => Data) {
    try {
      await commit(fn);
    } catch (e) {
      toast("Could not save. " + (e as Error).message);
    }
  }
  async function scanMessages(requestPermission = true, range?: ScanRange) {
    if (!isAndroid || scanRunning.current || !current.current) return false;
    scanRunning.current = true;
    setScanning(true);
    setScanError("");
    try {
      const previousScan =
        current.current.lastSmsScan && Date.parse(current.current.lastSmsScan);
      const bounds = range ? scanBounds(range) : null;
      const { messages } = await Native.readSms({
        requestPermission,
        ...(bounds || {}),
        ...(!requestPermission && previousScan
          ? { since: previousScan - 60 * 60 * 1000 }
          : {}),
      });
      let added = 0;
      await commit((live) => {
        if (!requestPermission && !live.smsCapture) return live;
        const result = ingestMessages(
          live,
          bounds
            ? messages.filter(
                (m) =>
                  m.timestamp >= bounds.since && m.timestamp < bounds.until,
              )
            : messages,
        );
        added = result.added;
        return {
          ...result.data,
          smsCapture: true,
          lastSmsScan: new Date().toISOString(),
          ...(range ? { smsScanRange: range } : {}),
        };
      });
      if (requestPermission)
        toast(
          added
            ? `${added} payment${added === 1 ? "" : "s"} ready to label.`
            : "No new payments found.",
        );
      return true;
    } catch (e) {
      setScanError((e as Error).message);
      return false;
    } finally {
      scanRunning.current = false;
      setScanning(false);
    }
  }
  useEffect(() => {
    if (
      !isAndroid ||
      !data?.onboarded ||
      !data.smsCapture ||
      locked ||
      opening ||
      (!user && !(offlineAccess && !online))
    )
      return;
    void scanMessages(false);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void scanMessages(false);
    }, 30000);
    const listener = CapacitorApp.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (isActive && !current.current?.lock) void scanMessages(false);
      },
    );
    return () => {
      clearInterval(timer);
      void listener.then((l) => l.remove());
    };
  }, [
    data?.onboarded,
    data?.smsCapture,
    locked,
    opening,
    user,
    offlineAccess,
    online,
  ]);
  async function attempt(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function queueShared(item: SharedEntry, payload: Entry) {
    await commit((live) => {
      const previous = live.sharedEdits?.find((e) => e.id === item.id);
      return {
        ...live,
        sharedEdits: [
          ...(live.sharedEdits || []).filter((e) => e.id !== item.id),
          {
            ...item,
            revision: previous?.revision || item.revision,
            payload: { ...payload, account: "" },
          },
        ],
      };
    });
  }
  async function sync() {
    if (!cloud || !user || !current.current || !online || syncRunning.current)
      return;
    if (unresolved.current) {
      setModal("conflict");
      return;
    }
    syncRunning.current = true;
    setSyncStatus("Syncing…");
    try {
      const before = await household();
      setGroup(before.household);
      setMembers(before.members);
      setShared(before.entries);
      for (const pending of before.household
        ? current.current.sharedEdits || []
        : []) {
        const remote = before.entries.find((e) => e.id === pending.id);
        if (!remote)
          throw new Error(
            "This queued household entry is no longer accessible.",
          );
        if (remote.revision !== pending.revision)
          throw new SharedConflict(pending.payload, remote, true);
        const revision = await editShared(pending, pending.payload);
        await commit((live) => ({
          ...live,
          sharedEdits: live.sharedEdits?.flatMap((e) =>
            e.id !== pending.id
              ? [e]
              : fingerprint(e.payload) === fingerprint(pending.payload)
                ? []
                : [{ ...e, revision }],
          ),
        }));
      }
      if (before.household) {
        const original: Data = current.current!;
        const merged = await syncShared(
          original,
          revisions.current,
          before.entries,
          user,
        );
        if (JSON.stringify(merged) !== JSON.stringify(original)) {
          await commit((live) => ({
            ...live,
            entries: live.entries.map((entry) => {
              const old = original.entries.find((e) => e.id === entry.id);
              const pulled = merged.entries.find((e) => e.id === entry.id);
              if (!old || !pulled || fingerprint(old) === fingerprint(pulled))
                return entry;
              if (fingerprint(entry) !== fingerprint(old))
                throw new SharedConflict(
                  entry,
                  before.entries.find((s) => s.id === entry.id)!,
                );
              return pulled;
            }),
          }));
        }
      }
      const snapshot = await household();
      setGroup(snapshot.household);
      setMembers(snapshot.members);
      setShared(snapshot.entries);
      await Preferences.set({
        key: "county-household",
        value: JSON.stringify({ ...snapshot, user }),
      });
      const raw = JSON.stringify(current.current);
      if (raw !== lastSynced.current) {
        backupRevision.current = await rpc<number>("save_backup", {
          snapshot: current.current,
          expected_revision: backupRevision.current,
        });
        lastSynced.current = raw;
        await Preferences.set({
          key: "county-backup-revision-" + user,
          value: String(backupRevision.current),
        });
      }
      setLastSync(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setSyncStatus(
        current.current?.sharedEdits?.length
          ? "Shared edits waiting"
          : "Up to date",
      );
    } catch (e) {
      setSyncStatus("Needs attention");
      if (e instanceof SharedConflict) {
        unresolved.current = e;
        setConflict(e);
        setModal("conflict");
      }
      toast((e as Error).message);
    } finally {
      syncRunning.current = false;
    }
  }
  useEffect(() => {
    if (user && online && data?.onboarded) {
      const t = setTimeout(() => void sync(), 1500);
      return () => clearTimeout(t);
    }
  }, [user, online, data]);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => void sync(), 60000);
    return () => clearInterval(t);
  }, [user, online]);
  useEffect(() => {
    if (!isAndroid || opening || modal || tab === "Home") return;
    const listener = CapacitorApp.addListener("backButton", () => {
      if (document.querySelector(".county-dock.expanded")) return;
      setTab("Home");
      setDayFilter("");
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [tab, modal, opening]);
  if (fatal)
    return (
      <div className="recovery">
        <Logo />
        <h1>Your records need attention.</h1>
        <p>
          County could not open its saved data. It has not been overwritten.
        </p>
        <pre>{fatal}</pre>
        <p>Restore a valid backup using the file picker below.</p>
        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f)
              void f
                .text()
                .then(readBackup)
                .then(save)
                .then(() => location.reload())
                .catch((e) => setFatal(e.message));
          }}
        />
      </div>
    );
  if (!data || !authReady)
    return (
      <div className="startup-status" role="status">
        <span className="startup-progress" aria-hidden="true" />
        Opening your space…
      </div>
    );
  const onboardingScreen = (
    <>
      <Onboarding
        data={data}
        preview={welcomePreview}
        requiresSignIn={!user && !(offlineAccess && !online)}
        startAtSetup={signInFirst}
        onSignIn={
          !user && !deviceOwner ? () => setSignInFirst(true) : undefined
        }
        onClose={() => setWelcomePreview(false)}
        onComplete={(next) => {
          if (!welcomePreview) {
            current.current = next;
            setData(next);
          }
          setWelcomePreview(false);
        }}
      />
    </>
  );
  // A new device can prepare a space before authentication. Existing records
  // remain behind the account and device-lock gates below.
  if (
    !data.onboarded &&
    !deviceOwner &&
    !locked &&
    !signInFirst &&
    !data.accounts.length &&
    !data.entries.length &&
    !data.suggestions.length
  )
    return onboardingScreen;
  if (!user && !(offlineAccess && !online))
    return (
      <>
        <SignInScreen
          busy={busy}
          attempt={attempt}
          online={online}
          error={authError}
        />
      </>
    );
  if (locked)
    return (
      <div className="county-unlock">
        <span className="unlock-emblem">
          <BrandMark />
          <LockKeyhole size={17} />
        </span>
        <span className="onboarding-kicker">YOUR PERSONAL SPACE</span>
        <h1>Welcome back.</h1>
        <p>
          A little clarity is waiting for you.
          <br />
          Unlock to pick up where you left off.
        </p>
        <button
          className="onboarding-cta"
          disabled={busy}
          onClick={() =>
            void attempt(async () => {
              await Native.authenticate();
              setLocked(false);
            })
          }
        >
          {busy ? "Unlocking…" : "Unlock County"} <ArrowRight size={18} />
        </button>
        {notice && <p role="alert">{notice}</p>}
      </div>
    );
  if (!data.onboarded || welcomePreview) return onboardingScreen;
  const d = data;
  const viewer = user || (!online && offlineAccess ? deviceOwner : null);
  const monthly = monthEntries(d.entries, month),
    total = totals(monthly),
    available = d.accounts
      .filter((a) => a.type !== "card")
      .reduce((s, a) => s + balance(a, d.entries), 0),
    owed = -d.accounts
      .filter((a) => a.type === "card")
      .reduce((s, a) => s + Math.min(balance(a, d.entries), 0), 0);
  const householdView = householdLedger(d, shared, viewer, !!group);
  const hm = monthEntries(householdView, month),
    ht = totals(hm);
  const recent = [...d.entries]
    .filter((e) => !e.deleted)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updated.localeCompare(a.updated),
    );
  const filtered = [...d.entries]
    .filter(
      (e) =>
        (includeDeleted ? e.deleted : !e.deleted) &&
        e.date.startsWith(month) &&
        (!dayFilter || e.date === dayFilter) &&
        (category === "All" || e.category === category) &&
        (account === "All" || e.account === account || e.to === account) &&
        (kind === "All" || e.type === kind) &&
        [e.payee, e.note, e.category]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updated.localeCompare(a.updated),
    );
  const pending = d.suggestions.filter(
    (s) => suggestionStatus(s, d.entries) === "unlabelled",
  );
  function openLedger(day = "", accountId = "All") {
    setDayFilter(day);
    setAccount(accountId);
    setCategory("All");
    setKind("All");
    setQuery("");
    setIncludeDeleted(false);
    setTab("Activity");
  }
  function add() {
    setEdit(null);
    setSuggestion(null);
    setResumeEntry(!d.accounts.length);
    setModal(d.accounts.length ? "entry" : "account");
  }
  function reviewSuggestion(s: Suggestion) {
    setSuggestion(s);
    setEdit(null);
    setResumeEntry(!d.accounts.length);
    setModal(d.accounts.length ? "entry" : "account");
  }
  function shiftMonth(n: number) {
    const dt = new Date(month + "-15T12:00:00");
    dt.setMonth(dt.getMonth() + n);
    setMonth(dt.toLocaleDateString("en-CA").slice(0, 7));
    setDayFilter("");
  }
  const monthPicker = (
    <div className="month-picker">
      <button aria-label="Previous month" onClick={() => shiftMonth(-1)}>
        <ChevronLeft size={16} />
      </button>
      <span>{monthLabel(month)}</span>
      <button aria-label="Next month" onClick={() => shiftMonth(1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
  function transaction(e: Entry, payer?: string) {
    const Icon =
      e.type === "transfer"
        ? ArrowLeftRight
        : e.type === "income"
          ? ArrowDownLeft
          : icons[e.category] || ReceiptText;
    return (
      <button
        className="transaction"
        key={e.id}
        onClick={() => {
          if (payer) {
            const item = shared.find((s) => s.id === e.id);
            if (
              d.entries.some((local) => local.id === e.id) &&
              (!item || item.creator === viewer)
            ) {
              setEdit(d.entries.find((local) => local.id === e.id)!);
              setSuggestion(null);
              setModal("entry");
              return;
            }
            if (item && (item.creator === viewer || group?.owner === viewer)) {
              setEdit({ ...item.payload, account: d.accounts[0]?.id || "" });
              setModal("shared-edit:" + e.id);
            } else toast(`${payer} paid · ${e.note || e.category}`);
          } else {
            setEdit(e);
            setSuggestion(null);
            setModal("entry");
          }
        }}
      >
        <span
          className={
            "transaction-icon " + (e.type === "income" ? "positive" : "")
          }
        >
          <Icon size={19} />
        </span>
        <span className="transaction-info">
          <strong>
            {e.payee ||
              (e.type === "transfer" ? "Account transfer" : e.category)}
          </strong>
          <small>
            {payer
              ? `${payer} paid`
              : d.accounts.find((a) => a.id === e.account)?.name}{" "}
            <span>·</span> {e.type === "transfer" ? "Transfer" : e.category}
            {e.shared && !payer && (
              <span className="shared-dot" title="Shared with household">
                {" "}
                · Household
              </span>
            )}
          </small>
        </span>
        <span
          className={
            "transaction-amount " + (e.type === "income" ? "positive" : "")
          }
        >
          <strong>
            {e.type === "income" ? "+" : e.type === "transfer" ? "" : "−"}
            {money(Math.abs(e.amount), true)}
          </strong>
          <small>
            {new Date(e.date + "T12:00:00").toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </small>
        </span>
        {e.deleted && <span className="badge">Deleted</span>}
      </button>
    );
  }
  function categoryChart(entries: Entry[]) {
    const rows = breakdown(entries),
      sum = totals(entries).expense;
    return rows.length ? (
      <div className="category-list">
        {rows.map(([name, amount], i) => {
          const Icon = icons[name] || ReceiptText;
          return (
            <div className="category-row" key={name}>
              <div className="category-label">
                <span className={"mini-icon tint-" + (i % 5)}>
                  <Icon size={16} />
                </span>
                <span>{name}</span>
                <strong>{money(amount)}</strong>
                <small>{Math.round((amount / sum) * 100)}%</small>
              </div>
              <div className="track">
                <span
                  className={"tint-bg-" + (i % 5)}
                  style={{ width: `${(amount / sum) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <Empty
        icon={ChartNoAxesCombined}
        title="A clearer picture starts here"
        text="Add a few expenses and your spending breakdown will appear."
      />
    );
  }
  return (
    <>
      <div
        className="app-shell"
        inert={!!modal || opening}
        aria-hidden={modal || opening ? true : undefined}
      >
        <aside className="sidebar">
          <Logo />
          <span className="workspace-label">YOUR EVERYDAY MONEY</span>
          <nav>
            {[
              { name: "Home", icon: Home },
              { name: "Activity", icon: ListFilter },
              { name: "Unlabelled", icon: Inbox },
              { name: "Household", icon: Users },
              { name: "Insights", icon: ChartNoAxesCombined },
            ].map(({ name, icon: Icon }) => (
              <button
                key={name}
                aria-label={name}
                className={tab === name ? "active" : ""}
                onClick={() => setTab(name)}
              >
                <Icon size={20} />
                {name}
                {name === "Unlabelled" && pending.length > 0 && (
                  <span className="nav-count">{pending.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-note">
            <BurstMark className="status-symbol" />
            <strong>A little more peace of mind.</strong>
            <p>Your records are saved on this device, even offline.</p>
          </div>
          <button
            className="settings-link"
            onClick={() => setModal("settings")}
          >
            <Settings size={18} /> Settings & backup
          </button>
          <div className="profile">
            <span className="avatar">{d.name.slice(0, 1) || "Y"}</span>
            <div>
              <strong>{d.name || "Your space"}</strong>
              <small>Personal space</small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </aside>
        <main>
          <header className="topbar">
            <div className="mobile-brand">
              <Logo small />
            </div>
            <div className="breadcrumb">
              Your space <ChevronRight size={14} /> <strong>{tab}</strong>
            </div>
            <button
              className="sync-pill"
              onClick={() => (user ? void sync() : setModal("settings"))}
            >
              {online ? (
                <BurstMark className="status-symbol" />
              ) : (
                <WifiOff size={14} />
              )}
              <span>{!online ? "Offline · saved locally" : syncStatus}</span>
            </button>
            <button
              className="icon-button mobile-settings"
              aria-label="Settings"
              onClick={() => setModal("settings")}
            >
              <Settings size={20} />
            </button>
          </header>
          <div key={tab} className={"page page-" + tab.toLowerCase()}>
            <section className="page-heading">
              <div>
                <div className="eyebrow">
                  {tab === "Home"
                    ? "A LITTLE CLARITY, EVERY DAY"
                    : tab === "Household"
                      ? "BETTER, TOGETHER"
                      : tab === "Unlabelled"
                        ? "A MOMENT TO REVIEW"
                        : tab === "Insights"
                          ? "THE BIGGER PICTURE"
                          : "EVERY LITTLE THING"}
                </div>
                <h1>
                  {tab === "Home"
                    ? `Hello, ${d.name || "there"}`
                    : tab === "Activity"
                      ? "The ledger"
                      : tab === "Household"
                        ? "Our home"
                        : tab === "Unlabelled"
                          ? "Unlabelled"
                          : "Find your patterns"}
                  <span className="accent">.</span>
                </h1>
                <p>
                  {tab === "Home"
                    ? "Your money, at a glance."
                    : tab === "Activity"
                      ? "The ins, the outs, and everything in between."
                      : tab === "Household"
                        ? "Shared spending. Personal space. A little more harmony."
                        : tab === "Unlabelled"
                          ? "Check the details. Give each payment a home."
                          : "Small patterns. Better understanding."}
                </p>
              </div>
              <button className="primary desktop-add" onClick={add}>
                <Plus size={18} /> Add transaction
              </button>
            </section>
            {tab === "Home" && (
              <>
                <div className="dashboard-grid">
                  <section className="balance-card">
                    <BalanceSurface
                      active={!opening && !locked && !modal && !welcomePreview}
                    />
                    <div className="card-top">
                      <span>
                        <BurstMark className="balance-symbol" /> YOUR AVAILABLE
                        MONEY
                      </span>
                      <Wallet size={20} />
                    </div>
                    <div className="balance-amount">
                      {money(available, true)}
                    </div>
                    <p>
                      Across{" "}
                      {d.accounts.filter((a) => a.type !== "card").length}{" "}
                      {d.accounts.filter((a) => a.type !== "card").length === 1
                        ? "account"
                        : "accounts"}
                    </p>
                    <div className="balance-bottom">
                      <span>
                        <ShieldCheck size={14} /> Just for you
                      </span>
                      <button onClick={() => setModal("accounts")}>
                        Manage accounts <ArrowUpRight size={16} />
                      </button>
                    </div>
                  </section>
                  <section className="card month-summary">
                    <div className="section-top">
                      <h2>This month</h2>
                      {monthPicker}
                    </div>
                    <div className="summary-line">
                      <span className="round-icon mint">
                        <ArrowDownLeft size={19} />
                      </span>
                      <div>
                        <small>Money in</small>
                        <strong>{money(total.income)}</strong>
                      </div>
                      <span className="subtle">Income</span>
                    </div>
                    <div className="summary-line">
                      <span className="round-icon peach">
                        <ArrowUpRight size={19} />
                      </span>
                      <div>
                        <small>Money out</small>
                        <strong>{money(total.expense)}</strong>
                      </div>
                      <span className="subtle">Expenses</span>
                    </div>
                    <div className="summary-foot">
                      <span>Net this month</span>
                      <strong>{money(total.income - total.expense)}</strong>
                    </div>
                  </section>
                </div>
                <button
                  className="inbox-banner"
                  data-pending={pending.length > 0}
                  onClick={() => setTab("Unlabelled")}
                >
                  <span className="round-icon lilac">
                    <Inbox size={20} />
                  </span>
                  <div>
                    <strong>
                      Unlabelled <span className="count">{pending.length}</span>
                    </strong>
                    <p>
                      {pending.length
                        ? `${pending.length} captured payment${pending.length === 1 ? "" : "s"} ready to label`
                        : "Review payments captured from bank messages"}
                    </p>
                  </div>
                  <ChevronRight size={18} />
                </button>
                <section className="accounts-section">
                  <div className="section-top">
                    <h2>
                      Your accounts{" "}
                      <span className="count">{d.accounts.length}</span>
                    </h2>
                    <button
                      className="text-button"
                      onClick={() => setModal("account")}
                    >
                      <Plus size={15} /> Add account
                    </button>
                  </div>
                  <div className="account-grid">
                    {d.accounts.map((a) => {
                      const Icon = accountIcon[a.type];
                      const b = balance(a, d.entries);
                      return (
                        <button
                          className="account-card"
                          data-account-colour={accountColour(a)}
                          key={a.id}
                          onClick={() => {
                            openLedger("", a.id);
                          }}
                        >
                          <span className="account-top">
                            <span
                              className={
                                "mini-icon " +
                                (a.type === "cash"
                                  ? "mint"
                                  : a.type === "card"
                                    ? "peach"
                                    : "lilac")
                              }
                            >
                              <Icon size={17} />
                            </span>
                            <span>
                              {a.type === "card"
                                ? "CREDIT CARD"
                                : a.type.toUpperCase()}
                            </span>
                            <ChevronRight size={14} />
                          </span>
                          <strong>{a.name}</strong>
                          <div className="account-bottom">
                            <span>
                              {money(a.type === "card" ? -b : b, true)}
                            </span>
                            <small>
                              {a.type === "card" ? "owed" : "balance"}
                            </small>
                          </div>
                        </button>
                      );
                    })}
                    {!d.accounts.length && (
                      <button
                        className="account-card add-account"
                        onClick={() => setModal("account")}
                      >
                        <Plus />
                        <strong>Add your first account</strong>
                        <small>Cash, bank, wallet, or credit card</small>
                      </button>
                    )}
                  </div>
                  {owed > 0 && (
                    <p className="caption">
                      Credit cards: {money(owed)} owed · excluded from available
                      money
                    </p>
                  )}
                </section>
                <MonthPulse
                  entries={monthly}
                  month={month}
                  onSelectDay={(day) => openLedger(day)}
                />
                <div className="dashboard-grid lower-grid">
                  <section className="card">
                    <div className="section-top">
                      <h2>Recent activity</h2>
                      <button
                        className="text-button"
                        onClick={() => openLedger()}
                      >
                        View all <ArrowRight size={15} />
                      </button>
                    </div>
                    {recent.slice(0, 5).map((e) => transaction(e))}
                    {recent.length === 0 && (
                      <Empty
                        icon={ArrowLeftRight}
                        title="Your story starts with one entry"
                        text="A morning coffee, a salary, a grocery run. Give it a home."
                        action="Add a transaction"
                        onClick={add}
                      />
                    )}
                  </section>
                  <section className="card">
                    <div className="section-top">
                      <h2>Where it went</h2>
                      <span className="subtle">
                        {new Date(month + "-15").toLocaleDateString("en-IN", {
                          month: "short",
                        })}
                      </span>
                    </div>
                    {categoryChart(monthly)}
                  </section>
                </div>
              </>
            )}
            {tab === "Unlabelled" && (
              <UnlabelledInbox
                data={d}
                android={isAndroid}
                scanning={scanning}
                scanError={scanError}
                onScan={(range) => scanMessages(true, range)}
                onToggle={() =>
                  void change((live) => ({
                    ...live,
                    smsCapture: !live.smsCapture,
                  }))
                }
                onPaste={async (body, date) => {
                  const timestamp = Date.parse(date + "T12:00:00");
                  if (!parseSms("preview", body, timestamp))
                    throw new Error(
                      "No completed payment found. Use a bank message with a debit or credit amount.",
                    );
                  const digest = await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(date + ":" + body.trim()),
                  );
                  const id =
                    "paste-" +
                    [...new Uint8Array(digest)]
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join("");
                  await commit((live) => {
                    const result = ingestMessages(live, [
                      { id, body, timestamp },
                    ]);
                    if (!result.added)
                      throw new Error(
                        "This payment has already been captured. Check Unlabelled or Discarded.",
                      );
                    return result.data;
                  });
                  toast("Payment ready to label.");
                }}
                onReview={reviewSuggestion}
                onDiscard={(id) =>
                  commit((live) => setSuggestionStatus(live, id, "discarded"))
                }
                onRestore={(id) =>
                  commit((live) => setSuggestionStatus(live, id, "unlabelled"))
                }
                onMatch={(id) => commit((live) => matchSuggestion(live, id))}
                onAccount={() => {
                  setResumeEntry(false);
                  setSuggestion(null);
                  setModal("account");
                }}
              />
            )}
            {tab === "Activity" && (
              <LedgerView
                data={d}
                entries={filtered}
                monthPicker={monthPicker}
                query={query}
                onQuery={setQuery}
                filters={{ category, account, kind, deleted: includeDeleted }}
                onFilters={(patch) => {
                  if (patch.category !== undefined) setCategory(patch.category);
                  if (patch.account !== undefined) setAccount(patch.account);
                  if (patch.kind !== undefined) setKind(patch.kind);
                  if (patch.deleted !== undefined)
                    setIncludeDeleted(patch.deleted);
                }}
                day={dayFilter}
                onClearDay={() => setDayFilter("")}
                pending={pending.length}
                onInbox={() => setTab("Unlabelled")}
                onExport={() =>
                  void attempt(async () => {
                    await download(
                      "county-transactions.csv",
                      csv(filtered, d.accounts),
                      "text/csv",
                    );
                  })
                }
                renderEntry={transaction}
              />
            )}
            {tab === "Household" && (
              <HouseholdView
                group={group}
                members={members}
                name={d.name}
                entries={hm}
                monthPicker={monthPicker}
                renderEntry={transaction}
                onManage={() => setModal("family")}
                onAdd={add}
              />
            )}
            {tab === "Insights" && (
              <>
                <div className="section-top insight-controls">
                  <div className="segmented">
                    {["personal", "household"].map((s) => (
                      <button
                        className={insightScope === s ? "selected" : ""}
                        key={s}
                        onClick={() => setInsightScope(s)}
                      >
                        {s === "personal" ? "Just me" : "Household"}
                      </button>
                    ))}
                  </div>
                  {monthPicker}
                </div>
                <InsightsView
                  key={month + insightScope}
                  entries={
                    insightScope === "personal" ? d.entries : householdView
                  }
                  month={month}
                  categoryChart={categoryChart}
                  calendar={
                    <MonthPulse
                      entries={insightScope === "personal" ? monthly : hm}
                      month={month}
                      onSelectDay={(day) => {
                        if (insightScope === "personal") openLedger(day);
                        else
                          toast(
                            "Household spending for " +
                              day +
                              ": " +
                              money(
                                totals(hm.filter((e) => e.date === day))
                                  .expense,
                              ),
                          );
                      }}
                    />
                  }
                />
              </>
            )}
          </div>
        </main>
      </div>
      <CountyDock
        tab={tab}
        unlabelledCount={pending.length}
        blocked={!!modal || opening}
        onSelect={(v) => {
          setTab(v);
          setDayFilter("");
        }}
        onAdd={add}
      />
      {modal && (
        <Dialog
          title={
            modal === "entry"
              ? edit
                ? "Transaction details"
                : suggestion
                  ? "Label transaction"
                  : "Make a record"
              : modal.startsWith("account-edit:")
                ? "Edit account"
                : modal === "account"
                  ? "Add an account"
                  : modal === "accounts"
                    ? "Your accounts"
                    : modal === "settings"
                      ? "Make County yours"
                      : modal === "family"
                        ? "Your household"
                        : modal.startsWith("shared-edit")
                          ? "Shared expense"
                          : "County"
          }
          close={() => {
            setModal(null);
            setSuggestion(null);
            setResumeEntry(false);
          }}
        >
          {(modal === "entry" || modal.startsWith("shared-edit")) && (
            <EntryForm
              data={d}
              entry={edit}
              suggestion={suggestion}
              householdConnected={!!group}
              sharedOnly={modal.startsWith("shared-edit")}
              busy={busy}
              onSave={(entry) =>
                void attempt(async () => {
                  if (modal.startsWith("shared-edit")) {
                    const item = shared.find((s) => s.id === entry.id)!;
                    await queueShared(item, {
                      ...item.payload,
                      ...entry,
                      account: "",
                    });
                  } else {
                    validateEntry(entry, d.accounts);
                    await commit((live) => {
                      if (
                        suggestion &&
                        live.entries.some((e) => e.smsId === suggestion.id)
                      )
                        throw new Error("This payment is already recorded.");
                      return {
                        ...live,
                        entries: [
                          ...live.entries.filter((e) => e.id !== entry.id),
                          entry,
                        ],
                        suggestions: live.suggestions.map((s) =>
                          s.id === suggestion?.id
                            ? {
                                ...s,
                                status: "saved" as const,
                                dismissed: true,
                              }
                            : s,
                        ),
                      };
                    });
                  }
                  setModal(null);
                  toast("Transaction saved.");
                })
              }
              onDelete={
                edit
                  ? () =>
                      void attempt(async () => {
                        if (modal.startsWith("shared-edit")) {
                          const item = shared.find((s) => s.id === edit.id)!;
                          await queueShared(item, {
                            ...item.payload,
                            deleted: !edit.deleted,
                          });
                        } else
                          await commit((live) => ({
                            ...live,
                            entries: live.entries.map((e) =>
                              e.id === edit.id
                                ? {
                                    ...e,
                                    deleted: !e.deleted,
                                    updated: new Date().toISOString(),
                                  }
                                : e,
                            ),
                          }));
                        setModal(null);
                        toast(
                          edit.deleted
                            ? "Transaction restored."
                            : "Moved to recently deleted.",
                        );
                      })
                  : undefined
              }
            />
          )}
          {(modal === "account" || modal.startsWith("account-edit:")) && (
            <AccountForm
              key={modal}
              accounts={d.accounts}
              account={
                modal.startsWith("account-edit:")
                  ? d.accounts.find((a) => a.id === modal.slice(13))
                  : undefined
              }
              busy={busy}
              onSave={(a) =>
                void attempt(async () => {
                  await commit((live) => ({
                    ...live,
                    accounts: live.accounts.some((item) => item.id === a.id)
                      ? live.accounts.map((item) =>
                          item.id === a.id ? a : item,
                        )
                      : [...live.accounts, a],
                  }));
                  setModal(
                    modal.startsWith("account-edit:")
                      ? "accounts"
                      : resumeEntry
                        ? "entry"
                        : null,
                  );
                  setResumeEntry(false);
                  toast(
                    modal.startsWith("account-edit:")
                      ? "Account updated."
                      : "Account added.",
                  );
                })
              }
            />
          )}
          {modal === "accounts" && (
            <>
              <p className="dialog-intro">
                Keep bank, cash, wallet, and credit card balances in one place.
              </p>
              {d.accounts.map((a) => {
                const Icon = accountIcon[a.type];
                return (
                  <div
                    className="payer-row manage-account-row"
                    key={a.id}
                    data-account-colour={accountColour(a)}
                  >
                    <Icon size={20} />
                    <strong>{a.name}</strong>
                    <span>
                      {money(
                        a.type === "card"
                          ? -balance(a, d.entries)
                          : balance(a, d.entries),
                        true,
                      )}
                    </span>
                    <button
                      className="secondary account-edit-action"
                      aria-label={"Edit " + a.name}
                      onClick={() => setModal("account-edit:" + a.id)}
                    >
                      <Settings size={18} />
                      <span>Edit</span>
                    </button>
                  </div>
                );
              })}
              <button
                className="primary wide"
                onClick={() => setModal("account")}
              >
                <Plus size={16} /> Add account
              </button>
              <p className="caption">
                To correct a balance, add an adjustment transaction. Your
                history remains intact.
              </p>
            </>
          )}
          {modal === "settings" && (
            <SettingsView
              data={d}
              busy={busy}
              online={online}
              signedIn={!!user}
              onChange={commit}
              attempt={attempt}
              onFamily={() => setModal("family")}
              onReplay={(kind) => {
                setModal(null);
                if (kind === "welcome") setWelcomePreview(true);
                else onReplayIntro();
              }}
              onSignOut={async () => {
                const result = await cloud!.auth.signOut();
                if (result.error) throw result.error;
                toast("Signed out. Local records remain on this phone.");
              }}
              onDiscardEdits={async () => {
                await commit((live) => ({ ...live, sharedEdits: [] }));
                unresolved.current = null;
                setConflict(null);
              }}
              onRestore={async (snapshot, revision) => {
                const next = {
                  ...snapshot,
                  lock: current.current?.lock ?? d.lock,
                };
                await commit(next);
                if (revision !== undefined) {
                  backupRevision.current = revision;
                  lastSynced.current = JSON.stringify(next);
                }
                setModal(null);
                toast("Backup restored.");
              }}
              cloudBackup={(request) => (
                <CloudSettings
                  user={user}
                  data={d}
                  busy={busy}
                  online={online}
                  attempt={attempt}
                  onSync={sync}
                  onRestore={async (snapshot, revision) => {
                    request(snapshot, revision);
                  }}
                  lastSync={lastSync}
                />
              )}
            />
          )}
          {modal === "conflict" && conflict && (
            <>
              <p className="dialog-intro">
                This expense changed here and on another phone. Both versions
                are preserved until you choose.
              </p>
              <div className="info-box">
                <span>
                  On this phone:{" "}
                  <strong>{money(conflict.local.amount, true)}</strong>
                  <br />
                  {conflict.local.payee} · {conflict.local.category} ·{" "}
                  {conflict.local.note}
                </span>
              </div>
              <div className="info-box">
                <span>
                  Household version:{" "}
                  <strong>{money(conflict.remote.payload.amount, true)}</strong>
                  <br />
                  {conflict.remote.payload.payee} ·{" "}
                  {conflict.remote.payload.category} ·{" "}
                  {conflict.remote.payload.note}
                </span>
              </div>
              <button
                className="primary wide"
                disabled={busy}
                onClick={() =>
                  void attempt(async () => {
                    if (conflict.remoteOnly) {
                      await commit({
                        ...d,
                        sharedEdits: d.sharedEdits?.filter(
                          (e) => e.id !== conflict.remote.id,
                        ),
                      });
                      unresolved.current = null;
                      setConflict(null);
                      setModal(null);
                      return;
                    }
                    const merged = {
                      ...conflict.local,
                      ...conflict.remote.payload,
                      account: conflict.local.account,
                      smsId: conflict.local.smsId,
                    };
                    revisions.current[merged.id] = {
                      revision: conflict.remote.revision,
                      fingerprint: fingerprint(merged),
                    };
                    await Preferences.set({
                      key: "county-marks-" + user,
                      value: JSON.stringify(revisions.current),
                    });
                    await commit({
                      ...d,
                      entries: d.entries.map((e) =>
                        e.id === merged.id ? merged : e,
                      ),
                    });
                    unresolved.current = null;
                    setConflict(null);
                    setModal(null);
                  })
                }
              >
                Use household version
              </button>
              <button
                className="secondary wide"
                disabled={busy}
                onClick={() =>
                  void attempt(async () => {
                    await editShared(conflict.remote, {
                      ...conflict.local,
                      account: "",
                    });
                    if (conflict.remoteOnly) {
                      await commit({
                        ...d,
                        sharedEdits: d.sharedEdits?.filter(
                          (e) => e.id !== conflict.remote.id,
                        ),
                      });
                      unresolved.current = null;
                      setConflict(null);
                      setModal(null);
                      await sync();
                      return;
                    }
                    const snapshot = await household();
                    const remote = snapshot.entries.find(
                      (e) => e.id === conflict.local.id,
                    )!;
                    revisions.current[remote.id] = {
                      revision: remote.revision,
                      fingerprint: fingerprint(conflict.local),
                    };
                    await Preferences.set({
                      key: "county-marks-" + user,
                      value: JSON.stringify(revisions.current),
                    });
                    unresolved.current = null;
                    setConflict(null);
                    setModal(null);
                    await sync();
                  })
                }
              >
                Keep this phone’s version
              </button>
            </>
          )}
          {modal === "family" && (
            <div className="family-settings">
              <FamilySettings
                user={user}
                group={group}
                members={members}
                name={d.name}
                busy={busy}
                attempt={attempt}
                refresh={sync}
              />
            </div>
          )}
        </Dialog>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}

function Empty({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: typeof Home;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
function Dialog({
  title,
  close,
  children,
  fixed = false,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  fixed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dismissLayer = () => {
      const target = ref.current?.querySelector<HTMLButtonElement>(
        '[role="combobox"][aria-expanded="true"], [aria-label="Close number pad"], [data-record-back], .family-back',
      );
      if (!target) return false;
      target.click();
      return true;
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !fixed) {
        e.preventDefault();
        if (!dismissLayer()) close();
      }
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]',
        );
        const els = nodes
          ? [...nodes].filter(
              (el) =>
                el.getClientRects().length > 0 &&
                el.getAttribute("type") !== "hidden",
            )
          : [];
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const nativeBack = isAndroid
      ? CapacitorApp.addListener("backButton", () => {
          if (dismissLayer()) return;
          if (!fixed) close();
        })
      : null;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      void nativeBack?.then((l) => l.remove());
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !fixed) close();
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <div className="dialog-heading">
          <h2>{title}</h2>
          {!fixed && (
            <button
              className="icon-button"
              aria-label="Close dialog"
              onClick={close}
            >
              <X size={21} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
function EntryForm({
  data,
  entry,
  suggestion,
  busy,
  onSave,
  onDelete,
  sharedOnly,
  householdConnected = false,
}: {
  data: Data;
  entry: Entry | null;
  suggestion: Suggestion | null;
  busy: boolean;
  onSave: (e: Entry) => void;
  onDelete?: () => void;
  sharedOnly?: boolean;
  householdConnected?: boolean;
}) {
  const [type, setType] = useState<Entry["type"]>(
      entry?.type || suggestion?.type || "expense",
    ),
    [error, setError] = useState(""),
    [stage, setStage] = useState(entry || suggestion ? "details" : "amount"),
    [amountValue, setAmountValue] = useState(
      entry
        ? String(Math.abs(entry.amount) / 100)
        : suggestion
          ? String(suggestion.amount / 100)
          : "",
    );
  const composer = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target =
        stage === "amount"
          ? composer.current?.querySelector<HTMLInputElement>(
              ".money-display input",
            )
          : composer.current?.querySelector<HTMLButtonElement>(
              '.composer-details [role="combobox"]',
            );
      target?.focus({ preventScroll: true });
      composer.current?.closest(".dialog")?.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [stage]);
  if (!data.accounts.length && !sharedOnly)
    return (
      <Empty
        icon={Wallet}
        title="An account comes first"
        text="Close this window and add an account to give this transaction a home."
      />
    );
  return (
    <form
      className={"transaction-composer composer-" + stage}
      ref={composer}
      onSubmit={(ev) => {
        ev.preventDefault();
        try {
          if (stage === "amount") {
            amountOf(amountValue);
            setStage("details");
            return;
          }
          const f = new FormData(ev.currentTarget),
            amount = amountOf(String(f.get("amount")));
          const adjustment = String(f.get("direction")) === "decrease";
          const e: Entry = {
            id: entry?.id || uid(),
            type,
            amount: type === "adjustment" && adjustment ? -amount : amount,
            account: String(f.get("account") || entry?.account || ""),
            to: type === "transfer" ? String(f.get("to")) : undefined,
            category:
              type === "transfer"
                ? "Transfer"
                : type === "adjustment"
                  ? "Balance adjustment"
                  : String(f.get("category") || ""),
            payee: String(f.get("payee") || ""),
            note: String(f.get("note") || ""),
            date: String(f.get("date")),
            shared:
              type === "expense" && (sharedOnly || f.get("shared") === "on"),
            deleted: entry?.deleted || false,
            updated: new Date().toISOString(),
            smsId: entry?.smsId || suggestion?.id,
          };
          if (!sharedOnly) validateEntry(e, data.accounts);
          onSave(e);
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      {!sharedOnly && (
        <div className="segmented entry-tabs">
          {(["expense", "income", "transfer", "adjustment"] as const).map(
            (t) => (
              <button
                type="button"
                key={t}
                aria-label={t === "adjustment" ? "Adjustment" : undefined}
                className={type === t ? "selected" : ""}
                onClick={() => setType(t)}
              >
                {t === "adjustment" ? (
                  <>
                    <span className="entry-type-full">Adjustment</span>
                    <span className="entry-type-short">Adjust</span>
                  </>
                ) : (
                  t[0].toUpperCase() + t.slice(1)
                )}
              </button>
            ),
          )}
        </div>
      )}
      <div className="composer-step-label">
        <span>
          {suggestion
            ? "FROM BANK MESSAGE"
            : `0${stage === "amount" ? 1 : 2} / 02`}
        </span>
        <span>
          {suggestion
            ? "REVIEW & LABEL"
            : stage === "amount"
              ? "START WITH THE NUMBER"
              : "GIVE IT A LITTLE CONTEXT"}
        </span>
      </div>
      <MoneyField
        hero
        label="Amount in INR"
        name="amount"
        value={amountValue}
        onChange={(value) => {
          setAmountValue(value);
          setError("");
        }}
        autoOpen={stage === "amount"}
        confirmLabel="Continue"
        onConfirm={() => {
          try {
            amountOf(amountValue);
            setError("");
            setStage("details");
            return true;
          } catch (error) {
            setError((error as Error).message);
            return false;
          }
        }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="composer-details" hidden={stage === "amount"}>
        <div className="form-grid">
          {!sharedOnly && (
            <ChoiceField
              label={type === "transfer" ? "From account" : "Account"}
              name="account"
              defaultValue={
                entry?.account ||
                (suggestion && data.accounts.length > 1
                  ? ""
                  : data.accounts[0]?.id)
              }
              placeholder="Choose an account"
              options={data.accounts.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />
          )}
          {type === "transfer" ? (
            <ChoiceField
              label="To account"
              name="to"
              defaultValue={entry?.to || data.accounts[1]?.id}
              placeholder="Choose account"
              options={data.accounts.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />
          ) : (
            type !== "adjustment" && (
              <ChoiceField
                label="Category"
                name="category"
                defaultValue={entry?.category || (suggestion ? "" : "Other")}
                placeholder="Choose a category"
                options={Array.from(
                  new Set([
                    ...data.categories,
                    ...(entry?.category ? [entry.category] : []),
                  ]),
                ).map((c) => ({ value: c, label: c }))}
              />
            )
          )}
          <label>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue={entry?.date || suggestion?.date || today()}
            />
          </label>
          {type !== "transfer" && (
            <label>
              {type === "income" ? "From" : "Paid to"}
              <input
                name="payee"
                placeholder={
                  type === "income" ? "e.g. Salary" : "e.g. The corner café"
                }
                maxLength={100}
                defaultValue={entry?.payee || suggestion?.payee}
              />
            </label>
          )}
        </div>
        <details className="composer-optional" open={!!entry?.note}>
          <summary>
            Add a note <span>optional</span>
          </summary>
          <label>
            Note <span className="subtle">optional</span>
            <textarea
              name="note"
              placeholder="A little context, if you like"
              maxLength={500}
              defaultValue={entry?.note}
            />
          </label>
        </details>
        {type === "adjustment" && (
          <ChoiceField
            label="Direction"
            name="direction"
            defaultValue={entry && entry.amount < 0 ? "decrease" : "increase"}
            options={[
              { value: "increase", label: "Increase balance" },
              { value: "decrease", label: "Decrease balance" },
            ]}
          />
        )}
        {type === "adjustment" && (
          <p className="caption">
            Corrects an account balance. It is excluded from income and
            spending.
          </p>
        )}
        {type === "expense" && !sharedOnly && (
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="shared"
              defaultChecked={entry?.shared}
            />
            <Users size={18} />
            <span>
              <strong>Share with household</strong>
              <small>
                {householdConnected
                  ? "Only this expense. Your account balance stays private."
                  : "Saved on this phone. Connect your family to sync shared expenses."}
              </small>
            </span>
          </label>
        )}
        <button className="primary wide" disabled={busy || entry?.deleted}>
          {busy
            ? "Saving…"
            : entry
              ? "Save changes"
              : suggestion
                ? "Label & save"
                : "Save transaction"}
          <Check size={17} />
        </button>
        {onDelete && (
          <button
            className="danger-button wide"
            type="button"
            disabled={busy}
            onClick={onDelete}
          >
            {entry?.deleted ? <RefreshCw size={15} /> : <Trash2 size={15} />}{" "}
            {entry?.deleted ? "Restore transaction" : "Delete transaction"}
          </button>
        )}
        <button
          className="composer-back text-button"
          data-record-back={!entry && !suggestion ? "true" : undefined}
          type="button"
          onClick={() => setStage("amount")}
        >
          <ChevronLeft size={14} /> Back to amount
        </button>
      </div>
    </form>
  );
}
function AccountForm({
  busy,
  onSave,
  account,
  accounts,
}: {
  busy: boolean;
  onSave: (a: Account) => void;
  account?: Account;
  accounts: Account[];
}) {
  const [type, setType] = useState<Account["type"]>(account?.type || "bank"),
    [color, setColor] = useState(
      account ? accountColour(account) : newAccountColour("bank", accounts),
    ),
    [colourChosen, setColourChosen] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="account-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const f = new FormData(e.currentTarget);
          const name = String(f.get("name")).trim();
          if (!name) throw new Error("Enter an account name.");
          const raw = String(f.get("balance") || "0");
          const opening = /^0(?:\.0{1,2})?$/.test(raw) ? 0 : amountOf(raw);
          onSave({
            id: account?.id || uid(),
            name,
            type,
            opening: account
              ? account.opening
              : type === "card"
                ? -opening
                : opening,
            color,
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <p className="dialog-intro">
        {account
          ? "Choose a name and colour that are easy to recognise."
          : "A place for the money you have, or the credit you use."}
      </p>
      {!account && (
        <ChoiceField
          label="Account type"
          value={type}
          onChange={(v) => {
            const next = v as Account["type"];
            setType(next);
            if (!colourChosen) setColor(newAccountColour(next, accounts));
          }}
          options={[
            { value: "bank", label: "Bank account" },
            { value: "cash", label: "Cash" },
            { value: "wallet", label: "Wallet" },
            { value: "card", label: "Credit card" },
          ]}
        />
      )}
      <label>
        Account name
        <input
          name="name"
          required
          maxLength={50}
          placeholder="e.g. My savings account"
          defaultValue={account?.name}
        />
      </label>
      <AccountColour
        value={color}
        onChange={(colour) => {
          setColourChosen(true);
          setColor(colour);
        }}
      />
      {!account && (
        <MoneyField
          name="balance"
          label={
            type === "card"
              ? "Amount currently owed (₹)"
              : "Current balance (₹)"
          }
          defaultValue="0"
        />
      )}
      {!account && (
        <p className="caption">
          This is your starting point. County does not connect to or move money
          from your bank.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <button className="primary wide" disabled={busy}>
        {account ? "Save account" : "Add account"} <Plus size={17} />
      </button>
    </form>
  );
}
function CloudSettings({
  user,
  data,
  busy,
  online,
  attempt,
  onSync,
  onRestore,
  lastSync,
}: {
  user: string | null;
  data: Data;
  busy: boolean;
  online: boolean;
  attempt: (fn: () => Promise<void>) => Promise<void>;
  onSync: () => Promise<void>;
  onRestore: (d: Data, r: number) => Promise<void>;
  lastSync: string;
}) {
  return (
    <div className="settings-section">
      <h3>Private cloud backup</h3>
      {!cloud ? (
        <div className="info-box">
          <WifiOff size={20} />
          <span>
            Cloud backup is unavailable in this build. Your records remain saved
            on this device.
          </span>
        </div>
      ) : !user ? (
        <>
          <p className="caption">
            Sign in to connect your family and keep a private cloud backup. Your
            signed-in device can keep tracking offline.
          </p>
          <EmailSignIn busy={busy} attempt={attempt} />
        </>
      ) : (
        <>
          <p className="caption">
            {online
              ? "Connected to your account"
              : "Offline · connect to use cloud backups"}
            {lastSync ? " · Last synced " + lastSync : ""}
          </p>
          <button
            className="setting-row"
            disabled={busy || !online}
            onClick={() => void attempt(onSync)}
          >
            <RefreshCw size={18} />
            <div>
              <strong>Sync & back up now</strong>
              <small>Private records stay private</small>
            </div>
          </button>
          <button
            className="setting-row"
            disabled={busy || !online}
            onClick={() =>
              void attempt(async () => {
                const remote = await rpc<{
                  payload: Data;
                  revision: number;
                } | null>("get_backup");
                if (!remote) throw new Error("No cloud backup exists yet.");
                const validated = readBackup(JSON.stringify(remote.payload));
                await onRestore(validated, remote.revision);
              })
            }
          >
            <Download size={18} />
            <div>
              <strong>Restore cloud backup</strong>
              <small>Review a saved copy before restoring</small>
            </div>
          </button>
        </>
      )}
      <p className="caption">{data.entries.length} records on this device</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
