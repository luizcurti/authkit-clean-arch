# Advanced TDD Clean Architecture API

[![CI](https://github.com/luizcurti/nodejs-tdd-clean-arch/actions/workflows/ci.yml/badge.svg)](https://github.com/luizcurti/nodejs-tdd-clean-arch/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/luizcurti/nodejs-tdd-clean-arch/branch/main/graph/badge.svg)](https://codecov.io/gh/luizcurti/nodejs-tdd-clean-arch)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Production-grade REST API built with Clean Architecture, SOLID principles, rigorous TDD and TypeScript. Focused on high test coverage, clear separation of concerns, and maintainable evolution.

> Current test suite: **188 unit tests + 28 E2E tests** — all passing. CI runs lint, unit, E2E, coverage and security checks on every push.

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

## � Tech Stack

- Node.js >= 20
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

## � Key Directories

| Path | Purpose |
|------|---------|
| `src/domain` | Business rules, entities, use cases |
| `src/application` | Controllers, middlewares, DTOs, validation builders |
| `src/infra` | Gateways, repositories, external services implementations |
| `src/main` | App entrypoint (`index.ts`), env config, factories, routes, Swagger |
| `tests` | Unit & integration tests (mirrors structure) |
| `scripts` | Maintenance / migration scripts |

## 🚀 Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd nodejs-tdd-clean-architecture

# Install dependencies
npm install

# Copy environment template and adjust values
cp .env.example .env

# (Optional) Start PostgreSQL + PgAdmin via Docker
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

## 🧪 Testing

```bash
# Run all unit tests
npm test

# Run E2E route tests (uses pg-mem — no real DB needed)
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# Specific integration target (examples)
npm run test:fb-api
npm run test:s3
```

Coverage reports stored in `coverage/` (HTML + lcov). Aim to keep >90% line coverage.

### CI Pipeline

GitHub Actions runs 5 parallel jobs on every push:

| Job | What it does |
|-----|-------------|
| `lint` | ESLint check |
| `test` | Unit tests (Jest) |
| `test-e2e` | E2E route tests with pg-mem |
| `coverage` | Coverage upload to Codecov |
| `security` | `npm audit` |

`build` runs only after `lint`, `test` and `test-e2e` all pass.

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
5. Subsequent protected endpoints require `Authorization: Bearer <accessToken>`.

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

## � Docker Setup

Defined in `docker-compose.yml`:
- `postgres`: PostgreSQL 15-alpine (initialized with `dump.sql`)
- `pgadmin`: DB admin UI (optional)

```bash
# Start services
docker compose up -d postgres pgadmin

# View logs
docker compose logs -f postgres

# Stop
docker compose down
```

Database credentials & names are configured via `.env` (see `.env.example`).

## 🔧 Environment Variables

See `.env.example` for annotated list. Production requires:
- `FB_CLIENT_ID`, `FB_CLIENT_SECRET`
- `JWT_SECRET` (>=32 chars)
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` (if S3 enabled)

Default development fallbacks exist but aren’t safe for production.

## � Quality & Maintenance

```bash
# Lint
npm run lint

# Lint with autofix
npm run lint:fix

# Dependency check/update suggestions
npm run check
npm run update

# Type-only check
npm run typecheck
```

Script `scripts/migrate.sh` helps clean/reinstall & rebuild in upgrade scenarios.

## 🪵 Logging

- Winston with optional daily rotate file transport (enable via env flags).
- Structured JSON logs for errors with stack trace.
- Startup shows port, environment, health endpoint.

## 📈 Roadmap / Possible Enhancements
- Add rate limiting & request tracing (e.g., pino-http or OpenTelemetry)
- Add refresh token & token revocation strategy
- Add containerized app service alongside DB (Docker) for one-command dev
- Expand health check with disk & external API reachability
- Add feature flags system (simple env-based or LaunchDarkly)
- Introduce caching layer (Redis) for tokens/profile images metadata

## 🤝 Contributing
1. Fork & clone
2. Create feature branch (`git checkout -b feat/my-change`)
3. Ensure tests & coverage remain high
4. Submit PR with clear description & rationale

## 🛡 License
MIT (see `LICENSE` if present). If missing, consider adding before distribution.

## 💬 Support
For questions open an Issue or consult Swagger spec.

---
Made with a TDD-first mindset for reliability and evolution.