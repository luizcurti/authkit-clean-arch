# Advanced TDD Clean Architecture API

[![CI](https://github.com/luizcurti/nodejs-tdd-clean-arch/actions/workflows/ci.yml/badge.svg)](https://github.com/luizcurti/nodejs-tdd-clean-arch/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/luizcurti/nodejs-tdd-clean-arch/branch/main/graph/badge.svg)](https://codecov.io/gh/luizcurti/nodejs-tdd-clean-arch)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Facebook OAuth login, S3 profile-picture uploads, and E2E tests that run against `pg-mem` instead of a real Postgres instance — a Clean Architecture REST API built test-first, with 229 unit + 31 E2E tests and fail-fast Zod validation of environment secrets in production.

> Current test suite: **229 unit tests + 31 E2E tests** — all passing, 100% line coverage on collected files. CI runs lint, typecheck, unit, E2E, coverage, security, Docker build and API collection checks on every push.

## 🔥 Highlights

- Clean Architecture layering (domain / application / infra / main)
- Facebook OAuth login with JWT issuing
- Profile picture upload with validation (MIME, max size, optional S3 integration)
- Detailed health check (database latency, memory, system info)
- Strong environment validation with Zod (fails fast in production on missing secrets)
- Structured logging (Winston + optional daily rotate)
- E2E route tests with `pg-mem` (no real database required in CI)
- Modular factories and adapters for easy extension
- High coverage TDD with Jest + ts-jest

## 🧱 Architecture Overview

```
src/
├── domain/        # Business entities + use cases (pure, framework-agnostic)
├── application/   # Controllers, DTOs, validation, orchestration
├── infra/         # External implementations (DB, gateways, APIs, logger)
└── main/          # Composition root: config, env, routes, factories, app bootstrap
```

### Layering Principles
- Domain: pure logic (entities, use cases) without external dependencies.
- Application: coordinates domain use cases + input/output mapping.
- Infra: concrete adapters (PostgreSQL via TypeORM, Facebook API, AWS S3, logging).
- Main: wiring, DI-style factories, server bootstrap, Express configuration.

## 🧰 Tech Stack

- Node.js >= 24
- TypeScript 5.9
- Express 4
- PostgreSQL 15 (TypeORM)
- Jest + ts-jest (unit/integration tests)
- Zod (environment & input validation)
- Multer (multipart handling)
- AWS SDK v3 (S3 uploads - optional)
- Axios (HTTP calls)
- Winston (logging)
- Swagger UI Express (API docs)

## 📁 Key Directories

| Path | Purpose |
|------|---------|
| `src/domain` | Business rules, entities, use cases |
| `src/application` | Controllers, middlewares, DTOs, validation builders |
| `src/infra` | Gateways, repositories, external services implementations |
| `src/main` | App entrypoint (`index.ts`), env config, factories, routes, Swagger |
| `tests` | Unit, E2E and external integration tests (mirrors `src` structure) |
| `scripts` | Maintenance scripts and the API collection test runner |
| `docs` | Architecture/flow diagrams (Mermaid) and the Postman collection |

## 🚀 Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd nodejs-tdd-clean-arch

# Install dependencies
npm install

# Copy environment template and adjust values
cp .env.example .env

# Start PostgreSQL (+ optional PgAdmin) via Docker
docker compose up -d postgres pgadmin

# Type check
npm run typecheck

# Development (auto build + watch)
npm run start:dev

# Or legacy dev (ts-node-dev direct)
npm run dev
```

Access health check: `http://localhost:8080/api/health`  
Swagger docs: `http://localhost:8080/api-docs`

Prefer to run the whole stack (API + database) in containers? See [Docker Setup](#docker-setup).

## 🧪 Testing

```bash
# Run all unit tests (includes repository tests against pg-mem, an in-memory Postgres)
npm test

# Run E2E route tests (uses pg-mem — no real DB needed)
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# API collection checks against a running instance (see API Collection Tests below)
npm run test:api
```

Coverage reports stored in `coverage/` (HTML + lcov). Current line coverage is 100% on collected files (`jest.config.js` excludes the composition root — `src/main/**` — which is exercised by the E2E suite instead).

### Live external integration tests (opt-in)

`tests/external/*.test.ts` call the real Facebook Graph API and real AWS S3 — they need valid, non-expired credentials and are **not** part of the default CI pipeline (there's nothing to assert deterministically without live secrets). Run them locally with real credentials in `.env`:

```bash
npm run test:integration   # both external suites
npm run test:fb-api        # Facebook Graph API only
npm run test:s3            # AWS S3 only
```

### CI Pipeline

GitHub Actions runs on every push:

| Job | What it does |
|-----|-------------|
| `lint` | ESLint check |
| `typecheck` | `tsc --noEmit` |
| `security` | `npm audit` (blocking) + Snyk scan (advisory) |
| `test` | Unit tests (Jest), including repository tests against pg-mem |
| `coverage` | Coverage run + Codecov upload + 90% line-coverage gate |
| `test-e2e` | E2E route tests with pg-mem |
| `docker` | Builds the app image, boots the real `docker compose` stack against real Postgres, and runs the API collection checks (`npm run test:api`) against it |
| `build` | Compiles TypeScript, runs only after `lint`, `typecheck`, `test` and `test-e2e` pass |

## 🏗 Build & Run (Production)

```bash
# Compile TypeScript
npm run build

# Start production server
npm start
```

Environment variables are validated at startup (see `src/main/config/env.ts`). Missing required secrets in production will abort boot.

## 🔐 Authentication Flow

1. Client obtains a Facebook OAuth token externally.
2. Calls `POST /api/login/facebook` with `{ token }`.
3. API validates token with Facebook Graph API, creates/updates local account.
4. Issues JWT (`accessToken`).
5. Subsequent protected endpoints accept either `Authorization: Bearer <accessToken>` (standard scheme, also what Swagger UI sends) or the raw `Authorization: <accessToken>`.

## 📦 Profile Picture Handling

Endpoint: `PUT /api/users/picture`
- Accepts multipart field `picture` (PNG/JPG)
- Validations: allowed MIME, max size (5MB), fallback to initials.
- Optional AWS S3 storage (configure S3 env vars). If not set, can store locally or skip upload depending on infra adapter.

Remove picture: `DELETE /api/users/picture` → returns initials and clears stored reference.

## 🩺 Health Checks

- `GET /api/health`: basic status, uptime, memory summary.
- `GET /api/health/detailed`: adds DB latency, memory breakdown, system info (platform, Node version, PID).

## 📘 API Documentation

Swagger UI available after server start: `http://localhost:8080/api-docs`  
Raw spec: `./src/main/docs/swagger.json`

### Core Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login/facebook` | Login via Facebook OAuth token |
| PUT | `/api/users/picture` | Upload / replace profile picture |
| DELETE | `/api/users/picture` | Remove profile picture |
| GET | `/api/health` | Basic health check |
| GET | `/api/health/detailed` | Detailed health diagnostics |

### cURL Examples
```bash
# Facebook Login
curl -X POST http://localhost:8080/api/login/facebook \
  -H "Content-Type: application/json" \
  -d '{"token": "FACEBOOK_OAUTH_TOKEN"}'

# Upload Picture
curl -X PUT http://localhost:8080/api/users/picture \
  -H "Authorization: Bearer <JWT>" \
  -F "picture=@avatar.jpg"

# Basic Health
curl http://localhost:8080/api/health
```

## 📚 Diagrams

Architecture, request-flow (login, picture upload), deployment and database-schema diagrams live in [`docs/`](./docs) (Mermaid sources in `docs/mmd`, rendered PNGs in `docs/img`).

## 📮 API Collection Tests

A Postman collection covering success, validation-error, auth-failure and not-found scenarios lives in [`docs/api`](./docs/api) — import `collection.postman_collection.json` and `environment.postman_environment.json` into Postman/Insomnia. Generate a test JWT for the `accessToken` variable with:

```bash
node scripts/generate-test-token.js         # signs { key: '1' }, matching the user seeded by dump.sql
```

The same checks run without Postman/newman via a small dependency-free script (used in CI's `docker` job):

```bash
npm run test:api   # hits API_BASE_URL (default http://localhost:8080/api)
```

## 🐳 Docker Setup

`docker-compose.yml` defines:
- `app`: the API itself, built from the root `Dockerfile` (multi-stage: compile TypeScript, then a slim production-only runtime image)
- `postgres`: PostgreSQL 15-alpine (initialized with `dump.sql`)
- `pgadmin`: DB admin UI (optional)

```bash
# Build and start the full stack (API + database)
docker compose up -d --build postgres app

# Database admin UI (optional)
docker compose up -d pgadmin

# View logs
docker compose logs -f app

# Stop
docker compose down
```

The `app` container reads its configuration from environment variables (see `docker-compose.yml`); when a root `.env` file exists, Docker Compose uses it to fill in those values, otherwise safe development defaults are used — the same defaults `src/main/config/env.ts` falls back to outside of production.

## 🔧 Environment Variables

See `.env.example` for the annotated list. `.env` itself is gitignored — never commit real secrets. Production requires:
- `FB_CLIENT_ID`, `FB_CLIENT_SECRET`
- `JWT_SECRET` (>=32 chars)
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` (if S3 enabled)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`

Default development fallbacks exist but aren't safe for production.

## 🛠 Quality & Maintenance

```bash
# Lint
npm run lint

# Lint with autofix
npm run lint:fix

# List outdated dependencies
npm run check

# Upgrade package.json to latest versions (review before installing)
npm run update

# Type-only check
npm run typecheck
```

`scripts/migrate.sh` does a clean `node_modules`/lockfile reinstall plus a typecheck + build, useful after a dependency bump. A `husky` pre-commit hook runs `lint-staged` (ESLint --fix + related Jest tests) on staged `.ts` files.

## 🪵 Logging

- Winston with optional daily rotate file transport (enable via env flags).
- Structured JSON logs for errors with stack trace.
- Startup shows port, environment, health endpoint.

## 📈 Roadmap / Possible Enhancements
- Add rate limiting & request tracing (e.g., pino-http or OpenTelemetry)
- Add refresh token & token revocation strategy
- Expand health check with disk & external API reachability
- Add feature flags system (simple env-based or LaunchDarkly)
- Introduce caching layer (Redis) for tokens/profile images metadata

## 🤝 Contributing
1. Fork & clone
2. Create feature branch (`git checkout -b feat/my-change`)
3. Ensure tests & coverage remain high
4. Submit PR with clear description & rationale

## 🛡 License
[MIT](./LICENSE)

## 💬 Support
For questions open an Issue or consult Swagger spec.

---
Made with a TDD-first mindset for reliability and evolution.