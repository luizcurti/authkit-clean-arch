# 0012 — Production operational surface: default CSP, docs off, ops endpoints behind a token

## Status
Accepted. Supersedes [ADR-0007](0007-csp-disabled-for-swagger-ui.md).

## Context
Three things were reachable by anyone in production:

- `GET /api/metrics`, which shows request volume and latency per route.
- `GET /api/health/detailed`, which shows Node version, PID, heap usage and database latency.
- `/api-docs`, a full map of the API.

None of them is a vulnerability on its own. Together they are free reconnaissance. Also, ADR-0007 had turned Content-Security-Policy off globally to make Swagger UI work.

Splitting metrics onto a separate port is the textbook answer. It assumes an orchestrator that keeps the second port private. This project ships a single container with no such network layer.

## Decision
- **CSP everywhere.** `helmet()` runs with its default policy on every route (`src/main/config/middlewares.ts`). Swagger UI works under it unchanged: its scripts are same-origin files and its inline CSS is allowed by the default `style-src`. The online validator badge, an external image, is turned off (`validatorUrl: null`). The page was checked in headless Chrome: every operation renders, and there are no CSP violations. `tests/main/routes/app.spec.ts` asserts both the header and the HTML content type.
- **Docs off in production.** `setupSwagger` mounts nothing when `API_DOCS_ENABLED` resolves to false. It defaults to false in production and true elsewhere.
- **Ops endpoints behind a static token.** `opsAuth` (`src/main/middlewares/ops-auth.ts`) guards `/api/metrics` and `/api/health/detailed`:
  - With `OPS_TOKEN` set, they require `Authorization: Bearer <OPS_TOKEN>`. The comparison is constant-time over SHA-256 digests. Prometheus supports this natively (`authorization: { credentials: … }`).
  - Without it, they are open in development and test, and return 404 in production. Forgetting the variable hides the endpoints rather than exposing them.
- `GET /api/health` stays public and minimal, because load balancers and the Docker `HEALTHCHECK` need it.

## Consequences
- The production attack surface is the business API plus a basic liveness probe.
- Anyone scraping metrics must be configured with the token. A leaked token exposes metrics but nothing else; rotating it is an env change and a restart.
- Docs in production are an explicit opt-in (`API_DOCS_ENABLED=true`). The OpenAPI file still ships in the image.
