# 0006 — SHA-256, not bcrypt, to hash refresh tokens at rest

## Status
Accepted

## Context
Refresh tokens are stored server-side only as a hash (see [ADR-0005](0005-jwt-access-token-with-opaque-refresh-token.md)), so a hash function had to be chosen. Passwords are hashed with slow, salted algorithms (bcrypt/argon2) specifically because they're low-entropy secrets a human chose — an attacker with the hash can feasibly brute-force or dictionary-attack it. A refresh token is not that kind of secret.

## Decision
Hash refresh tokens with SHA-256 (`src/infra/gateways/crypto-hasher.ts`), not bcrypt.

## Consequences
- A refresh token is a high-entropy, randomly generated UUID (`idGenerator.uuid`) — not a human-chosen low-entropy value. Brute-forcing a random 128+ bit value from its SHA-256 hash is computationally infeasible regardless of hash speed, so bcrypt's deliberate slowness defends against a threat that doesn't apply here.
- SHA-256 is fast, which matters because every token refresh does a hash-then-lookup; using bcrypt here would add needless latency to every refresh call for a security property (resistance to fast guessing) the token doesn't need.
- This decision's security argument depends entirely on the refresh token being unguessable by construction (a high-entropy random UUID), not on hash cost — it does not hold for a low-entropy value such as a short numeric code.
