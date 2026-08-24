# Bubble Avatar Studio

Procedural SVG avatar authoring studio by helpbubble. Original clean-room work —
see `docs/CLEANROOM.md` before contributing.

## Docs

- `docs/01..08` — product overview, functional spec, data model, architecture,
  UI design, export formats, testing strategy, roadmap.
- `docs/research/` — provenance notes.

## Commands

```bash
pnpm install
pnpm dev        # studio at http://localhost:5173
pnpm check      # typecheck + lint + tests + build (required gate, also runs in CI)
pnpm e2e        # Playwright visual smoke against the preview build
```

`make help` lists the same targets if you prefer make; it delegates to these
scripts, which stay the single source of truth.

Screenshots of the smoke scenarios (boot, panels, playing loop) are archived
under `docs/screenshots/` by `pnpm e2e`.

## Status

Working toward feature parity with the concept it reimplements; see
`docs/08-roadmap.md` for phases and `docs/02-functional-spec.md` for the
requirements each one closes. Current gate: **254 tests across 23 files**, plus
a Playwright smoke of 4 scenarios — re-derive with `pnpm test` rather than
trusting this line.

Landed so far: the pure domain, render, export and runtime layers; a studio
shell reaching the whole body model; a projected face that gives the character
volume; idle behaviour (blink, micro-saccades, breathing) so a resting bubble
looks alive; and the P4 UI pass — a 56px rail of live thumbnails with a
rename/duplicate/reorder/delete menu, a stage carrying the status pill and the
transport dock, and a 360px inspector of collapsible cards on shared design
tokens; and the shape families (round / organic / drop) reaching the schema,
the renderer and the Look panel, on a v2 document that migrates v1 forward;
and the starter library — 24 moods across six expressive bands and 20 loops
split life/reaction, meeting FR-4.7 and FR-5.7.

Still open: the rest of roadmap P4 — the rotation gizmo and guide overlay, the
blink card and loop summary, the Moods modal editor with per-eye deltas,
drag-reorder and drag-to-scrub, and the Share loop checklist and radial
background. The starter library reaches **new** documents only; a project
already in localStorage keeps the kit it was saved with, and nothing in the UI
offers to refresh it (see `docs/08-roadmap.md` P3).
`docs/05-ui-design.md` marks each item **[built]** or **[target]**.

## Architecture

- `src/domain/` — pure domain: document types, validation, mutations with
  copy-on-write kits, geometry (superellipse and organic outlines, ellipsoid
  face projection), easing, LoopPlayer, blink, ambient idle motion.
- `src/render/` — deterministic scene composition + byte-stable SVG output,
  including colour maths for body shading (golden-tested in `src/render/goldens/`).
- `src/app/` — studio shell: rail/stage/inspector, panels, rAF StageEngine,
  reducer store, localStorage autosave, i18n es/en.
- `src/export/` — portable `*.bubble-avatar.json`, SVG/PNG snapshots, ZIP package.
- `src/runtime/` — SSR-safe `<BubbleAvatar/>` React runtime.

`docs/04-architecture.md` §8 carries the full module map.

## Law

1. TDD: no production code without a failing test first (`docs/07`).
   A regression test seen only passing is not evidence — confirm it fails
   against the unfixed code.
2. `src/domain` and `src/render` stay pure TypeScript (lint-enforced).
3. Never read upstream source code (see `docs/CLEANROOM.md` §3). Behavioural
   observation of the deployed app is allowed and logged in
   `docs/research/blackbox-notes.md`; feature parity means matching
   capabilities, never copying names, artwork or UI copy.
4. Goldens change only in a diff that states which values moved and why.
