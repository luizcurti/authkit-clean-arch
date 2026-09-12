# 0008 — In-memory rate limiting, not Redis-backed

## Status
Accepted

## Context
`POST /login/facebook` and `POST /login/refresh` need protection against brute-force/abuse, and the whole API needs a general request cap. Rate limiting can be enforced per-process (in memory) or against a shared store (Redis) so limits hold across multiple instances.

## Decision
Use `express-rate-limit`'s default in-memory store (`src/main/middlewares/rate-limiter.ts`): 100 req/min/IP globally, 10 req/min/IP on the two auth endpoints. Disabled automatically under `NODE_ENV=test` so it doesn't interfere with the test suites.

## Consequences
- Zero additional infrastructure (no Redis) to run or operate for a single-instance deployment — correct for the app's current scale.
- The limiter's state is per-process: running more than one instance behind a load balancer means each instance enforces its own independent limit, so the *effective* limit multiplies by instance count and an attacker distributed across instances isn't caught by a single counter.
- See the "Current Scale & Constraints" section in the root [README](../../README.md) for the single-instance deployment this design matches.
