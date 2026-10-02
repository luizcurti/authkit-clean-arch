# 0004 — pg-mem for the fast suites, real PostgreSQL where it matters

## Status
Accepted

## Context
Unit and E2E tests need a database. Requiring a real Postgres instance for every run means slower feedback and one more moving part. An in-memory emulator, though, can diverge from real Postgres in ways that only show up against the real thing.

## Decision
- **Fast suites on pg-mem.** Unit and E2E tests (`npm test`, `npm run test:e2e`) run against [`pg-mem`](https://github.com/oguimbal/pg-mem) through `tests/infra/repos/mocks/connection.ts` (`makeFakeDb`). It builds a TypeORM `DataSource` on pg-mem and creates the schema with `synchronize()` from the entities. No network, deterministic, fast.
- **Real PostgreSQL elsewhere.** Behaviour that pg-mem cannot reproduce is tested against the Compose PostgreSQL, in the CI `verify` job:
  - `npm run test:pg` covers concurrency (row locks), transactions, unique constraints and `ON CONFLICT … WHERE`. It runs in its own `authkit_test` database.
  - `npm run migration:check` fails when the entities and the migration files diverge.
  - The Docker stack applies the real migrations, and the Postman collection (`npm run test:api`) runs against it.

## Consequences
- Unit and E2E runs need no external services. Local runs of those suites don't require Docker.
- pg-mem builds its schema from the entities, not from the migrations. The migration files are validated by `migration:check` and by the migrated Docker stack.
- pg-mem runs queries one at a time and ignores some SQL, such as the `WHERE` of `ON CONFLICT … DO UPDATE`. Any rule that depends on that needs a test in `tests/postgres/`, not only in the pg-mem suites. [ADR-0013](0013-atomic-refresh-token-rotation-and-reuse-grace-window.md) and [ADR-0014](0014-account-identity-by-facebook-id.md) rely on these tests.
