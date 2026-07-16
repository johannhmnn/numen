## Code style
- Functions: 4-20 lines. Split if longer.
- Files: under 500 lines. Split by responsibility.
- One thing per function, one responsibility per module (SRP).
- Names: specific and unique. Avoid `data`, `handler`, `Manager`.
  Prefer names that return <5 `rg` hits in the codebase.
- No code duplication. Extract shared logic into a function/module.
- Early returns over nested ifs. Max 2 levels of indentation.
- Exception messages must include the offending value and expected shape.
## Comments
- Keep your own comments. Don't strip them on refactor — they carry
  intent and provenance.
- Write WHY, not WHAT. Skip `// increment counter` above `i++`.
- Docstrings on public functions: intent + one usage example.
- Reference issue numbers / commit SHAs when a line exists because
  of a specific bug or upstream constraint.
## Go diagnostics
- Before changing a symbol definition, run
  `gopls references file.go:line:column` and inspect the affected callers.
- After every Go source edit, run `gopls check -severity=hint <file>` for
  each changed `.go` file.
- Resolve errors, warnings, and hints, then rerun `gopls check` until clean.
  Informational diagnostics may be ignored only when demonstrably unrelated.
- Run `./bin/test` only after the edited Go files have no relevant diagnostics.
## Tests
- Tests run with a single command: `./bin/test`.
- Every new function gets a test. Bug fixes get a regression test.
- Mock external I/O (API, DB, filesystem) with named fake classes,
  not inline stubs.
- Tests must be F.I.R.S.T: fast, independent, repeatable,
  self-validating, timely.
- Work each feature in the full XP loop: code, test, refactor.
## Dependencies
- Inject dependencies through constructor/parameter, not global/import.
- Wrap third-party libs behind a thin interface owned by this project.
## Structure
- Follow Go conventions: `cmd/` for entrypoints, `internal/` for app code,
  `docs/adr/` for decisions, `bin/` for project workflows.
- Prefer small focused modules over god files.
- Predictable paths: `cmd`, `internal`, `docs`, `bin`.
## Formatting
- Use the language default formatter: `gofmt`.
- Keep `./bin/test` green before committing.
## Logging
- Structured JSON when logging for debugging / observability.
- Plain text only for user-facing CLI output.
