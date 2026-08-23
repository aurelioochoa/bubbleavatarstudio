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
```

## Architecture

- `src/domain/` — pure domain: document types, validation, mutations with
  copy-on-write kits, geometry primitives, easing, LoopPlayer, blink, ambient.
- `src/render/` — deterministic scene composition + byte-stable SVG output
  (golden-tested in `src/render/goldens/`).
- `src/app/` — studio shell: rail/stage/inspector, panels, rAF StageEngine,
  reducer store, localStorage autosave, i18n es/en.
- `src/export/` — portable `*.bubble-avatar.json`, SVG/PNG snapshots, ZIP package.
- `src/runtime/` — SSR-safe `<BubbleAvatar/>` React runtime.

## Law

1. TDD: no production code without a failing test first (`docs/07`).
2. `src/domain` and `src/render` stay pure TypeScript (lint-enforced).
3. Never read upstream source code (see `docs/CLEANROOM.md` §3).
