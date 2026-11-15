import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Copy,
  Plus,
  Share2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Share } from "@capacitor/share";
import { cloud, rpc, type Household, type Member } from "../cloud";
import { isAndroid } from "../storage";
import { EmailSignIn } from "./EmailSignIn";

export function FamilySettings({
  user,
  group,
  members,
  name,
  busy,
  attempt,
  refresh,
}: {
  user: string | null;
  group: Household | null;
  members: Member[];
  name: string;
  busy: boolean;
  attempt: (fn: () => Promise<void>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const [mode, setMode] = useState("choose"),
    [invite, setInvite] = useState(""),
    [copied, setCopied] = useState(false),
    [error, setError] = useState(""),
    [removing, setRemoving] = useState<Member | null>(null);
  function act(fn: () => Promise<void>) {
    setError("");
    void attempt(async () => {
      try {
        await fn();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }
  const privacy = (
    <p className="family-privacy">
      <ShieldCheck size={14} /> Only expenses you choose to share appear in your
      family. Your balances and personal records stay private.
    </p>
  );
  if (!navigator.onLine)
    return (
      <>
        <p className="family-intro">
          Connect to the internet to sign in, invite someone, or manage your
          family. Previously synced expenses remain available offline.
        </p>
        {privacy}
      </>
    );
  if (!cloud)
    return (
      <>
        <p className="family-intro">
          Everyone gets their own private space, with one place for shared
          spending.
        </p>
        <ol className="family-steps">
          <li>Create a family on your phone.</li>
          <li>Send an invitation code to Mom, Dad, or your sister.</li>
          <li>They sign in on their own phones and join with the code.</li>
        </ol>
        <div className="info-box">
          <Users size={20} />
          <span>
            Family sync is not connected in this build yet. Shared expenses are
            still saved on this phone.
          </span>
        </div>
        {privacy}
      </>
    );
  if (!user)
    return (
      <>
        <p className="family-intro">
          Sign in to create or join your family. Each person uses their own
          email and phone.
        </p>
        <EmailSignIn busy={busy} attempt={attempt} />
        {privacy}
      </>
    );
  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {group ? (
        <>
          <p className="family-intro">
            {group.name} · {members.length}{" "}
            {members.length === 1 ? "member" : "members"}
          </p>
          <div className="family-members">
            {members.map((m) => (
              <div className="payer-row" key={m.user_id}>
                <span className="avatar">{m.name.slice(0, 1)}</span>
                <div className="family-member-info">
                  <strong>
                    {m.name}
                    {m.user_id === user ? " · You" : ""}
                  </strong>
                  <small>
                    {m.user_id === group.owner ? "Owner" : "Member"}
                  </small>
                </div>
                {group.owner === user && m.user_id !== user && (
                  <button
                    className="icon-button"
                    aria-label={"Remove " + m.name}
                    disabled={busy}
                    onClick={() => setRemoving(m)}
                  >
                    <span className="member-remove-label">Remove</span>
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {removing && (
            <div className="family-remove" role="alert">
              <p>
                Remove {removing.name} from your family? They will lose access
                to future updates. Existing shared payments stay in your
                history.
              </p>
              <div>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setRemoving(null)}
                >
                  Cancel
                </button>
                <button
                  className="danger-button"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await rpc("remove_member", {
                        member_id: removing.user_id,
                      });
                      await refresh();
                      setRemoving(null);
                    })
                  }
                >
                  Remove member
                </button>
              </div>
            </div>
          )}
          {group.owner === user ? (
            <>
              <button
                className="secondary wide"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    setInvite(await rpc<string>("create_invite"));
                    setCopied(false);
                  })
                }
              >
                <Plus size={16} />
                {invite
                  ? "Create another invitation"
                  : "Invite a family member"}
              </button>
              {invite && (
                <div className="family-invite">
                  <label>
                    Single-use invitation · expires in 24 hours
                    <textarea
                      rows={2}
                      spellCheck={false}
                      aria-label="Family invitation code"
                      readOnly
                      value={invite}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </label>
                  <div className="family-invite-actions">
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        act(async () => {
                          await navigator.clipboard.writeText(invite);
                          setCopied(true);
                        })
                      }
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copied" : "Copy code"}
                    </button>
                    {isAndroid && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await Share.share({
                              title: "Join our family on County",
                              text: `Open County, go to Our home, and choose Join a family.\nInvitation code: ${invite}\nThis code works once and expires in 24 hours.`,
                            });
                          })
                        }
                      >
                        <Share2 size={15} />
                        Share invitation
                      </button>
                    )}
                  </div>
                  <p className="caption">
                    On their phone: Our home → Connect your family → Join a
                    family.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="caption">
              The family owner can invite or remove members.
            </p>
          )}
        </>
      ) : mode === "choose" ? (
        <>
          <p className="family-intro">
            Set up a shared space, or join the one your family already uses.
          </p>
          <div className="family-options">
            <button className="family-option" onClick={() => setMode("create")}>
              <Users />
              <span>
                <strong>Create a family</strong>
                <small>Start here, then invite your people.</small>
              </span>
              <ArrowRight />
            </button>
            <button className="family-option" onClick={() => setMode("join")}>
              <Plus />
              <span>
                <strong>Join a family</strong>
                <small>Use an invitation code from your family.</small>
              </span>
              <ArrowRight />
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            className="text-button family-back"
            disabled={busy}
            onClick={() => {
              setMode("choose");
              setError("");
            }}
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <form
            className="family-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              act(async () => {
                if (mode === "create") {
                  const familyName = String(f.get("name")).trim();
                  if (!familyName) throw new Error("Give your family a name.");
                  await rpc("create_household", {
                    household_name: familyName,
                    member_name: name,
                  });
                } else {
                  const code = String(f.get("code"))
                    .replace(/[\s-]/g, "")
                    .toLowerCase();
                  if (!/^[a-f0-9]{32}$/.test(code))
                    throw new Error(
                      "Paste the complete 32-character invitation code.",
                    );
                  await rpc("accept_invite", {
                    invite_code: code,
                    member_name: name,
                  });
                }
                await refresh();
                setMode("choose");
              });
            }}
          >
            {mode === "create" ? (
              <label>
                Family name
                <input
                  name="name"
                  required
                  maxLength={60}
                  defaultValue="Our home"
                  autoFocus
                />
              </label>
            ) : (
              <>
                <label>
                  Invitation code
                  <input
                    name="code"
                    required
                    placeholder="Paste the invitation code"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                  />
                </label>
                <p className="caption">
                  Codes work once and expire after 24 hours. Ask the family
                  owner for a new one if yours has expired.
                </p>
              </>
            )}
            <button className="primary wide" disabled={busy}>
              {busy
                ? "Connecting…"
                : mode === "create"
                  ? "Create family"
                  : "Join family"}
              <ArrowRight size={16} />
            </button>
          </form>
        </>
      )}
      {privacy}
    </>
  );
}
