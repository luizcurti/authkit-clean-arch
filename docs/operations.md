# Operations

## Configuration

`src/main/config/env.ts` validates every variable with Zod at startup. Outside production, missing variables fall back to development defaults; in production, required ones must be set. Any invalid value, in any environment, stops the app with exit status 1 and a list of the offending variables. `.env.example` is the annotated reference. `.env` is gitignored.

**Required in production:** `FB_CLIENT_ID`, `FB_CLIENT_SECRET`, `JWT_SECRET` (at least 32 characters), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, and the `DB_*` connection settings.

**Optional:**

| Variable | Default | Effect |
|----------|---------|--------|
| `JWT_ISSUER` / `JWT_AUDIENCE` | `authkit-clean-arch` / `authkit-clean-arch-api` | `iss`/`aud` claims, required on verification |
| `CORS_ALLOWED_ORIGINS` | empty | Comma-separated allowlist. Empty denies all cross-origin requests in production and allows all elsewhere |
| `OPS_TOKEN` | unset | Bearer token for `/api/metrics` and `/api/health/detailed`. When unset, they are open outside production and return 404 in production |
| `TRUST_PROXY_HOPS` | `0` | Reverse-proxy hops whose `X-Forwarded-For` is trusted. Set it to the real number, for example `1` behind one load balancer |
| `RATE_LIMIT_PER_MINUTE` / `AUTH_RATE_LIMIT_PER_MINUTE` | `100` / `10` | Requests per minute per client: on every route / on login, refresh and logout together ([ADR-0008](adr/0008-in-memory-rate-limiting.md)) |
| `API_DOCS_ENABLED` | `false` in production, `true` elsewhere | Serves Swagger UI at `/api-docs` |
| `REFRESH_TOKEN_PURGE_INTERVAL_MINUTES` | `60` | In-process purge of expired refresh tokens. `0` disables it |
| `OUTBOX_POLL_INTERVAL_SECONDS` | `10` (`1` in docker-compose) | In-process outbox worker (deletes replaced pictures). `0` disables it |
| `S3_REGION` | `us-east-1` | Must match the bucket's region |
| `S3_ENDPOINT` / `S3_FORCE_PATH_STYLE` | unset / `false` | S3-compatible endpoint (S3Mock locally) instead of AWS |
| `S3_PUBLIC_BASE_URL` | unset | Base URL pictures are served from (CloudFront). Unset: pre-signed URLs valid for 1 hour |
| `LOG_LEVEL` | `debug` in development, `info` otherwise | Winston level |

## Docker

`docker-compose.yml` is a local development and demo stack. It defines these services:

- **`postgres`**: PostgreSQL 15.
- **`s3mock`**: Adobe S3Mock, an S3-compatible emulator with the `authkit-pictures` bucket. Uploaded pictures are served from `http://localhost:9090/authkit-pictures/…`. LocalStack is not used because its current images require an account token ([ADR-0015](adr/0015-private-picture-storage-and-s3mock.md)).
- **`migrate`**: a one-shot service, built from the same image, that runs `migration:run:prod` and exits. `app` waits for it to complete successfully.
- **`app`**: the API. It uses a multi-stage `Dockerfile` with a `node:24-alpine` base and runs as a non-root user. It reads an optional `.env`. Compose sets no default for the JWT and Facebook secrets, and points S3 at the `s3mock` container.
- **`pgadmin`** (optional): starts only with `docker compose --profile tools up`. The image is pinned.

```bash
docker compose up -d --build
docker compose exec app npm run db:seed        # seeding is never part of boot
docker compose logs -f app
docker compose down                            # add -v to drop the database volume
```

The stack runs with `NODE_ENV=development`. With `NODE_ENV=production docker compose up` the secrets become required, and the app does not start without them.

### Building and running without Docker

```bash
npm run build                  # tsc + tsc-alias → dist/
npm run migration:run:prod
npm start
```

## Deployment

The project ships as one container image. It needs a PostgreSQL database and an S3 bucket, and it provisions no cloud infrastructure itself (no Terraform). In production, set:
- the required secrets;
- `S3_PUBLIC_BASE_URL` to a CloudFront distribution in front of the private bucket;
- `OPS_TOKEN`;
- `TRUST_PROXY_HOPS` to the number of proxies in front of the app.

Run migrations before starting a new version: `npm run migration:run:prod`, or the `migrate` service pattern from `docker-compose.yml`.

## Security controls

