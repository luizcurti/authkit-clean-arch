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
- See "Current scale and constraints" in [operations.md](../operations.md#current-scale-and-constraints) for the single-instance deployment this design matches.
- **Behind a reverse proxy, the limiter is only as good as `req.ip`.** Express ignores `X-Forwarded-For` by default. Behind a load balancer, every client would then share the proxy's IP and one counter. Trusting the header blindly instead lets any client pick its own IP. The app sets `trust proxy` to `TRUST_PROXY_HOPS` (default `0`, direct connections) in `src/main/config/middlewares.ts`. Set it to the exact number of proxies in front of the app, for example `1` behind a single ALB, so `req.ip` is the address the outermost trusted proxy saw.
