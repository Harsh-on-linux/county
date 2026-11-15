import { LockKeyhole, WifiOff } from "lucide-react";
import { cloud } from "../cloud";
import { BrandMark } from "./BrandMark";
import { EmailSignIn } from "./EmailSignIn";

export function SignInScreen({
  busy,
  attempt,
  online,
  error,
}: {
  busy: boolean;
  online: boolean;
  error: string;
  attempt: (fn: () => Promise<void>) => Promise<void>;
}) {
  return (
    <main className="signin-screen">
      <div className="signin-panel">
        <div className="signin-brand">
          <BrandMark />
          <span>
            county<span className="accent">.</span>
          </span>
        </div>
        <span className="eyebrow">YOUR OWN SPACE</span>
        <h1>
          Your money.
          <br />
          Your account.
        </h1>
        <p>
          Sign in with an email code. Each person gets a private account, with
          shared expenses kept together as a family.
        </p>
        {!online ? (
          <div className="info-box">
            <WifiOff size={20} />
            <span>
              Connect to the internet to sign in for the first time. Once signed
              in, you can keep tracking offline.
            </span>
          </div>
        ) : !cloud ? (
          <div className="info-box">
            <LockKeyhole size={20} />
            <span>
              Sign-in is not connected in this build. Install the configured
              County app to continue.
            </span>
          </div>
        ) : (
          <EmailSignIn busy={busy} attempt={attempt} />
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="signin-privacy">
          <LockKeyhole size={15} />
          <span>
            Your balances stay private. Only expenses you mark for your family
            are shared. A private backup belongs to your account.
          </span>
        </div>
      </div>
    </main>
  );
}
