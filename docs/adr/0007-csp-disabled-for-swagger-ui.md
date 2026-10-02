# 0007 — Content-Security-Policy disabled for Swagger UI

## Status
Superseded by [ADR-0012](0012-production-operational-surface.md)

The premise below turned out to be wrong for the current Swagger UI: `swagger-ui-express` loads its scripts as files (`script-src 'self'`) and only inlines CSS, which Helmet's default CSP already allows. What actually broke the docs page was an unrelated middleware that labelled every response, including the Swagger HTML, as `application/json`. Kept for history.

## Context
Helmet's default `contentSecurityPolicy` blocks inline `<script>`/`<style>` tags. Swagger UI (served at `/api-docs`) relies on inline scripts to bootstrap its React app, so Helmet's default CSP breaks the docs UI outright.

## Decision
Disable Helmet's CSP (`helmet({ contentSecurityPolicy: false })` in `src/main/config/middlewares.ts`) while keeping every other Helmet protection on: HSTS, frame protection (clickjacking), MIME-sniff protection, etc.

## Consequences
- Swagger UI works out of the box with no custom nonce/hash wiring.
- The API has no CSP header on any response, not just `/api-docs` — this is a real, documented gap rather than an oversight, and it's the trade-off this ADR exists to make explicit.
- The correct fix, if this needed to be production-hardened further, is a **per-route** CSP: a permissive policy scoped to `/api-docs` (with a nonce for Swagger UI's inline script) and a strict default-deny CSP everywhere else. That's more configuration than this project's scope currently justifies, given the API has no browser-rendered pages outside of Swagger itself.
