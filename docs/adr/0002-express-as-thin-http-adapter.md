# 0002 — Express as a thin HTTP adapter, not NestJS

## Status
Accepted

## Context
NestJS bakes in dependency injection, module boundaries and decorators that would give the project "architecture" for free, but that also means the framework — not a deliberate design — is what enforces structure. The purpose of this project is to demonstrate Clean Architecture decisions explicitly (see [ADR-0001](0001-clean-architecture-layering.md)), so leaning on a framework's opinions would undercut the point.

## Decision
Use Express purely as an HTTP adapter at the edge of the `main` layer. Routes (`src/main/routes/**`) translate HTTP requests into plain-object inputs and hand them to framework-agnostic controllers (`src/application/controllers/**`) via an adapter (`src/main/adapters/express-router.ts`). No domain or application code imports `express`.

## Consequences
- The dependency-inversion story is explicit and inspectable rather than implicit in framework conventions — useful for demonstrating the architecture in an interview or review, which is a stated goal of this project.
- Express usage is contained to `src/main/adapters/**` and `src/main/routes/**` — no other layer imports it.
- The cost is more boilerplate than NestJS would require (manual factories instead of a DI container, hand-written route-to-controller adapters). That cost is accepted because the boilerplate *is* the architecture being demonstrated, not overhead to eliminate.
