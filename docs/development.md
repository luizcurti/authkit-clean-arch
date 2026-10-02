# Development

## Requirements

- Node.js 24 (LTS) and npm 10+
- Docker with Compose v2 (PostgreSQL, S3Mock, and the full stack)

## Local setup

```bash
npm install
cp .env.example .env                 # values target the local PostgreSQL and S3Mock containers
docker compose up -d postgres s3mock
npm run migration:run                # apply migrations (TypeScript sources)
npm run db:seed                      # fixture user id=1 ("Loro"), used by the API contract tests
npm run dev                          # ts-node + node --watch on :8080, debugger on :9229
```

Health check: <http://localhost:8080/api/health>. Swagger UI: <http://localhost:8080/api-docs>.

`npm run dev` runs the TypeScript sources through `ts-node`, which emits the decorator metadata that TypeORM entities rely on. Path aliases (`@/…`) are resolved by `tsconfig-paths` in development and rewritten to relative paths by `tsc-alias` at build time, so no alias resolver runs in production.

`node scripts/generate-test-token.js [userId]` prints an access token for a user, signed the same way the API signs them with your `JWT_SECRET`.

## Lint, typecheck, build

```bash
npm run lint         # ESLint: formatting (@stylistic), code rules and the layer-boundary rule
npm run lint:fix     # apply automatic fixes
npm run typecheck    # tsc --noEmit over src and tests, strict mode
npm run build        # tsc + tsc-alias → dist/
```

## Test suites

| Command | What runs | Needs |
|---------|-----------|-------|
| `npm test` | Unit tests, including repository tests on pg-mem and the architecture boundary test | nothing |
| `npm run test:coverage` | Unit and route tests with coverage. The gate is 100% for lines, branches, functions and statements (`jest.config.js`) over all of `src`, `src/main` included; only re-export barrels, type-only modules and migrations are left out (`test:pg` runs the migrations up, down and up again) | nothing |
| `npm run test:e2e` | HTTP route tests through the real Express app on pg-mem | nothing |
| `npm run test:pg` | Integration tests against real PostgreSQL: concurrent rotation, transactions, unique constraints, `ON CONFLICT … WHERE`, outbox claiming (`SKIP LOCKED`) and concurrent picture changes. They run in their own database, `authkit_test`, created automatically | `docker compose up -d postgres` |
| `npm run migration:check` | Fails if entities and migrations diverge | PostgreSQL (`DB_DATABASE=authkit_test` in CI) |
| `npm run test:s3` | The S3 adapter against a real S3 API: upload, pre-signed download, delete | `docker compose up -d s3mock` and the S3 values from `.env.example`, or real AWS credentials |
| `npm run test:api` | The Postman collection, run with newman against a running API | the Docker stack, seeded |
| `npm run test:fb-api` | Live Facebook Graph API | a Facebook app and `FB_TEST_USER_TOKEN` in `.env` |

Skipped tests:
- `test:s3` skips itself when neither an S3 endpoint nor real credentials are configured.
- `test:fb-api` skips its live test when `FB_TEST_USER_TOKEN` is unset. Test-user tokens are short-lived and cannot be committed.

## API contract tests

The Postman collection in [`api/`](api) is the API contract suite. It covers:

- every endpoint's success response and every error response that does not need the server to fail: validation (missing, null, empty, wrong type), authentication (no header, other scheme, malformed, expired, other audience), unknown user, malformed JSON, payload too large, invalid uploads, unknown routes;
- refresh token rotation end to end: rotate, use the new access token, replay within the grace window, replay after it (the session is revoked), expiry, logout;
- a real picture upload (PNG and JPG), replace and delete through S3Mock, including that the previous object is gone;
- on every response, an `X-Request-Id`, and on every error the exact `{ error, requestId }` shape.

```bash
RATE_LIMIT_PER_MINUTE=1000 AUTH_RATE_LIMIT_PER_MINUTE=1000 docker compose up -d --build
docker compose exec app npm run db:seed
npm run test:api
```

`scripts/api-collection-test.js` signs the access tokens (valid, expired, another audience, unknown user), seeds refresh tokens for the seeded user straight into the database (a real one only comes from a Facebook login), generates the oversized upload, and runs the collection with `newman`. newman is fetched by `npx` at a pinned version rather than installed as a devDependency, because its dependency tree carries advisories that would fail `npm audit`.

Running notes:
- **Rate limits.** A run sends about 35 requests to login, refresh and logout, more than the default 10 per minute, so the stack is started with raised limits as above. The limits themselves are covered by the route tests.
- **Not covered by the collection.** A successful Facebook login needs a real Facebook token; it is covered by the route tests with Facebook stubbed, and live by `test:fb-api`. Responses that need the server to fail (500, 502, the 409 race) are covered by the route tests and `test:pg`.

To run it in the Postman app:
1. Import the collection and `environment.postman_environment.json`.
2. Set `accessToken` to the output of `node scripts/generate-test-token.js 1`. The requests that need the other tokens, the seeded refresh tokens or the generated fixture only pass under `npm run test:api`.
3. Set the working directory to `docs/api`, so the upload fixtures resolve.
4. Run the requests in order: the picture requests share state.

## Migrations

The schema is owned by TypeORM migrations in `src/infra/repos/postgres/migrations/`.

```bash
npm run migration:generate -- src/infra/repos/postgres/migrations/DescriptiveName   # from entity changes
npm run migration:run          # TypeScript sources (local)
npm run migration:run:prod     # compiled output (what the compose `migrate` service runs)
npm run migration:revert
npm run migration:check        # entities and migrations in sync
```

## CI pipeline

`.github/workflows/ci.yml` runs on every push and pull request to `main` and `develop`. Any failing step fails the build.

**quality** job:
- ESLint, including formatting and the import-boundary rule.
- `tsc --noEmit` over `src` and `tests`.
- `npm audit` (blocking). Snyk is advisory and runs only when the `SNYK_TOKEN` secret is set.
- Build.

**verify** job:
1. Unit and E2E route tests with the 100% coverage gate (one run; `test:e2e` is the same route tests without coverage, for local use).
2. Start PostgreSQL and S3Mock. Run the real-Postgres tests (migrations up/down/up included), the migration drift check, and the S3 adapter tests.
3. Build the Docker image and start the Compose stack with raised rate limits. The `migrate` service runs first.
4. Seed the database, then run the API contract suite against the container.
5. Assert that the image exits with status 1 when started with `NODE_ENV=production` and no secrets.

## Housekeeping

- **`husky` pre-commit hook**: runs `lint-staged`, which applies `eslint --fix` and runs related Jest tests on staged `.ts` files.
- **Dependabot**: opens weekly PRs for npm, GitHub Actions and the Docker base image. It ignores odd (non-LTS) Node majors and TypeScript majors.
- **`npm run check` / `npm run update`**: list outdated dependencies, or bump them in `package.json`.
