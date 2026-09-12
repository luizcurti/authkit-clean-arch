# 0005 — JWT access token + opaque, server-side refresh token

## Status
Accepted

## Context
A pure JWT-only design (no refresh token) can't be revoked before it expires — if an access token leaks, the only fix is waiting it out. A pure server-side session, on the other hand, gives up JWT's main benefit: stateless verification on every request without a DB round trip. The project needed both fast, stateless authorization checks *and* a way to revoke a compromised credential immediately.

## Decision
Split the two concerns:
- **Access token**: a short-lived (15 min) JWT, verified statelessly on every protected request — no DB lookup needed to authorize a request.
- **Refresh token**: a long-lived (7 days) opaque random value, stored server-side only as a SHA-256 hash (see [ADR-0006](0006-sha256-hash-for-refresh-tokens.md)). Exchanging it for a new access token (`POST /api/login/refresh`) revokes the old refresh token and issues a new one (rotation — see [ADR-0010](0010-refresh-token-reuse-detection-and-family-revocation.md) for what happens when a rotated-away token is reused).

## Consequences
- A leaked access token is only viable for at most 15 minutes; a leaked refresh token can be revoked immediately by deleting/marking its row, and rotation limits the reuse window even without manual intervention.
- The client must handle a second token and a refresh call, which is more integration surface than "store one JWT and send it forever."
- Every refresh is a DB round trip (load-by-hash, revoke, save) — an accepted cost given it happens once per 15-minute access-token lifetime rather than per request.
