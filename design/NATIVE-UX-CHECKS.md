# Android UX verification — 15 November 2026

Tested the debug APK on a separate headless Android emulator with isolated, disposable app data. The user's existing phone/emulator records were not changed.

- A permission-free automatic check rejected with `SMS_PERMISSION_REQUIRED` without displaying a permission prompt.
- Injected two financial messages and one OTP through the Android emulator's SMS interface. County captured two payments, kept all three stable IDs for deduplication, and stored no raw message bodies.
- Captures left the ledger empty until review. Labelling the ₹850 grocery payment saved one expense with its category and message association.
- Discarding the credit removed it from the pending list. Rechecking the inbox did not re-post the saved or discarded payments.
- Foreground automatic scanning picked up incoming messages after Android delivered them to the inbox.
- Incremental native scanning returned zero messages for a recent timestamp window, while the full scan returned the three earlier fixtures.
- Android Back from Unlabelled returned to Overview. The final APK started successfully without an Android runtime error.

Separately, 29 unit/database checks and 19 browser checks passed, including family sign-in/create/join/invites against a mock endpoint and actual PostgreSQL permission/revision rules. The configured live Supabase project responded correctly and denied anonymous access to the family/backup RPCs.

Live email delivery and live two-phone family sync still depend on completing the Resend/domain/SMTP setup. No live sign-in emails were sent during verification.
