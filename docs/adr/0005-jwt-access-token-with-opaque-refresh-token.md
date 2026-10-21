# 0005 — JWT access token + opaque, server-side refresh token

## Status
Accepted

## Context
A pure JWT-only design (no refresh token) can't be revoked before it expires — if an access token leaks, the only fix is waiting it out. A pure server-side session, on the other hand, gives up JWT's main benefit: stateless verification on every request without a DB round trip. The project needed both fast, stateless authorization checks *and* a way to revoke a compromised credential immediately.

## Decision
Split the two concerns:
- **Access token**: a short-lived (15 min) JWT, verified statelessly on every protected request — no DB lookup needed to authorize a request. The user id travels in the standard `sub` claim. Tokens carry `iss`/`aud` (`JWT_ISSUER`/`JWT_AUDIENCE`), and verification pins `algorithms: ['HS256']` and both claims, so a token minted for another service that shares the secret is rejected. Only `Authorization: Bearer <token>` is accepted. A missing or rejected token gets `401` with a `WWW-Authenticate: Bearer` challenge, carrying `error="invalid_token"` when a token was presented (RFC 6750 §3).
- **Refresh token**: a long-lived (7 days) opaque random value, stored server-side only as a SHA-256 hash (see [ADR-0006](0006-sha256-hash-for-refresh-tokens.md)). Exchanging it for a new access token (`POST /api/login/refresh`) revokes the old refresh token and issues a new one (rotation — see [ADR-0010](0010-refresh-token-reuse-detection-and-family-revocation.md) for what happens when a rotated-away token is reused).

Ending a session is `POST /api/logout { refreshToken }`. It revokes the token's whole family and always returns 204, so it cannot be used to probe which tokens exist. Expired refresh tokens are purged on a schedule so the table does not grow without bound.

## Consequences
- A leaked access token is only viable for at most 15 minutes; a leaked refresh token can be revoked immediately by deleting/marking its row, and rotation limits the reuse window even without manual intervention.
- The client must handle a second token and a refresh call, which is more integration surface than "store one JWT and send it forever."
- Every refresh is a DB round trip (load-by-hash, revoke, save) — an accepted cost given it happens once per 15-minute access-token lifetime rather than per request.
- Both tokens are returned in the JSON body, which targets mobile and native clients that keep them in secure platform storage. A browser SPA should not keep a refresh token in JavaScript-readable storage. Serving it in an `HttpOnly; Secure; SameSite=Strict` cookie, with CSRF protection on the refresh endpoint, is the browser-oriented variant. It is not implemented here.
- Logout cannot recall access tokens already issued. They stay valid for up to 15 minutes. That is the price of stateless verification, and the reason the access-token lifetime is short.
