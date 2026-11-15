import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CreditCard,
  Landmark,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  WifiOff,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { amountOf, money, uid, type Account, type Data } from "../domain";
import { save, isAndroid } from "../storage";
import { App as CapacitorApp } from "@capacitor/app";
import "./onboarding.css";
import { MoneyField } from "./MoneyField";

function WelcomeArt() {
  return (
    <div className="welcome-art" aria-hidden="true">
      <div className="welcome-orbit orbit-a" />
      <div className="welcome-orbit orbit-b" />
      <div className="welcome-float float-income">
        <span>
          <ArrowRight size={14} />
        </span>
        <div>
          Money in<strong>+ ₹32,000</strong>
        </div>
        <Check size={13} />
      </div>
      <div className="welcome-money-card">
        <div className="art-card-header">
          <Wallet size={17} strokeWidth={1.5} />
          <span>YOUR EVERYDAY MONEY</span>
          <span className="art-card-dot" />
        </div>
        <small>A little more in control.</small>
        <strong>
          ₹24,850<span>.00</span>
        </strong>
        <div className="art-card-line" />
        <div className="art-card-footer">
          <span>
            <ShieldCheck size={12} /> Personal space
          </span>
          <span>•••• 0084</span>
        </div>
      </div>
      <div className="welcome-float float-expense">
        <span>
          <Wallet size={17} />
        </span>
        <div>
          Groceries<strong>₹850</strong>
        </div>
        <small>Just recorded</small>
      </div>
      <span className="welcome-spark spark-a">✳</span>
      <span className="welcome-spark spark-b">✦</span>
      <span className="art-example">
        An illustration of your everyday money
      </span>
    </div>
  );
}

function SpacesArt() {
  return (
    <div className="spaces-art" aria-hidden="true">
      <div className="spaces-orbit" />
      <div className="space-illustration personal-illustration">
        <span className="space-icon">
          <LockKeyhole size={22} />
        </span>
        <span>JUST FOR YOU</span>
        <strong>Your space.</strong>
        <div className="illustration-bars">
          <i />
          <i />
          <i />
        </div>
        <small>
          <ShieldCheck size={12} /> Private balances
        </small>
      </div>
      <div className="space-connector">
        <Plus size={20} />
      </div>
      <div className="space-illustration family-illustration">
        <span className="space-icon">
          <Users size={23} />
        </span>
        <span>FOR YOUR PEOPLE</span>
        <strong>Our home.</strong>
        <div className="illustration-people">
          <i>M</i>
          <i>D</i>
          <i>Y</i>
        </div>
        <small>Only what you choose to share</small>
      </div>
    </div>
  );
}

