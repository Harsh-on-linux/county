# County — everyday flows

Home starts with a greeting and available money. The oversized date/day block is removed. Monthly totals, a visible Unlabelled shortcut, accounts, and recent activity provide the next actions. Navigation keeps its separate Record island; Unlabelled is a first-class destination with a pending count.

## Record a payment

Record → amount on the in-app keypad → account/category/date/payee → save. Notes are optional and collapsed. Creating a missing first account returns to the intended record instead of forcing the user to start again. Back to amount preserves entered details. A family tag clearly says when it is only saved on this phone.

## Review captured payments

Enable message capture → grant Android permission → payments wait in Unlabelled. Checks run only while County is open/unlocked, following opt-in. Manual checks remain available. A pasted bank message uses the same local parser on PC.

Label → prefilled amount and payee → choose category and, when there are several, account → Label & save → return to the remaining queue. Closing a review leaves it waiting. Nothing changes balances or gets shared before this save.

Discard → recoverable Discarded list, with immediate Undo. Restore → Unlabelled. Repeat scans do not re-add discarded or saved items. Match existing links a possible manual duplicate without posting it again. A debit and credit sharing a reference stay separate so the user can review a transfer correctly. The raw bank-message body is never persisted.

## Add family

Our home → Connect your family → sign in with an email code → Create a family or Join a family. The owner generates a single-use invitation, valid for 24 hours. Another person signs in with their own email on their phone, then pastes the code. Invalid/expired codes stay on the form with an explanation. Owners can remove a member after an inline confirmation.

Only marked expenses are projected to the family. Account IDs, balances, SMS IDs, income, and personal entries stay out of the household data. Private backup is a separate, user-scoped service. Offline shared changes queue until connection returns. Without a configured backend, the UI explicitly identifies local-only sharing.

## Interaction and verification

Dialogs make the background inert and trap keyboard focus. Navigation menus fit short viewports. Amounts stay in integer paise. Message scans and local edits use serialized functional updates so one cannot replace the other's changes. Existing v1 backups migrate saved/discarded message states without re-posting payments.

Tests cover manual recording, capture/import, required labelling, cancel/resume, no-account recovery, matching, discard/undo/restore, offline reload, themes, reduced motion, family sign-in/create/join/invites, server membership/privacy, and sync conflict behavior. Real bank-message formats, Android permission delivery, email delivery, and live two-phone sync require native/service validation too.
