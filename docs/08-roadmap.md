# 08 · Roadmap

> Execution order is fixed; TDD per `07-testing-strategy.md`. Each phase lists
> acceptance criteria (AC) — all must be green before the next phase starts.

## R — Design docs (done)

`CLEANROOM.md`, research notes, docs 01–08. AC: docs complete & consistent.

## F0 — Scaffold

Vite + React 19 + TS strict + Vitest + Tailwind 4; ESLint with layer-boundary
rule (domain imports nothing upward); `pnpm check` script; empty app boots.

- **AC:** `pnpm check` green; CI-equivalent local gate documented in README.

## F1 — Domain core (pure, TDD)

Order: ids → document types/create → validate → mutate (FR-1, FR-2 data, FR-3
data, FR-4.1–4.3, FR-5.1–5.6) → kit copy-on-write → geometry (blob path FR-2,
projection FR-8.2) → easing/durations → LoopPlayer + blink (FR-5, FR-6.2–6.4)
→ ambient (FR-7) → migrate stub.

- **AC:** full domain suite green incl. frame-rate-independence tests; zero
  React/DOM imports (lint-enforced).

## F2 — Render (pure, TDD)

`scene.ts` (doc+live→Scene) and `svg.ts` (Scene→string, deterministic);
golden-SVG tests; snapshot background painters (pure parts).

- **AC:** byte-exact goldens for resting/playing/blinking states; determinism
  test green.

## F3 — Studio UI (React, behavior-tested then visual)

Store + actions wiring; Shell layout; Look panel (FR-2, FR-3, FR-9.1); Moods
panel + editor modal (FR-4); Loops panel + timeline (FR-5); transport + stage
engine (FR-6, FR-8, FR-11.2); persistence autosave (FR-9.2); i18n es/en
(FR-9.4).

- **AC:** Testing Library flows green; manual visual pass vs `05-ui-design.md`;
  autosave round-trip (reload restores document).

## F4 — Export & runtime (TDD)

Avatar/project file builders (FR-10.2/3, FR-9.3); snapshot UI + PNG (FR-10.1);
`BubbleAvatar` runtime (FR-10.4); ZIP package (FR-10.5).

- **AC:** round-trip tests green; runtime renders identical SVG to studio for
  same definition+state.

## F5 — Hardening & final verification

Full `pnpm check`; Playwright visual smoke (boot, panels, playing loop);
README; final clean-room audit (grep for any upstream identifiers); tag v0.1.0.

- **AC:** all gates green; screenshots archived under `docs/screenshots/`;
  audit clean.