| Control | Where |
|---------|-------|
| Rate limiting: 100 req/min/IP globally, 10 req/min/IP on login, refresh and logout (configurable) | `src/main/middlewares/rate-limiter.ts`, [ADR-0008](adr/0008-in-memory-rate-limiting.md) |
| Helmet headers, including the default CSP on every route | `src/main/config/middlewares.ts`, [ADR-0012](adr/0012-production-operational-surface.md) |
| Ops endpoints behind `OPS_TOKEN`, Swagger off in production | `src/main/middlewares/ops-auth.ts`, `src/main/config/swagger.ts` |
| Facebook `debug_token` checks `is_valid` and `app_id == FB_CLIENT_ID` | `src/infra/gateways/facebook-api.ts` |
| JWT: HS256 pinned, `sub`/`iss`/`aud`, `Bearer` scheme only, `401` + `WWW-Authenticate` challenge | `src/infra/gateways/jwt-token.ts`, `src/application/middlewares/authentication.ts` |
| Accounts found by Facebook id first, linked by email only when unbound, `UNIQUE(email)` and `UNIQUE(facebook_id)`, login without email rejected | [ADR-0014](adr/0014-account-identity-by-facebook-id.md) |
| Private bucket, no ACLs, CDN or pre-signed URLs, random keys, previous picture deleted | [ADR-0015](adr/0015-private-picture-storage-and-s3mock.md) |
| Refresh tokens hashed (SHA-256), rotated atomically inside a per-request transaction, reuse revokes the family, logout, scheduled purge | [ADR-0006](adr/0006-sha256-hash-for-refresh-tokens.md), [ADR-0010](adr/0010-refresh-token-reuse-detection-and-family-revocation.md), [ADR-0013](adr/0013-atomic-refresh-token-rotation-and-reuse-grace-window.md) |
| Uploads: MIME type, 5 MB limit, and magic-byte signature must match the declared type | `src/application/validation/` |
| JSON bodies limited to 100 KB. Malformed or oversized bodies and unexpected errors get the JSON error shape (`400`/`413`/`500`), never an HTML page or stack trace | `src/main/middlewares/error-handler.ts` |
| Deny-by-default CORS in production, non-root container | `src/main/config/middlewares.ts`, `Dockerfile` |

## Refresh-token cleanup

The API purges expired refresh tokens every `REFRESH_TOKEN_PURGE_INTERVAL_MINUTES`. With several instances, or with an external scheduler, set the interval to `0` and run the one-off job instead:

```bash
npm run db:purge-refresh-tokens   # node dist/main/jobs/purge-expired-refresh-tokens.js
```

## Outbox worker

Side effects that cannot join a database transaction, such as deleting a replaced profile picture from S3, are recorded in the `outbox_events` table in the same transaction as the change, then carried out by a worker ([ADR-0016](adr/0016-transactional-outbox-for-picture-cleanup.md)). The API runs the worker every `OUTBOX_POLL_INTERVAL_SECONDS`. It is safe to run on several instances, or next to the one-off job, because each worker claims a disjoint batch:

```bash
npm run outbox:process   # node dist/main/jobs/process-outbox-events.js
```

A failing event is retried after a 1-minute lease, up to 5 attempts. Events that run out of attempts stay in the table with their last error:

```sql
SELECT id, type, payload, attempts, last_error FROM outbox_events WHERE processed_at IS NULL AND attempts >= 5;
```

To retry them after fixing the cause, reset `attempts` to `0`. Processed events are kept for auditing; delete old ones with `DELETE FROM outbox_events WHERE processed_at < now() - interval '30 days'` if the table grows.

## Logging and metrics

- Logs go to stdout only, with no files inside the container. Development output is human-readable. In production each log line is one JSON object, ready for any log collector.
- Every request carries an `X-Request-Id` (generated or echoed). It appears in access logs and in every non-2xx JSON body.
- `GET /api/metrics` exposes Prometheus metrics. These include `http_request_duration_seconds` (a histogram by method, route and status), `http_requests_total`, and Node process defaults ([ADR-0011](adr/0011-prometheus-metrics-endpoint.md)). To scrape them, configure Prometheus with `authorization: { credentials: <OPS_TOKEN> }`.
- `GET /api/health` is public and minimal, for load balancers and the Docker `HEALTHCHECK`. `GET /api/health/detailed` adds database latency, memory and runtime info, and is protected like metrics.

## Current scale and constraints

- The app runs as a single instance. Rate-limit state is per process ([ADR-0008](adr/0008-in-memory-rate-limiting.md)).
- Observability consists of metrics and correlated structured logs. There is no distributed tracing ([ADR-0011](adr/0011-prometheus-metrics-endpoint.md)).
- Picture uploads are proxied through the API. Clients do not upload to S3 directly.
- Without `S3_PUBLIC_BASE_URL`, the picture URL returned on upload is pre-signed and expires after an hour, and no endpoint returns a fresh one. Production deployments set a CDN base URL.
- A single PostgreSQL instance serves all reads and writes.
- The system is a modular monolith: one deployable and one database ([ADR-0009](adr/0009-modular-monolith.md)).
- Tokens are returned in the JSON body, which targets mobile and native clients. Browser SPAs that need HttpOnly cookies are outside the current scope ([ADR-0005](adr/0005-jwt-access-token-with-opaque-refresh-token.md)).