export function Onboarding({
  data,
  preview = false,
  onComplete,
  onClose,
}: {
  data: Data;
  preview?: boolean;
  onComplete: (data: Data) => void;
  onClose?: () => void;
}) {
  const [step, setStep] = useState(0),
    [direction, setDirection] = useState("forward"),
    [name, setName] = useState(data.name),
    [type, setType] = useState<Account["type"]>("cash"),
    [accountName, setAccountName] = useState("Cash"),
    [opening, setOpening] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [prepared, setPrepared] = useState<Data | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step, prepared]);
  useEffect(() => {
    if (!isAndroid) return;
    const listener = CapacitorApp.addListener("backButton", () => {
      if (prepared) onComplete(prepared);
      else if (step > 0) go(step - 1);
      else if (preview) onClose?.();
      else void CapacitorApp.exitApp();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [step, prepared, preview, onComplete, onClose]);
  function go(next: number) {
    setDirection(next > step ? "forward" : "back");
    setError("");
    setStep(next);
  }
  async function finish() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const cleanName = name.trim();
      if (!cleanName)
        throw new Error("Tell us what you would like to be called.");
      const cleanAccount = accountName.trim();
      if (!cleanAccount) throw new Error("Give your account a name.");
      const value =
        opening.trim() === "" || /^0(?:\.0{1,2})?$/.test(opening.trim())
          ? 0
          : amountOf(opening.trim());
      const next: Data = preview
        ? data
        : {
            ...data,
            name: cleanName,
            onboarded: true,
            accounts: data.accounts.length
              ? data.accounts
              : [
                  {
                    id: uid(),
                    name: cleanAccount,
                    type,
                    opening: type === "card" ? -value : value,
                  },
                ],
          };
      if (!preview) await save(next);
      setPrepared(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="onboarding-shell">
      <aside className="onboarding-editorial">
        <div className="onboarding-wordmark">
          <BrandMark />
          county<span>.</span>
        </div>
        <div>
          <span className="onboarding-kicker">A LITTLE CLARITY, EVERY DAY</span>
          <h2>
            For the life
            <br />
            you’re living.
          </h2>
          <p>
            The small spends. The big plans.
            <br />
            And the people you share them with.
          </p>
        </div>
        <div className="editorial-bottom">
          <span>Made for your everyday.</span>
        </div>
      </aside>
      <main className="onboarding-main">
        <header className="onboarding-header">
          <div className="onboarding-wordmark">
            <BrandMark />
            county<span>.</span>
          </div>
          {preview ? (
            <button className="onboarding-text-button" onClick={onClose}>
              Close preview
            </button>
          ) : step > 0 && !prepared ? (
            <button
              className="onboarding-back"
              onClick={() => go(step - 1)}
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <span className="onboarding-header-note">
              <WifiOff size={13} /> Offline ready
            </span>
          )}
        </header>
        {preview && (
          <div className="onboarding-preview-note">
            Welcome tour preview · your records stay unchanged
          </div>
        )}
        {prepared ? (
          <section
            className="onboarding-ready"
            aria-labelledby="onboarding-ready-heading"
          >
            <div className="ready-emblem">
              <Check size={44} strokeWidth={1.7} />
            </div>
            <span className="onboarding-kicker">A FRESH START</span>
            <h1 id="onboarding-ready-heading" tabIndex={-1} ref={heading}>
              {preview
                ? "Make room for clarity."
                : `You’re home, ${name.trim()}.`}
            </h1>
            <p>
              {preview
                ? "A quieter way to keep up with your everyday money."
                : "Your space is ready. Start small. It all adds up."}
            </p>
            <div className="ready-account">
              <span>
                <Wallet size={21} />
              </span>
              <div>
                <small>
                  {preview ? "A space of your own" : prepared.accounts[0]?.name}
                </small>
                <strong>
                  {preview
                    ? "Personal. Always."
                    : money(prepared.accounts[0]?.opening || 0, true)}
                </strong>
              </div>
              <ShieldCheck size={19} />
            </div>
            <button
              className="onboarding-cta"
              onClick={() => onComplete(prepared)}
            >
              {preview ? "Back to County" : "Open my space"}
              <ArrowRight size={19} />
            </button>
            <span className="onboarding-footnote">
              <ShieldCheck size={13} />{" "}
              {preview
                ? "Your existing records are unchanged."
                : "Saved on this device. Ready when you are."}
            </span>
          </section>
        ) : (
          <section
            className={`onboarding-step ${direction}`}
            key={step}
            aria-labelledby="onboarding-heading"
          >
            <div
              className="onboarding-progress"
              aria-label={`Step ${step + 1} of 3`}
            >
              {[0, 1, 2].map((i) => (
                <span className={i <= step ? "done" : ""} key={i} />
              ))}
            </div>
            {step === 0 ? (
              <>
                <WelcomeArt />
                <div className="onboarding-copy">
                  <span className="onboarding-kicker">
                    MEET YOUR EVERYDAY MONEY COMPANION
                  </span>
                  <h1 id="onboarding-heading" tabIndex={-1} ref={heading}>
                    Your money.
                    <br />
                    In a good place<span>.</span>
                  </h1>
                  <p>
                    A clearer view of what comes in, what goes out,
                    <br className="onboarding-desktop-break" /> and what’s yours
                    to enjoy.
                  </p>
                </div>
                <div className="onboarding-actions">
                  <button className="onboarding-cta" onClick={() => go(1)}>
                    Find your clarity <ArrowRight size={19} />
                  </button>
                  <span className="onboarding-footnote">
                    No bank login. No internet needed to get started.
                  </span>
                </div>
              </>
            ) : step === 1 ? (
              <>
                <SpacesArt />
                <div className="onboarding-copy">
                  <span className="onboarding-kicker">
                    PERSONAL MONEY. SHARED MOMENTS.
                  </span>
                  <h1 id="onboarding-heading" tabIndex={-1} ref={heading}>
                    Together, on
                    <br />
                    your terms<span>.</span>
                  </h1>
                  <p>
                    Your accounts stay private. Share selected expenses
                    <br className="onboarding-desktop-break" /> with your family
                    when you’re ready.
                  </p>
                </div>
                <div className="onboarding-actions">
                  <button className="onboarding-cta" onClick={() => go(2)}>
                    Make it yours <ArrowRight size={19} />
                  </button>
                  <button
                    className="onboarding-text-button"
                    onClick={() => go(2)}
                  >
                    Set up just for me <ChevronRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="onboarding-setup-copy">
                  <span className="onboarding-kicker">
                    YOUR SPACE, YOUR STARTING POINT
                  </span>
                  <h1 id="onboarding-heading" tabIndex={-1} ref={heading}>
                    Let’s make
                    <br />
                    room for you<span>.</span>
                  </h1>
                  <p>A name and one account. That’s all you need.</p>
                </div>
                <form
                  className="onboarding-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void finish();
                  }}
                >
                  <label>
                    What should we call you?
                    <input
                      autoComplete="given-name"
                      disabled={saving}
                      placeholder="Your first name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={40}
                    />
                  </label>
                  <fieldset disabled={saving}>
                    <legend>Your first account</legend>
                    <div className="onboarding-account-types">
                      {(
                        [
                          { value: "cash", label: "Cash", icon: Wallet },
                          { value: "bank", label: "Bank", icon: Landmark },
                          { value: "wallet", label: "Wallet", icon: Sparkles },
                          { value: "card", label: "Credit", icon: CreditCard },
                        ] as const
                      ).map(({ value, label, icon: Icon }) => (
                        <button
                          type="button"
                          key={value}
                          className={type === value ? "selected" : ""}
                          aria-pressed={type === value}
                          onClick={() => {
                            setType(value);
                            setAccountName(
                              {
                                cash: "Cash",
                                bank: "My bank",
                                wallet: "My wallet",
                                card: "Credit card",
                              }[value],
                            );
                          }}
                        >
                          <Icon size={19} />
                          <span>{label}</span>
                          {type === value && <Check size={11} />}
                        </button>
                      ))}
                    </div>
                    <label>
                      Account name
                      <input
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        maxLength={50}
                        required
                      />
                    </label>
                    <MoneyField
                      label={
                        type === "card"
                          ? "Amount currently owed"
                          : "Starting balance"
                      }
                      value={opening}
                      onChange={setOpening}
                      disabled={saving}
                    />
                    <p className="onboarding-field-note">
                      An estimate is fine. You can adjust it later.
                    </p>
                  </fieldset>
                  {error && (
                    <p className="onboarding-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="onboarding-cta"
                    disabled={saving}
                    type="submit"
                  >
                    {saving
                      ? "Preparing your space…"
                      : preview
                        ? "Preview my space"
                        : "Create my space"}
                    {saving ? (
                      <span className="onboarding-spinner" />
                    ) : (
                      <ArrowRight size={19} />
                    )}
                  </button>
                  <span className="onboarding-footnote">
                    <LockKeyhole size={12} /> Private by default. No permissions
                    asked.
                  </span>
                </form>
              </>
            )}
          </section>
        )}
        <footer className="onboarding-bottom-note">
          A little more peace of mind.
        </footer>
      </main>
    </div>
  );
}
