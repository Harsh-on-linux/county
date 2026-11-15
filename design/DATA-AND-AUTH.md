# County accounts, storage, and family sharing

New people first see an introduction and prepare their name and starting account locally. They then sign in with their own email and a one-time code before accessing records. Returning people can go straight to sign-in. The pre-authentication tour is available only on a pristine device, with no existing accounts, transactions, or captured payments; existing records stay behind authentication. Supabase Auth manages the identity and session. County remembers the session instead of asking for another code on every launch. First sign-in and re-sign-in after logout require internet access. Previously verified devices retain offline access to local records; explicit sign-out revokes that offline access. Optional Android device lock is a separate layer.

For this family pilot, one phone profile is bound to the first signed-in account. Signing in as someone else cannot attach that phone's existing records to a different account. Mom, Dad, and Sister use separate accounts on their own phones. Current local records are preserved when adding sign-in.

## On the phone

The complete v1 data object is stored as JSON using Capacitor Preferences (Android app-private SharedPreferences). The PC preview uses browser localStorage. This is not SQLite or an encrypted database. The Android sandbox limits ordinary access by other apps, but County does not currently encrypt the local JSON or Supabase session with a separate application key. Full JSON/CSV exports are also readable files.

Accounts, entries, categories, captured payment details, discard decisions, and preferences work offline. Amounts are integer paise. Raw SMS bodies are parsed in memory and not persisted. The saved capture details can include sender, account suffix, date, amount, reference, and stable message ID. Authentication gates the UI and cloud APIs; it does not replace local encryption.

## In Supabase

- Auth keeps each person's account and session identity.
- `backups` holds a complete private JSON backup per user. Its RPCs check the authenticated user's ID; family members cannot read someone else's backup.
- `households` identifies the family and its owner.
- `members` connects individual authenticated users to that family.
- `invitations` stores single-use codes that expire after 24 hours.
- `household_entries` stores the deliberately shared expense projection, separate from private backups.

Cloud backup currently syncs automatically when signed in and online. Installing on a replacement phone does not silently overwrite local records: a private cloud backup is restored explicitly in Settings. Access control makes the backup private from other users, but this is not end-to-end encryption; the project's database administrators can access stored data.

## What family members see

Only expenses marked Share with household: amount, category, payee, note, date, payer name, and deletion state. The server uses a field allowlist. Personal account IDs, account balances, income, SMS IDs, and unshared transactions are excluded from this family projection. All current family members can see its shared history.

The creator and family owner can edit a shared expense; other members can view it. A creator's account association remains local/private. Offline changes queue and sync after reconnection, after edits, or on periodic foreground refresh. Revision checks detect conflicting edits rather than silently replacing another phone's changes. Removed members lose server access, but previously downloaded data cannot be remotely erased from an offline phone.

Email OTP delivery uses the configured SMTP provider (Resend). That provider receives the recipient address and email contents to deliver the sign-in code. SMTP credentials stay in Supabase settings and are never bundled into County.
