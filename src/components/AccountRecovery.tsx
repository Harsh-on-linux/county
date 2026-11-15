import { useState } from "react";
import { ArrowRight, Download, ShieldCheck, Upload } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { PrismSurface } from "./PrismSurface";
import { readBackup, type Data } from "../domain";
import type { PrivateBackup } from "../cloud";

export function AccountRecovery({
  backup,
  missing,
  error,
  busy,
  onRetry,
  onRestore,
  onKeep,
  onSetup,
  onImport,
}: {
  backup: PrivateBackup | null;
  missing: boolean;
  error: string;
  busy: boolean;
  onRetry: () => void;
  onRestore: () => void;
  onKeep: () => void;
  onSetup: () => void;
  onImport: (data: Data) => Promise<void>;
}) {
  const [fileError, setFileError] = useState("");
  return (
    <main className="signin-screen account-recovery-screen">
      <div className="signin-panel">
        <div className="signin-brand">
          <BrandMark />
          <span>
            county<span className="accent">.</span>
          </span>
        </div>
        <span className="eyebrow">SIGNED IN · YOUR PRIVATE SPACE</span>
        <h1>
          {error
            ? "Let’s reconnect."
            : backup
              ? "Your saved space."
              : missing
                ? "No saved backup found."
                : "Finding your space."}
        </h1>
        {error ? (
          <>
            <p>
              We couldn’t check your saved records. Your phone’s setup and cloud
              copy have not been replaced.
            </p>
            <p className="error" role="alert">
              {error}
            </p>
            <button className="primary wide" disabled={busy} onClick={onRetry}>
              Try again <ArrowRight size={18} />
            </button>
          </>
        ) : backup ? (
          <>
            <p>
              Welcome back. Restore your saved County accounts and records, or
              keep the setup on this phone.
            </p>
            <section
              className="recovery-backup-card"
              aria-label="Saved account backup"
            >
              <PrismSurface tone="ink" />
              <strong>{backup.payload.name || "Your County space"}</strong>
              <div>
                <span>
                  <b>{backup.payload.accounts.length}</b>{" "}
                  {backup.payload.accounts.length === 1
                    ? "account"
                    : "accounts"}
                </span>
                <span>
                  <b>
                    {
                      backup.payload.entries.filter((entry) => !entry.deleted)
                        .length
                    }
                  </b>{" "}
                  {backup.payload.entries.filter((entry) => !entry.deleted)
                    .length === 1
                    ? "record"
                    : "records"}
                </span>
              </div>
              <small>
                <ShieldCheck size={15} /> Only your private backup
              </small>
            </section>
            <p className="recovery-note">
              Restoring replaces this phone’s setup. Keeping this phone’s data
              pauses cloud backup, so your saved copy stays safe.
            </p>
            <button
              className="primary wide"
              disabled={busy}
              onClick={onRestore}
            >
              <Download size={18} />{" "}
              {busy ? "Restoring…" : "Restore saved space"}
            </button>
            <button className="secondary wide" disabled={busy} onClick={onKeep}>
              Keep this phone’s data
            </button>
          </>
        ) : missing ? (
          <>
            <p>
              Your email is verified, but there is no cloud backup saved for
              this account. Reinstalling removes records stored only on the
              phone.
            </p>
            <p className="recovery-note">
              If you exported a County backup, import it below. Otherwise, you
              can set up this phone again.
            </p>
            <label className="secondary wide recovery-import">
              <Upload size={18} /> Import a County backup
              <input
                type="file"
                accept=".json,application/json"
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setFileError("");
                  try {
                    await onImport(readBackup(await file.text()));
                  } catch (cause) {
                    setFileError((cause as Error).message);
                  }
                  event.target.value = "";
                }}
              />
            </label>
            {fileError && (
              <p className="error" role="alert">
                {fileError}
              </p>
            )}
            <button className="primary wide" disabled={busy} onClick={onSetup}>
              Set up this phone <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <p className="recovery-check" role="status">
            <span className="startup-progress" aria-hidden="true" /> Checking
            for your saved accounts and records…
          </p>
        )}
      </div>
    </main>
  );
}
