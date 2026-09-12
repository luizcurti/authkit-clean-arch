# 0001 — Clean Architecture layering, enforced by tooling

## Status
Accepted

## Context
Authentication services accumulate framework coupling fast: a token check ends up importing Express types into a use case, a repository leaks a TypeORM entity into a controller, and within a few months the "business logic" can no longer be tested without booting the whole stack. The goal of this project is to demonstrate that the dependency rule can be kept honest over time, not just at `git init`.

## Decision
Split the codebase into four layers with a one-directional dependency rule:

```
domain        — entities, use cases; no imports from outside domain
application   — controllers, DTOs, validation; may depend on domain contracts
infra         — concrete adapters (Postgres/TypeORM, Facebook API, S3, JWT, Winston)
main          — composition root; the only layer allowed to wire concrete infra into use cases/controllers
```

`domain` and `application` depend only on locally-defined contracts (interfaces). `infra` implements those contracts. `main` is the only place that imports both a contract and its concrete implementation to wire them together (see the factories under `src/main/factories/**`).

The rule is enforced two independent ways so that one broken gate doesn't silently regress the architecture:
1. An ESLint `no-restricted-imports` rule (`eslint.config.js`) fails `npm run lint` if `domain`/`application` import `express`, `typeorm`, `axios`, `jsonwebtoken`, `@aws-sdk/*`, or anything under `infra`/`main`.
2. `tests/architecture/import-boundaries.spec.ts` statically re-scans the same files for the same banned imports, independent of ESLint config, and fails the `test` CI job.

## Consequences
- Domain and application code is testable with plain mocks/stubs — no framework bootstrapping needed for unit tests (see the 287 unit tests, none of which touch Express or a real database).
- Swapping infrastructure (e.g. TypeORM → a different ORM, or Postgres → another RDBMS) is scoped to `infra/repos/postgres/**` and the factories in `main` — domain/application are untouched.
- The cost is indirection: every dependency crosses through a contract + a factory, which is more ceremony than a framework-first design for a project this size. That ceremony is the point here — it's what's being demonstrated.
- If someone disables the ESLint rule inline, the architecture test still catches the violation — a single enforcement mechanism is one config change away from silently disappearing, so the two checks are independent by design.
