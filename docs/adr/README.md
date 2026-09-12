# Architecture Decision Records

An ADR captures a single architecturally significant decision: the problem, the options considered, what was chosen, and what it costs. The README's [Trade-offs](../../README.md#trade-offs) section gives the one-line version of each of these; the records here give the reasoning room to breathe.

## Format

Each ADR follows a short version of Michael Nygard's template:

- **Status** — Accepted, Superseded, or Deprecated
- **Context** — the problem and constraints that forced a decision
- **Decision** — what was chosen
- **Consequences** — what this costs and what it rules out

## Index

| ADR | Decision |
|-----|----------|
| [0001](0001-clean-architecture-layering.md) | Clean Architecture layering (domain / application / infra / main), enforced by tooling |
| [0002](0002-express-as-thin-http-adapter.md) | Express as a thin HTTP adapter, not NestJS |
| [0003](0003-typeorm-for-persistence.md) | TypeORM for persistence |
| [0004](0004-pg-mem-for-e2e-tests.md) | pg-mem for E2E tests, real Postgres only in the `docker` CI job |
| [0005](0005-jwt-access-token-with-opaque-refresh-token.md) | JWT access token + opaque, server-side refresh token, not plain sessions |
| [0006](0006-sha256-hash-for-refresh-tokens.md) | SHA-256 (not bcrypt) to hash refresh tokens at rest |
| [0007](0007-csp-disabled-for-swagger-ui.md) | Content-Security-Policy disabled for Swagger UI |
| [0008](0008-in-memory-rate-limiting.md) | In-memory (not Redis-backed) rate limiting |
| [0009](0009-modular-monolith.md) | Modular monolith, not microservices |
| [0010](0010-refresh-token-reuse-detection-and-family-revocation.md) | Refresh-token reuse detection revokes the whole token family |
| [0011](0011-prometheus-metrics-endpoint.md) | Prometheus metrics endpoint instead of full OpenTelemetry tracing |
