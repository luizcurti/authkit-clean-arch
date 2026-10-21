# Architecture Decision Records

An ADR captures a single architecturally significant decision: the problem, the options considered, what was chosen, and what it costs. The records here hold the reasoning behind each decision; the root README only links to them.

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
| [0004](0004-pg-mem-for-e2e-tests.md) | pg-mem for the fast suites, real PostgreSQL where it matters |
| [0005](0005-jwt-access-token-with-opaque-refresh-token.md) | JWT access token + opaque, server-side refresh token, not plain sessions |
| [0006](0006-sha256-hash-for-refresh-tokens.md) | SHA-256 (not bcrypt) to hash refresh tokens at rest |
| [0007](0007-csp-disabled-for-swagger-ui.md) | ~~Content-Security-Policy disabled for Swagger UI~~ (superseded by 0012) |
| [0008](0008-in-memory-rate-limiting.md) | In-memory (not Redis-backed) rate limiting |
| [0009](0009-modular-monolith.md) | Modular monolith, not microservices |
| [0010](0010-refresh-token-reuse-detection-and-family-revocation.md) | Refresh-token reuse detection revokes the whole token family |
| [0011](0011-prometheus-metrics-endpoint.md) | Prometheus metrics endpoint instead of full OpenTelemetry tracing |
| [0012](0012-production-operational-surface.md) | Default CSP everywhere, docs off in production, ops endpoints behind a token |
| [0013](0013-atomic-refresh-token-rotation-and-reuse-grace-window.md) | Atomic, transactional refresh-token rotation and a 5-second grace window for concurrent refreshes |
| [0014](0014-account-identity-by-facebook-id.md) | Account identity by Facebook id first, email only to link, UNIQUE constraints |
| [0015](0015-private-picture-storage-and-s3mock.md) | Private picture storage (keys, no ACLs, CDN/pre-signed URLs) and S3Mock instead of LocalStack |
| [0016](0016-transactional-outbox-for-picture-cleanup.md) | Transactional outbox for deleting replaced pictures, compare-and-set picture changes |
