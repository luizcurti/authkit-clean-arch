# 0004 — pg-mem for E2E tests, real Postgres in the `docker` CI job

## Status
Accepted

## Context
E2E tests need a database, but requiring a real Postgres instance for every CI run (and every local `npm run test:e2e`) means slower feedback and one more moving part that can flake or fail to start. At the same time, an in-memory Postgres emulator can diverge from real Postgres behavior in ways that only show up against the real thing.

## Decision
E2E route tests (`tests/main/routes/**/*.spec.ts`) run against [`pg-mem`](https://github.com/oguimbal/pg-mem), an in-memory Postgres emulator, via `tests/infra/repos/mocks/connection.ts`'s `makeFakeDb`. It builds a TypeORM `DataSource` backed by pg-mem and calls `synchronize()` to create the schema directly from the entity definitions — no real network dependency, deterministic, fast.

Separately, the `docker` CI job boots the actual `docker-compose.yml` stack (real Postgres 15, real migrations, real seed data) and runs the same contract checks (`npm run test:api`) against it, specifically to catch anything pg-mem's emulation gets wrong.

## Consequences
- CI's `test-e2e` job needs zero external services and runs fast; local E2E runs don't require Docker.
- pg-mem tests use `synchronize()` against entities, not the actual migration files — a migration that's correct by hand-inspection can still diverge from what pg-mem accepts. The `docker` job's real-Postgres run is what actually validates the migration files themselves; that's a distinct responsibility from the fast pg-mem suite, not a redundant check.
- The fast test loop does not run route tests against a real Postgres testcontainer — that validation happens only in the `docker` CI job, at the cost of that job's slower, containerized run.
