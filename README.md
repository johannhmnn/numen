# Numen

Numen is a local-first personal finance app for manual double-entry bookkeeping
and monthly expense reporting.

The first slice uses Go, SQLite, and a localhost-only web app so we can keep
the domain logic, persistence, and CRUD flow easy to iterate on.

## Stack

- Runtime: Go 1.26.4
- Web: `net/http`
- Persistence: SQLite via `modernc.org/sqlite`
- Test command: `./bin/test`

The stack rationale lives in [docs/adr/0001-stack.md](docs/adr/0001-stack.md).

## Development

Run the project test contract:

```sh
./bin/test
```

Start the local server:

```sh
go run ./cmd/numen
```

The bootstrap server binds to `127.0.0.1:8080` and exposes `GET /healthz`.
