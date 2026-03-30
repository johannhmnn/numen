set shell := ["zsh", "-cu"]

dev-api:
	cargo run -p numen-api

dev-web:
	cd apps/web && pnpm dev

test-rust:
	cargo nextest run --workspace

test-web:
	cd apps/web && pnpm test:unit -- --run

test-e2e:
	cd apps/web && pnpm test:e2e

lint:
	cargo fmt --check
	cargo clippy --workspace --all-targets -- -D warnings
	cd apps/web && pnpm lint

check:
	cargo nextest run --workspace
	cd apps/web && pnpm check
	cd apps/web && pnpm test:unit -- --run

ci:
	just lint
	just check
	just test-e2e

install-playwright:
	cd apps/web && pnpm exec playwright install
