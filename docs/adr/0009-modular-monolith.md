# 0009 — Modular monolith, not microservices

## Status
Accepted

## Context
The system has a small number of bounded concerns (authentication, user profile, file upload) that could, in principle, be split into separate services. Splitting has a real cost: network calls where there were function calls, distributed transactions or eventual consistency where there was a single database transaction, and operational overhead (multiple deployables, service discovery, distributed tracing) that has to be justified by an actual constraint.

## Decision
Ship as a single deployable modular monolith, with the module boundaries expressed as the Clean Architecture layering ([ADR-0001](0001-clean-architecture-layering.md)) rather than as separate services.

## Consequences
- One deployment, one database, one set of migrations — no distributed-systems failure modes to design around (partial failures, network partitions between services, saga-style compensation) for problems this project doesn't have.
- The layering isolates business rules from infrastructure and gives each concern (authentication, user profile, file upload) a clear boundary within the single deployable, without the network calls, service boundaries, and deployment coordination that separate services add.
- There is no operational constraint (e.g. independent scaling of file uploads) or organizational constraint (separate teams owning separate services) that the current single deployable fails to meet.
