PROJECT       := bubbleavatarstudio
TAGLINE       := avatar studio — thin wrapper around the pnpm scripts
HELP_VARS      = PORT=$(PORT)  PM=$(PM)
HELP_EXAMPLE   = make dev PORT=3000

# ─── Preamble ────────────────────────────────────────────────────────────────
# -e stops a recipe at the first failing command; -o pipefail stops a gate that
# pipes through a filter from reporting the filter's exit code instead of the
# command's — without it, a suite that fails into `tail` "passes".
SHELL         := /usr/bin/env bash
.SHELLFLAGS   := -eo pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS     += --no-print-directory

# ─── Colour ──────────────────────────────────────────────────────────────────
# MAKE_TERMOUT (GNU Make >= 4.1) is set only when stdout is a terminal, and is
# the only reliable test available here: `test -t 1` inside $(shell ...) always
# reports false, because make captures that command's stdout through a pipe.
# So `make help | less` and CI logs stay clean. NO_COLOR disables, FORCE_COLOR
# overrides both.
COLOR ?= $(if $(MAKE_TERMOUT),1,0)
ifdef NO_COLOR
  COLOR := 0
endif
ifdef FORCE_COLOR
  COLOR := 1
endif
ifeq ($(COLOR),1)
  # Real ESC bytes, so a plain `echo` renders them without needing -e.
  C_HEAD := $(shell printf '\033[1m')
  C_CMD  := $(shell printf '\033[36m')
  C_OK   := $(shell printf '\033[32m')
  C_WARN := $(shell printf '\033[33m')
  C_ERR  := $(shell printf '\033[31m')
  C_DIM  := $(shell printf '\033[2m')
  C_OFF  := $(shell printf '\033[0m')
endif

# Explains why a core verb does not apply here, then fails.
NA = @printf '  $(C_ERR)make $@$(C_OFF) does not apply to $(PROJECT).\n  $(C_DIM)%s$(C_OFF)\n\n' $(1) >&2; exit 2

# Width of the target-name column in help; widen it where names are long.
HELP_PAD ?= 18

# PROJECT, TAGLINE, HELP_VARS and HELP_EXAMPLE are interpolated into a
# single-quoted shell string below, so none of them may contain an apostrophe.
##@ General
.PHONY: help
help: ## List the available targets
	@printf '\n  $(C_HEAD)$(PROJECT)$(C_OFF) — $(TAGLINE)\n'
	@printf '  $(C_DIM)usage: make <target>$(C_OFF)\n'
	@awk 'BEGIN { FS = ":.*?## " } \
	  /^##@ / { printf "\n  $(C_HEAD)%s$(C_OFF)\n", substr($$0, 5); next } \
	  /^[a-zA-Z0-9_.-]+:.*?## / { printf "    $(C_CMD)%-$(HELP_PAD)s$(C_OFF) %s\n", $$1, $$2 }' \
	  $(MAKEFILE_LIST)
	@printf '\n  $(C_DIM)Variables:$(C_OFF) $(HELP_VARS)\n'
	@printf '  $(C_DIM)Example:$(C_OFF)   $(HELP_EXAMPLE)\n\n'

# ─── End of the shared block ─────────────────────────────────────────────────

PM    ?= pnpm
PORT  ?= 5173
STAMP := node_modules/.install.stamp

##@ Setup
# A stamp file rather than node_modules itself: pnpm rewrites entries inside
# that directory constantly, so its mtime is not a reliable "up to date" signal.
$(STAMP): package.json pnpm-lock.yaml
	$(PM) install
	@touch $@

.PHONY: install
install: $(STAMP) ## Install dependencies (only when the manifests changed)

.PHONY: setup
setup: install ## First run on a fresh clone

##@ Development
.PHONY: dev
dev: $(STAMP) ## Run the studio dev server (PORT=5173)
	$(PM) dev --port $(PORT)

.PHONY: build
build: $(STAMP) ## Type-build and bundle to dist/
	$(PM) build

.PHONY: run
run: $(STAMP) ## Serve the production build locally
	$(PM) preview

.PHONY: demo
demo: $(STAMP) ## Run the demo script
	$(PM) demo

##@ Gates
.PHONY: test
test: $(STAMP) ## Run the unit/integration tests once (vitest run)
	$(PM) test

.PHONY: test-watch
test-watch: $(STAMP) ## Run the tests in watch mode (vitest)
	$(PM) test:watch

.PHONY: typecheck
typecheck: $(STAMP) ## Type-check without emitting
	$(PM) typecheck

.PHONY: lint
lint: $(STAMP) ## Lint with ESLint
	$(PM) lint

.PHONY: fmt
fmt: $(STAMP) ## Format the repo with Prettier (rewrites files)
	$(PM) format

.PHONY: fmt-check
fmt-check: $(STAMP) ## Check formatting without rewriting
	$(PM) format:check

# The project's own required gate (FR-11.3). Left delegating to `pnpm check`
# exactly as before, so the requirement keeps its single source of truth.
.PHONY: check
check: $(STAMP) ## REQUIRED GATE (FR-11.3): format, typecheck, lint, tests, build
	$(PM) check

# `pnpm check` already ends in a production build, so the full gate adds the
# Playwright visual smoke rather than building twice.
.PHONY: verify
verify: check e2e ## Full gate: the required gate, then the visual smoke

.PHONY: e2e
e2e: $(STAMP) ## Build, then run the Playwright visual smoke
	$(PM) e2e

##@ Cleaning
# Only git-ignored build output and caches. tsconfig.tsbuildinfo is tracked in
# this repo, so it is deliberately NOT removed here.
.PHONY: clean
clean: ## Remove build output and caches (dist, test-results, vite cache)
	rm -rf dist test-results node_modules/.vite

.PHONY: distclean
distclean: clean ## clean, plus node_modules
	rm -rf node_modules
	@printf "  dependencies removed; 'make install' to restore\n"

# ─── Compatibility aliases ───────────────────────────────────────────────────
# Kept because the README still uses these names.
.PHONY: preview watch format
preview: run
watch: test-watch
format: fmt
