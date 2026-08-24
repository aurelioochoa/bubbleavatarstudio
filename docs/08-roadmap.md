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

## G — Defect sweep (done)

Seven defects found by auditing the running app against this spec: a loop-less
kit crashing the studio, pause and stop not stopping the frame loop, an
unplayable loop throwing inside rAF, eye roundness and mood rotation X/Y never
reaching the renderer, a runtime `size` prop that sized only its wrapper, and a
CI pnpm pin that conflicted with `packageManager`. Each landed with the
regression test that reproduced it first.

- **AC:** each fix has a test confirmed red before it and green after.

## P — Parity (in progress)

Bring the app level with what the concept demands, per the feature inventory in
`docs/research/blackbox-notes.md` session 3.

- **P1 (done)** Volume: anchor the face on a projected surface (FR-8.2), shade
  the body, and keep a resting character alive — blinking, micro-saccades,
  breathing (FR-7).
- **P2 (done)** Shape vocabulary: the `round`, `organic` and `drop` families
  and their parameters (FR-2.6, FR-2.7), schema v2 plus the v1→v2 migration,
  and a shape control in the Look panel.

  The geometry had landed a step earlier (`9d957cf`) but nothing imported it —
  `scene.ts` still drew one superellipse. The wire-up is what closed P2:
  `Surface` carries the family, `migrate()` became a real chain, and the
  portable avatar format bumped alongside with `readPortableAvatar()` still
  accepting v1 files. The three render goldens are byte-unchanged across that
  commit, which is the evidence the migration default is behaviour-preserving
  rather than merely plausible.

- **P3 (next)** Content: a starter library of at least 24 moods (FR-4.7) and at
  least 20 loops grouped life/reaction (FR-5.7), all original. The kit ships 4
  moods and 2 loops today.

  Planned as a new pure `src/domain/content/` module of literal records, with
  `starterKit()` composing it, so `create.ts` stays about document creation.
  Two known snags: `StudioView.test.tsx` hard-codes the name `"mood 5"`, which
  is really `starterKit().moods.length + 1` and should be derived; and several
  tests reach for starter content by name or index (`happy`, `sleepy`, `idle`,
  `loops[1]` = `greet`, and `Stage.test.tsx` needs ≥2 loops). The render
  goldens are safe — they are driven by `test/fixtures/full.json`, not by
  `starterKit()`.

- **P4 (in progress)** Remaining UI surfaces.

  _Done:_ stage transport dock with status pill, owning playback for the whole
  app (FR-6.2); rail thumbnails, rename and reorder behind a context menu
  (FR-1.2, FR-1.4); loop duplicate and step reorder via the accessible ↑ ↓
  fallback (FR-5.2, FR-5.5); mood duplicate; collapsible inspector cards on
  shared design tokens; the rail and inspector at their documented 56px / 360px.

  _Open:_ loop rename, blink card and loop summary (FR-5.8); the Moods modal
  editor with per-eye deltas and mirror, plus mood rename/reorder and a kebab
  (docs/05 §2 — the roadmap had omitted these, docs/05 is the fuller list);
  rotation gizmo and guide overlay (FR-8.2, FR-8.4); Share loop picker, radial
  background, live preview, import summary and package example (FR-10.1,
  FR-10.3, FR-10.5); drag-reorder proper (the button fallback exists, the drag
  does not); drag-to-scrub numeric labels (FR-9.5).

  _Groundwork the open items need:_ there is no modal/dialog primitive anywhere
  in `src/app` yet, and both the Moods editor and the import summary want one;
  and `Menu`/`MenuItem` are still private to `BubbleRail.tsx`, so giving Moods
  or Loops a kebab means lifting them into `studio/ui.tsx` first. Most of the
  rest needs no new reducer actions — `loop/update` already carries `name`,
  `group` and `blink`, `mood/reorder` exists with zero call sites, and `svg.ts`
  already renders a radial background nothing offers in the UI.

  _Defect found while planning, still open:_ FR-8.3 says Esc restores the
  pre-drag rotation; `Stage.tsx` resets head rotation to zero instead. Needs a
  red-first regression test.

  _a11y gaps surfaced by the docs audit and since closed:_

  - Loop and mood delete now confirm, matching bubble-delete and import
    (`docs/05` §3). Both were pre-existing, not P4 regressions.
  - The primary indigo split by role so text-bearing fills clear 4.5:1
    (`#505bbd` / `#5662cc`) while the vivid `#6c7bff` stays on non-text marks.
    The audit had measured only the resting fill at 3.55:1; the contrast test
    written for the fix caught the hover fill at 2.66:1 as well.
    `src/app/theme.test.ts` now guards the whole palette.

- **AC:** `pnpm check` green per step; every FR above covered by a test that
  names it; a visual pass in a real browser, not only jsdom.

## F5 — Hardening & final verification

Full `pnpm check`; Playwright visual smoke (boot, panels, playing loop);
README; final clean-room audit (grep for any upstream identifiers); tag v0.1.0.

- **AC:** all gates green; screenshots archived under `docs/screenshots/`;
  audit clean.
