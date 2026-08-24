# Bubble Avatar Studio — thin wrapper around the pnpm scripts in package.json.
# Every target delegates to pnpm; the scripts stay the single source of truth.

PNPM ?= pnpm

.DEFAULT_GOAL := help

.PHONY: help install dev build preview test watch typecheck lint format check e2e clean

help: ## Show this help
	@echo "Bubble Avatar Studio — make targets"
	@echo
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies (pnpm install)
	$(PNPM) install

dev: ## Run the studio dev server at http://localhost:5173
	$(PNPM) dev

build: ## Type-build and bundle to dist/
	$(PNPM) build

preview: ## Serve the production build locally
	$(PNPM) preview

test: ## Run the unit/integration tests once (vitest run)
	$(PNPM) test

watch: ## Run the tests in watch mode (vitest)
	$(PNPM) test:watch

typecheck: ## Type-check without emitting
	$(PNPM) typecheck

lint: ## Lint with ESLint
	$(PNPM) lint

format: ## Format the repo with Prettier (rewrites files)
	$(PNPM) format

check: ## REQUIRED GATE: typecheck + lint + tests + build (same as CI)
	$(PNPM) check

e2e: ## Build, then run the Playwright visual smoke
	$(PNPM) e2e

# Only git-ignored build output and caches. tsconfig.tsbuildinfo is tracked in
# this repo, so it is deliberately NOT removed here.
clean: ## Remove build output and caches (dist, test-results, vite cache)
	rm -rf dist test-results node_modules/.vite
