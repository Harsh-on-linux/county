# Connect County to Supabase

1. In a new project, run `schema.sql` once in SQL Editor. The script installs user-scoped backups and family membership/invitation/expense RPCs. Do not rerun it over an installed schema.
2. Configure custom SMTP before inviting family members. Supabase's built-in sender restricts recipients to project-team addresses. With Resend, add your sending domain under **Domains**, add the DNS records Resend supplies, and wait for verification. Create a sending API key scoped to that domain. In **Supabase → Authentication → Emails → SMTP Settings**, set:

   | Field | Value |
   | --- | --- |
   | Sender name | County |
   | Sender email | An address on the domain verified in Resend |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | The Resend API key, entered directly in Supabase |

   Alternatively, Resend's Supabase integration can fill in SMTP settings. SMTP credentials belong in Supabase's backend settings, never in the app or Git. Use the exact DNS records from your Resend dashboard; preserve existing mail records for other services.
3. Enable Email under **Authentication → Sign In / Providers**. Open **Authentication → Emails → Templates** (some dashboards call this **Email Templates**). Paste `email-otp.html` into **Magic Link**, using a subject such as `Your County sign-in code`. Use the same code template for **Confirm signup** if the project uses it for new passwordless users. Save the changes. The important variable is `{{ .Token }}`: County verifies a code inside the app, without an Android browser redirect. No code is sent until a user presses Send sign-in code in County.
4. Copy the URL and publishable key from the project's **Connect** panel into ignored `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

5. Run `npm run android:sync`, rebuild the APK, and install it on each phone. Sign in with a different email per person. Create a family on the owner's phone, generate an invitation, then join from the other person's phone. Each invitation is single-use and expires in 24 hours.

The app requires only a publishable/anon key. A public connection check can confirm the project is reachable and the RPCs exist, but cannot change email templates or prove email delivery. Never put a secret/service-role key or database password in the frontend.

References: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend SMTP](https://resend.com/docs/send-with-smtp), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [passwordless email sign-in](https://supabase.com/docs/guides/auth/auth-email-passwordless).
