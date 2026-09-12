# 0010 — Refresh-token reuse detection revokes the whole token family

## Status
Accepted

## Context
Rotation alone ([ADR-0005](0005-jwt-access-token-with-opaque-refresh-token.md)) invalidates the token that was just spent and correctly rejects a straightforward replay of an already-rotated token. That alone does not detect theft: if an attacker steals a refresh token and rotates it before the legitimate client does, the attacker's resulting session is indistinguishable from a normal one. Rejecting the one reuse attempt does not touch the session the attacker already established.

The scenario this closes: a refresh token is stolen. Whoever rotates it *first* — attacker or legitimate client — gets a valid new token pair. Whoever rotates it *second* presents a token that's already been marked used, which is the reuse signal: at that point, both parties' tokens descend from the same compromised original, and neither can be trusted.

## Decision
Every refresh token carries a `familyId`, generated when a login issues its first refresh token (`src/domain/use-cases/facebook-authentication.ts`) and carried forward unchanged across every rotation (`src/domain/use-cases/refresh-token.ts`). When `setupRefreshAccessToken` finds a token whose `revokedAt` is already set — it is being presented after already being rotated away — it calls `revokeRefreshTokenFamily({ familyId })`, which revokes every non-revoked token sharing that family, not just the one being replayed, before throwing the usual `AuthenticationError`.

A token that's merely expired (never revoked) does *not* trigger family revocation — natural expiry isn't evidence of theft, so it isn't treated as one.

## Consequences
- The window in which a stolen-then-rotated refresh token stays useful is closed the moment *either* party (attacker or legitimate owner) attempts to reuse the token the other already rotated away — whichever session is currently active gets killed too, forcing a fresh login.
- Adds one column (`family_id`, migration `1789168585000-AddRefreshTokenFamily`) and one repository operation (`revokeRefreshTokenFamily`) — a `PATCH`-style bulk update, not a per-row loop, so it stays cheap even for long-lived families.
- This still can't distinguish "attacker reused it" from "legitimate client retried a request after a flaky network response already rotated the token once" — both look identical from the server's perspective. Both cases fail closed (force a fresh login), which is the conservative, correct choice for a security boundary: a false positive costs a re-login, a false negative costs a live session for an attacker.
