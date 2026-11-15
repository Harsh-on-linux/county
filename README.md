# County

New people see the welcome tour and prepare their name/first account before entering an email. They then verify an email OTP before accessing records. An “Already use County? Sign in” shortcut skips the introduction; a new device still completes account setup after verification. Sessions persist across launches; previously verified devices can track offline. Signing out requires OTP sign-in again and revokes offline access. Existing local records never appear in the pre-authentication tour. The pilot keeps one account profile per phone to prevent existing local records from being attached to another account. Data storage and family visibility are explained in `design/DATA-AND-AUTH.md`.

An offline Android money tracker for a family pilot. React + TypeScript, Vite, and Capacitor 8, with Supabase authentication, private backup, and household sharing. The supplied logo has been reconstructed as a transparent vector mark, with theme-aware in-app SVG, standalone dark/light SVG assets, an adaptive Android icon, and a vector splash mark. The selected display face is Manila Black, paired with locally bundled Inter for controls and financial figures. The palette follows the supplied orange, beige, and charcoal references.

Brand assets: `public/brand/`, shared React mark: `src/components/BrandMark.tsx`, visual reference sheet: `design/county-brand-preview.png`. The original image is preserved in `design/references/logo-original.png` for reference only; it is not used in the app.

The visual direction uses the supplied orange (#E65416), beige (#D8D6C9), off-white (#F5F5F5), grey (#52555A), and charcoal (#303236) palette. Foreground accents use contrast-adjusted shades. Ember, orange, and cream gradients appear on money cards and selected actions; the intro remains flat. The mobile navigation is a floating space switcher plus Record control; tap the current space to move between Overview, The ledger, Our home, and Patterns. The navigation and Record action sit on separate floating islands with an approximately 60:40 width split.

Every money field uses County's in-app number pad, including onboarding, opening balances, transaction edits, SMS suggestions, transfers, and adjustments. Tap the amount to reopen it. A new record starts with its amount, then collects account/category/date/sharing details before saving; Back to amount keeps those details. Physical number keys and paste are also supported on PC. The spending-day calendar is live: tap a day to filter the personal ledger.

Cold starts use a locally bundled Anime.js timeline: a front-facing mark rises from below, holds briefly, then its central star opens and enlarges to reveal the actual app. Backgrounds are flat paper/ink; the mark never rotates or deforms. Skip/Escape finish immediately; reduced motion uses a stationary mark and brief fade. Settings → Replay coin intro replays it without changing records. Timing and rationale are in design/OPENING-MOTION.md. Home uses one visible logo lockup in its header; Record uses a plus icon.

The available-money card has a slow flowing warm gradient in ember/orange/cream, with a deeper version in dark theme. Its balance and controls stay stationary. Motion pauses while the card is offscreen, the app is hidden, a modal is open, or the intro is playing. Reduced motion keeps a static surface. Navigation, sheets, dropdowns, and transaction lists have short, finite transitions; financial figures never bounce or count upwards. No external media or runtime network request is needed.

Text and controls use a larger reading scale, with wrapping layouts for compact phones in both themes. Decorative status marks use the supplied rounded eight-ray symbol, rebuilt as SVG; the County logo remains unchanged. Accounts have six named colour options. Choose one during setup or account creation, or use **Manage accounts → Edit** to change an existing account's name and colour while preserving its balance and history.

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

The native plugin asks for `READ_SMS` when the user enables message capture or taps **Check messages**. In Unlabelled, choose the last 7, 30, or 90 days, or a custom start/end date, before scanning up to 10,000 inbox messages. The end date includes its entire local day. Manual scans save their date range; messages outside that range remain available for later scans. After opting in, County checks for new messages on opening/resuming the unlocked app and every 30 seconds while it is visible. These automatic checks remain incremental regardless of the manual range. The checkbox in Unlabelled turns them off. It does not run a background service or read messages while the app is closed. Automatic checks never open a permission prompt; a revoked permission is explained in the inbox. Denying permission leaves manual tracking usable.

**Unlabelled** is a dedicated destination, accessible from Home, the ledger, and navigation. Captures never affect balances until the user selects an account/category and saves. Discarded items can be restored, repeated scans do not bring them back, and manual duplicates can be explicitly matched without adding another expense. The browser preview supports pasting a bank message for the same review flow. Parsing runs locally; raw bodies are not saved to County or sent to the server. Only financial details, sender/account hints, and stable message IDs are kept. Google Play SMS permission approval is a separate release requirement.

Device lock uses Android's secure device credential confirmation. Android screenshots/recent-app previews are blocked with `FLAG_SECURE`. Local data lives in the app's private preferences; this is not application-level encrypted storage. Uninstalling/clearing the app removes local records, so export or enable cloud backup first. Android automatic OS backup is disabled to keep backup behaviour explicit.

## Connect family sync and cloud backup

The source repository contains no project settings. Supply them through ignored `.env.local` before building. Without configuration, County accurately displays **On this device**; household-tagged entries remain local. Step-by-step setup and a ready-to-paste email-code template are in `supabase/SETUP.md` and `supabase/email-otp.html`.

1. Create a Supabase project and execute `supabase/schema.sql` once in its SQL editor.
2. Enable email authentication. Set the **Magic Link** email template to include `{{ .Token }}`; County verifies an email code directly rather than depending on a redirect back into Android. Configure a production email provider before inviting the family.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the project's public URL and publishable key from **Connect**. A legacy `VITE_SUPABASE_ANON_KEY` is also accepted. Never use a secret/service-role key or database password in this app.
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
- An Unlabelled inbox with manual correction, required category selection, duplicate warnings, matching to existing entries, recoverable discards, paste/import on PC, and no automatic posting.
- CSV export with spreadsheet-formula escaping; complete validated JSON backup and restore. Exports contain plain-text financial information: store them privately.
- Light, dark, and system themes; responsive phone layout and desktop preview; keyboard-accessible forms and modal focus handling.

Amounts are integer paise; currency is INR and number formatting is Indian English. Only expenses are shared. Business spaces, budgets, recurring bills, investments, and expense splitting remain outside this first release.

## Verification

```powershell
npm test
npm run build
npm run test:e2e
```

Browser checks include an isolated family-flow server on port 4174 with a mock Supabase endpoint. They test sign-in errors, create/join, invitations, and removal without sending emails or changing a live project. Embedded PostgreSQL checks separately verify actual membership, privacy, ownership, and revision rules. Live email delivery and two-device sync still require the configured Supabase project.

The browser checks currently use installed Windows Chrome; change `launchOptions.executablePath` in `playwright.config.ts` for another machine. They test onboarding, balances, offline reload, sharing visibility, deletion/restore, and light/dark layouts, and write screenshots to ignored `test-results/`.

Tests use PGlite to execute the actual PostgreSQL schema and verify membership, invitations, edit authorization, private-field filtering, RLS/table denial, member removal, and backup revision checks. The test harness substitutes only Supabase's auth context. No live project is needed for these tests.

Before the family pilot, configure the backend and verify on real phones: email delivery, two-device sync, airplane-mode edits/reconnection, the family's actual bank SMS formats, device lock/cancellation, and Android backup/share/restore. Those native/live service checks cannot be substituted by browser or embedded-database tests.
