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
pnpm check      # typecheck + lint + tests + build (required gate)
```

## Law

1. TDD: no production code without a failing test first (`docs/07`).
2. `src/domain` and `src/render` stay pure TypeScript (lint-enforced).
3. Never read upstream source code (see `docs/CLEANROOM.md` §3).
