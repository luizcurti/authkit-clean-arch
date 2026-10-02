# 0013 — Atomic, transactional refresh-token rotation and a short reuse grace window

## Status
Accepted. Refines [ADR-0010](0010-refresh-token-reuse-detection-and-family-revocation.md).

## Context
Rotation used to be "load the token, check `revokedAt`, then `UPDATE … SET revoked_at = now() WHERE id = $1`". Under concurrency, two requests carrying the same refresh token could both pass the check before either update landed. Each then issued a new token pair, forking the session. This is not hypothetical. A test against real PostgreSQL with 8 concurrent rotations of one token produced 8 new token pairs with that code.

Rotation is also two writes: revoke the old token, then save the new one. If the save fails, the user is left with no valid token.

Concurrent refreshes from one client are also normal: two tabs, or two parallel API calls that both notice an expired access token. With reuse detection alone, the slower request looks like reuse and revokes the family. That kills the token the faster request has just received.

## Decision
- **Atomic check-and-set.** `revokeRefreshToken` runs a single conditional `UPDATE … WHERE id = $1 AND revoked_at IS NULL` and returns whether it affected a row. PostgreSQL row locking guarantees exactly one concurrent caller wins. A loser gets `AuthenticationError` and no tokens.
- **One transaction per rotation.** `POST /api/login/refresh` runs inside `DbTransactionController`, so the revocation and the new token are committed together or not at all.
  - The transaction lives in an `AsyncLocalStorage` scope per request (`PgConnection.transaction`), never on the shared connection singleton. An earlier version stored the open query runner on the singleton, where concurrent requests overwrote each other's.
  - The decorator rolls back on any 5xx response and commits on 4xx. A 401 caused by reuse must keep the family revocation it just wrote.
  - The Facebook login is deliberately not wrapped. Its transaction would span the Graph API call and hold a pooled connection for up to several seconds. Its two writes are safe without it: the account upsert is idempotent, and a failed token insert just means logging in again.
- **5-second grace window** (`RefreshToken.reuseGraceInMs`). A rotated token presented again within 5 s of its rotation is rejected, but its family is not revoked. After 5 s, reuse revokes the family exactly as before.
- **Verified against real PostgreSQL**, not pg-mem. pg-mem runs queries one at a time and has no row locks. `tests/postgres/refresh-token-rotation.pg.test.ts` (`npm run test:pg`, run in CI) covers three cases:
  - Exactly one of N concurrent rotations succeeds, with and without the transaction.
  - A failed save leaves the old token usable.

## Consequences
- No forked sessions, regardless of client concurrency, and no half-done rotation.
- **What the grace window actually buys:** concurrent refreshes no longer log the user out. The loser gets a 401 and the winner's freshly issued pair stays valid, so the client continues with that pair.
- **What it does not buy:** tolerance of a lost response. If the rotation response never reaches the client, the new pair is lost with it. The client's retry with the old token gets a 401 (family intact or not), and the client has no valid refresh token, so it must log in again. Truly absorbing that retry would mean answering it with the *same* successor pair. That would require storing the successor token in a recoverable form, but only hashes are stored ([ADR-0006](0006-sha256-hash-for-refresh-tokens.md)). Keeping refresh tokens unrecoverable at rest was judged worth more than surviving this edge case.
- **The window is a detection blind spot.** An attacker who replays a stolen, already-rotated token within 5 s of the legitimate rotation is still rejected but does not trigger family revocation. If the attacker rotated first and the legitimate client replays within 5 s, the attacker's session survives that event. It is caught on the next reuse after the window. The window is kept short for that reason.
- Expired tokens are purged on a schedule: in-process every `REFRESH_TOKEN_PURGE_INTERVAL_MINUTES`, or externally with `npm run db:purge-refresh-tokens`. Once a revoked token is purged, presenting it again is "unknown" rather than "reuse". This is acceptable because it was already expired and could not be redeemed.
