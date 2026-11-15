# County

An offline Android money tracker for a family pilot. React + TypeScript, Vite, and Capacitor 8, with optional Supabase authentication, private backup, and household sharing. The supplied logo has been reconstructed as a transparent vector mark, with theme-aware in-app SVG, standalone dark/light SVG assets, an adaptive Android icon, and a vector splash mark. The selected display face is Manila Black, paired with locally bundled Inter for controls and financial figures. The colour palette remains provisional.

Brand assets: `public/brand/`, shared React mark: `src/components/BrandMark.tsx`, visual reference sheet: `design/county-brand-preview.png`. The original image is preserved in `design/references/logo-original.png` for reference only; it is not used in the app.

The current visual direction uses paper/ink surfaces, an orange signal colour, and subtle violet/silver gradients. The mobile navigation is a floating space switcher plus Record control; tap the current space to move between Overview, The ledger, Our home, and Patterns. The navigation and Record action sit on separate floating islands with an approximately 60:40 width split.

Every money field uses County's in-app number pad, including onboarding, opening balances, transaction edits, SMS suggestions, transfers, and adjustments. Tap the amount to reopen it. A new record starts with its amount, then collects account/category/date/sharing details before saving; Back to amount keeps those details. Physical number keys and paste are also supported on PC. The spending-day calendar is live: tap a day to filter the personal ledger.

Cold starts use a locally bundled Anime.js timeline: a front-facing mark rises from below, holds briefly, then its central star opens and enlarges to reveal the actual app. Backgrounds are flat paper/ink; the mark never rotates or deforms. Skip/Escape finish immediately; reduced motion uses a stationary mark and brief fade. Settings → Replay coin intro replays it without changing records. Timing and rationale are in design/OPENING-MOTION.md. Home uses one visible logo lockup in its header; Record uses a plus icon.

The available-money card has a slow flowing satin gradient in pearl/lilac for light theme and graphite/violet for dark theme. Its balance and controls stay stationary. Motion pauses while the card is offscreen, the app is hidden, a modal is open, or the intro is playing. Reduced motion keeps a static surface. No external media or runtime network request is needed.

## Run locally

Requires Node 22+.

For everyday testing on this Windows PC, open PowerShell in the County folder and run:

```powershell
npm.cmd run pc
```

This builds the current production app and serves it at `http://127.0.0.1:4173`. Keep the terminal open while testing; Ctrl+C stops the server. Use the same browser and address each time to retain your test records. If a preview server is already running, the command prints its address instead of starting a second server.

In Chrome/Edge, press F12, then Ctrl+Shift+M for the phone-sized view. Choose a phone preset or use a 390 × 844 viewport. You can test accounts, transactions, household-tagged local entries, reports, themes, export, restore, and persistence here. To check offline reload, first let the app load online; in developer tools choose Network → Offline, reload, and record a transaction. Return Network to No throttling afterwards. Do not clear browser site data unless you intend to remove local test records.

For the actual Android app on this PC, open the `android` project in Android Studio, create a virtual phone under Tools → Device Manager, start it, and run the app using the Run button. Build/sync the latest assets with `npm run android:sync` first. The browser preview does not exercise native SMS permissions, device credential lock, or Android share sheets. Emulator checks can cover those Android flows with simulated messages; actual bank-message coverage and delivery still need a real phone. Family sync requires the backend setup described below, in either environment.

```powershell
npm install
npm run dev
```

Open the URL printed by Vite. Native SMS, device lock, and Android share sheets are available only inside the Android app. The production browser preview also supports offline reload after its first online visit:

```powershell
npm run build
node scripts/preview.mjs
```

Open `http://127.0.0.1:4173`. The development server does not install the offline service worker.

## Android

Requires JDK 21, Android SDK platform 36, and Android build tools. Set `JAVA_HOME` and `ANDROID_HOME` to those installations, or open `android` in Android Studio.

```powershell
npm run android:sync
.\android\gradlew.bat -p android assembleDebug
```

The installable debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. It is a private test build, not a Play Store release. Minimum Android version: Android 7 (API 24). The first build downloads Gradle and Android dependencies. A JDK 21 was downloaded to the ignored `.tools` directory during implementation; it is a local build convenience, not an app dependency or part of source control.

The native plugin asks for `READ_SMS` only when the user taps **Review recent bank messages**. It scans up to 10,000 inbox messages from the last 90 days. Parsing runs locally; raw bodies are not saved to County or sent to the server. SMS IDs are hashes of message content and time, so restore to a different phone does not confuse provider IDs. Messages are not monitored in the background. Denying permission leaves manual tracking usable. Google Play SMS permission approval is a separate release requirement.

