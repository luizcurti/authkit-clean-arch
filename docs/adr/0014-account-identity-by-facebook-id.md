# 0014 — Account identity: Facebook id first, email only to link, enforced by UNIQUE constraints

## Status
Accepted

## Context
Facebook login used to find the local account **by email only**, and the `users` table had no unique constraint at all. Three problems followed:

- **Missing email.** The Graph API omits `email` when the user declines the permission or signed up with a phone number. Under TypeORM 0.3, `findOne({ where: { email: undefined } })` silently drops the undefined condition and returns the *first user in the table*, whose `facebook_id` would then be overwritten: an account takeover. TypeORM 1.x throws on undefined `where` values instead, so this project got a 500, not a takeover. That protection is a library default (`invalidWhereValuesBehavior`), not a design decision. `tests/infra/repos/user-account.spec.ts` now pins that behaviour.
- **Wrong primary key.** Email is mutable on Facebook's side, so it is a poor primary identity. The stable identity is the Facebook user id.
- **Duplicates.** Two simultaneous first logins of the same person both found no account and both inserted, creating two accounts.

## Decision
- **No email, no login.** `FacebookApi` returns no user when `email` is absent or empty, so the login is a 401.
- **Look up by `facebook_id` first.** The email is used only to *link* a Facebook identity to an existing account that has none yet. An account already bound to a different `facebook_id` is never re-bound through a matching email. The use case rejects it (`FacebookAuthentication`), and the upsert's `ON CONFLICT … WHERE` refuses it at the database level.
- **`UNIQUE` on `users.email` and `users.facebook_id`** (migration `AddUniqueUserIdentity`).
- **Emails stored lowercase.** `FacebookApi` trims and lowercases the email, and a `CHECK (email = lower(email))` (migration `NormalizeUserEmail`) keeps every other write path honest. Without it, `Luiz@x.com` and `luiz@x.com` would pass `UNIQUE(email)` as two accounts. A `lower(email)` expression index was not used because `ON CONFLICT ("email")` needs a plain column index.
- **Linking an existing account is a compare-and-set too.** When the account was found by email, the update runs `… WHERE id = $1 AND (facebook_id IS NULL OR facebook_id = $2)`. Two Facebook identities with the same email logging in at once both pass the use case's check, but only the first `UPDATE` matches; the second throws `AuthenticationError` (401). The insert path's refusal now throws the same error instead of a generic one (500).
- **Atomic first login.** The insert is an upsert, `INSERT … ON CONFLICT ("email") DO UPDATE SET facebook_id = … WHERE facebook_id IS NULL OR facebook_id = EXCLUDED.facebook_id`. Concurrent first logins converge on one row instead of failing on the constraint.

## Consequences
- **No accidental account takeover** through a missing email or through an email shared with a different Facebook identity. A person who really has two Facebook accounts with the same email can only use the first one they linked.
- **Users without a shared email cannot log in.** That is the price of not identifying accounts by Facebook id alone. Supporting them would mean creating accounts with no email, which this schema (`email NOT NULL`) does not allow.
- **Existing duplicates block the migration.** If duplicates already exist, it fails and they must be merged first.
- **pg-mem does not apply the `WHERE` of `ON CONFLICT … DO UPDATE`.** The refusal to re-bind, the concurrent first login, and the constraints themselves are therefore tested against real PostgreSQL (`tests/postgres/user-account.pg.test.ts`).
