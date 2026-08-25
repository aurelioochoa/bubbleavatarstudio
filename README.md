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

Screenshots of the ten smoke scenarios are archived under `docs/screenshots/`
by `pnpm e2e`. They are artifacts for a human to read against
`docs/05-ui-design.md`, not goldens — the stage animates, so pixels differ
between runs.

## Status

**v0.1.0.** Every roadmap phase is closed, F5 included. See
`docs/08-roadmap.md` for the phases and `docs/02-functional-spec.md` for the
requirements each one closes. Current gate: **360 tests across 31 files**, plus
a Playwright smoke of 10 scenarios — re-derive with `pnpm test` rather than
trusting this line.

Landed so far: the pure domain, render, export and runtime layers; a studio
shell reaching the whole body model; a projected face that gives the character
volume; idle behaviour (blink, micro-saccades, breathing) so a resting bubble
looks alive; the shape families (round / organic / drop) reaching the schema,
the renderer and the Look panel, on a v2 document that migrates v1 forward; and
the starter library — 24 moods across six expressive bands and 20 loops split
life/reaction, meeting FR-4.7 and FR-5.7.

Roadmap **P4 is complete**. The studio now has a 56px rail of live thumbnails
that reorder by drag or by menu; a stage carrying the status pill, the
transport dock, a rotation gizmo covering all three axes across ±180° and a
projection guide drawn from the same projection the eyes use; a Moods modal
editor with all seven deltas per eye, a mirror action and a colour override on
body and eyes; a Loops panel with grouping, rename, the blink card and a
summary that shares its step expansion with the player; a Share panel with a
live preview, radial backgrounds, a loop checklist and an import confirmation
that counts what is in the file; and drag-to-scrub on every numeric label.

**F5 closed it out.** The starter library now reaches saved projects too: the
Moods panel offers what a kit lacks, and only while it lacks something. The
smoke grew to ten scenarios, weighted towards what jsdom models loosely —
modal focus and both drags. The screenshots were re-archived and read against
`docs/05-ui-design.md`, which found one clipped label. The `invalid/` fixtures
exist, one per validation rule. The clean-room audit is recorded as
`docs/CLEANROOM.md` §6; it found one piece of upstream UI copy ("Photo Mode"),
now our own word.

Separately, `docs/research/3d-bubble-exploration.md` records three real
rendering defects around a full turn — the shading gradient walking off the
character past ~140° of yaw, extras that do not participate in the projection,
and no contact shadow — plus a larger, unscheduled idea for a silhouette that
actually turns. None of it is on the roadmap yet.

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