Device lock uses Android's secure device credential confirmation. Android screenshots/recent-app previews are blocked with `FLAG_SECURE`. Local data lives in the app's private preferences; this is not application-level encrypted storage. Uninstalling/clearing the app removes local records, so export or enable cloud backup first. Android automatic OS backup is disabled to keep backup behaviour explicit.

## Connect family sync and cloud backup

No cloud project is provisioned and no credentials are bundled. Without configuration, County accurately displays **On this device**; household-tagged entries are local previews.

1. Create a Supabase project and execute `supabase/schema.sql` once in its SQL editor.
2. Enable email authentication. Set the **Magic Link** email template to include `{{ .Token }}`; County verifies an email code directly rather than depending on a redirect back into Android. Configure a production email provider before inviting the family.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's public URL and publishable/anon key. Never use a service-role key in this app.
4. Rebuild and run `npm run android:sync`. Sign in separately on each phone under **Settings & backup**.
5. You create the household, generate a single-use invitation, and share that code with Mom and Dad. Codes expire after 24 hours. Members accept through **Household → Connect your family**. Add Sister the same way later.

The first account signed in on a device is bound to its local ledger, preventing another account from uploading those private records. Use the same account to sign back in on that device.

### What sync does

- Private accounts, transactions, and preferences back up only to their owner's row. Backups are protected by database authorization and transport encryption; they are **not end-to-end encrypted**.
- The household receives a field allowlist: expense amount, category, payee, note, date, payer, and deletion state. It never receives personal account identifiers, balances, SMS IDs, income, or unrelated records.
- An expense is stored once in the local ledger, with a household projection. Creator and household owner can edit shared records; other members can view them. Owner changes flow back to the creator's ledger while retaining its private account association.
- Offline household edits are saved in a durable outbox, including owner edits to another member’s expense. Sync runs after changes, on reconnection, every minute while the app is open, and manually. It does not run as an Android background service.
- Version checks prevent silent overwrite. A shared-entry conflict shows both versions and asks which to keep. A cloud-backup conflict asks you to export local records before restoring the remote backup. Private backup is a recovery snapshot, not a live merge of personal ledgers across multiple phones.
- Invitations and membership require connectivity. Removed members lose server access on their next request; cached records on an offline device cannot be remotely erased. The next successful refresh clears its household view.
- Tables have RLS enabled, no direct client access, and tightly scoped security-definer RPCs. There are no public storage buckets.

## Everyday features

- A full-screen welcome flow with animated brand and money illustrations, privacy/household explanation, name and first-account setup, and a saved-state confirmation. Returning users get a brief cold-start reveal rather than repeating setup. Settings → Replay welcome tour previews the flow without changing existing records. Motion respects the system reduced-motion preference; Android Back navigates onboarding steps.
- Private cash, bank, wallet, and credit-card accounts; opening balances and signed adjustments.
- Expenses, income, and transfers. Card repayments and cash withdrawals are transfers, not a second expense.
- Optional household visibility for expenses; spending and payer totals without debts or splitting.
- Search, month/account/category/type filters, custom categories, editing, soft deletion, restore, category breakdown, and weekly insights.
- SMS review with manual correction, duplicate warnings, matching to existing entries, dismissal, and no automatic posting.
- CSV export with spreadsheet-formula escaping; complete validated JSON backup and restore. Exports contain plain-text financial information: store them privately.
- Light, dark, and system themes; responsive phone layout and desktop preview; keyboard-accessible forms and modal focus handling.

Amounts are integer paise; currency is INR and number formatting is Indian English. Only expenses are shared. Business spaces, budgets, recurring bills, investments, and expense splitting remain outside this first release.

## Verification

```powershell
npm test
npm run build
npm run test:e2e
```

The browser checks currently use installed Windows Chrome; change `launchOptions.executablePath` in `playwright.config.ts` for another machine. They test onboarding, balances, offline reload, sharing visibility, deletion/restore, and light/dark layouts, and write screenshots to ignored `test-results/`.

Tests use PGlite to execute the actual PostgreSQL schema and verify membership, invitations, edit authorization, private-field filtering, RLS/table denial, member removal, and backup revision checks. The test harness substitutes only Supabase's auth context. No live project is needed for these tests.

Before the family pilot, configure the backend and verify on real phones: email delivery, two-device sync, airplane-mode edits/reconnection, the family's actual bank SMS formats, device lock/cancellation, and Android backup/share/restore. Those native/live service checks cannot be substituted by browser or embedded-database tests.
