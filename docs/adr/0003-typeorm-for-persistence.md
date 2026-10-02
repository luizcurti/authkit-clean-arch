# 0003 — TypeORM for persistence

## Status
Accepted

## Context
The user/refresh-token model needs relational guarantees: a unique constraint on the refresh token hash, a foreign key from refresh tokens to users, and transactional consistency when a login both creates/updates a user and issues a token. The schema also needed to be owned by versioned migrations rather than hand-maintained SQL dumps.

## Decision
Use TypeORM as the ORM/migration tool behind `LoadUserAccount`, `SaveFacebookAccount`, and the refresh-token repository contracts (`src/domain/contracts/repositories/**`). Entities live in `src/infra/repos/postgres/entities/**`; migrations are generated from them into `src/infra/repos/postgres/migrations/**`.

## Consequences
- Migrations are generated from entity diffs (`npm run migration:generate`) instead of written by hand, which keeps schema and code in sync.
- Because `domain`/`application` only see repository contracts (per [ADR-0001](0001-clean-architecture-layering.md)), TypeORM usage is contained to `infra/repos/postgres/**` plus the factories that wire it — it has no ripple into business logic.
- TypeORM 1.x's decorator-based entity style is one more thing to be fluent in on top of plain SQL, in exchange for declarative migration generation and unique/FK constraints expressed in code that a query-builder or raw-SQL approach does not provide.
