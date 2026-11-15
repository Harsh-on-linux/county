import { useState } from "react";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { cloud } from "../cloud";

export function EmailSignIn({
  busy,
  attempt,
}: {
  busy: boolean;
  attempt: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [sent, setSent] = useState(false),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  return (
    <form
      className="family-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        void attempt(async () => {
          try {
            if (!cloud)
              throw new Error("Family sync is not connected in this build.");
            if (sent) {
              const result = await cloud.auth.verifyOtp({
                email: email.trim(),
                token: code.trim(),
                type: "email",
              });
              if (result.error) throw result.error;
            } else {
              const result = await cloud.auth.signInWithOtp({
                email: email.trim(),
              });
              if (result.error) throw result.error;
              setSent(true);
            }
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      {sent ? (
        <>
          <p className="signin-code-note">
            Enter the sign-in code sent to <strong>{email}</strong>.
          </p>
          <label>
            Email code
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
          </label>
        </>
      ) : (
        <label>
          Your email
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary wide" disabled={busy}>
        {busy ? "Please wait…" : sent ? "Verify code" : "Send sign-in code"}
        <ArrowRight size={16} />
      </button>
      {sent && (
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={() => {
            setSent(false);
            setCode("");
            setError("");
          }}
        >
          <ChevronLeft size={14} />
          Use another email
        </button>
      )}
    </form>
  );
}
