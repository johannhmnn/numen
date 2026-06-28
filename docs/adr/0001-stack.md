# ADR 0001: First-slice stack

## Status

Accepted on 2026-06-27.

## Context

Numen's first slice is a local-only manual ledger with SQLite-backed CRUD,
double-entry domain rules, and lightweight monthly reporting. The main risk in
the first task is picking a stack that adds friction before we even prove the
developer loop.

The product notes already narrowed the spike to Go versus Rust for the backend,
with SQLite as a hard requirement and a local web app as the delivery surface.

## Decision

We will use:

- Go 1.26.4 for the application runtime.
- The standard library `net/http` package for the first web surface.
- SQLite for persistence, using `modernc.org/sqlite`.
- A localhost-only server for v1.
- `./bin/test` as the single project test command.

We are explicitly not bootstrapping a separate frontend framework in Task 1.
If the UI later needs a richer client-side layer, Svelte remains the preferred
choice, but only after the domain and persistence seams are stable enough to
justify the extra toolchain.

## Why this stack

- Go keeps the local CRUD loop fast: compile times, test speed, and stdlib HTTP
  support are all strong for a small app.
- `modernc.org/sqlite` avoids CGO, which lowers setup friction for a local app.
- `net/http` is enough to validate the backend shape now without premature
  frontend complexity.
- The result still aligns with the earlier product direction: local web app,
  SQLite persistence, and a backend stack with good portfolio and hiring signal.

## Consequences

- We optimize for a fast backend-first XP loop in the first slice.
- SQLite integration is validated early through an in-memory smoke test.
- If a richer browser UI becomes the next bottleneck, we can add Svelte behind
  a stable Go-backed contract instead of guessing up front.
