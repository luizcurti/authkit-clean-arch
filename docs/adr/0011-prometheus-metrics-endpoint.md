# 0011 — Prometheus metrics endpoint instead of full OpenTelemetry tracing

## Status
Accepted

## Context
Structured logging and a per-request correlation id (`X-Request-Id`) exist, but give no aggregate view of request volume, latency distribution, or error rate across the API. Full distributed tracing (OpenTelemetry spans across HTTP → DB → Facebook → S3) only pays off with a backend to visualize it (Jaeger, Tempo, etc.), and this project runs no such backend. Wiring the OTel SDK and auto-instrumentation with no exporter would add dependency weight and configuration surface with no way to inspect the result.

## Decision
Add a self-contained Prometheus metrics endpoint instead: `src/main/middlewares/metrics.ts` registers a `http_request_duration_seconds` histogram and `http_requests_total` counter (labeled by method/route/status code), plus Node process defaults via `@prometheus-io/client`'s `collectDefaultMetrics` (the renamed `prom-client`). `GET /api/metrics` (`src/main/routes/metrics.ts`) exposes them in Prometheus text format — no external backend required to produce or inspect the data (`curl localhost:8080/api/metrics` is enough).

The system performs no distributed tracing.

The endpoint is operational, not public. It requires `OPS_TOKEN` when one is configured and is disabled in production when it is not (see [ADR-0012](0012-production-operational-surface.md)).

## Consequences
- Request-level metrics (rate, latency distribution, error rate per route) are available with one dependency and no additional infrastructure to run.
- The `route` label is the matched route pattern. Requests that match no route share the single label `unmatched`, so probing random URLs cannot create an unbounded number of time series.
- `src/main/**` is excluded from the unit-test coverage gate (composition-root code, exercised via E2E instead — see `jest.config.js`), so this is covered by a smoke E2E test (`tests/main/routes/metrics.spec.ts`) rather than a unit spec, consistent with how the rest of `main` is tested.
- This gives aggregate metrics, not causal traces — it can show "P99 latency on `/login/facebook` spiked" but not "which downstream call (Facebook API vs DB) caused it" the way a trace would. Diagnosing a specific slow request end-to-end is not something this system supports today.
