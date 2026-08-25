# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install
pnpm dev                    # studio at http://localhost:5173
pnpm check                  # REQUIRED GATE: typecheck + lint + tests + build (same as CI)
pnpm test                   # vitest run (once)
pnpm test:watch             # vitest watch
pnpm e2e                    # build, then Playwright visual smoke against the preview build
pnpm format                 # prettier --write .
```

Run a single test file or a single test:

```bash
pnpm vitest run src/domain/playback/playback.test.ts
pnpm vitest run src/app/studio/StudioView.test.tsx -t "adds a bubble from the rail"
```

`make help` lists equivalent targets; every one delegates to the pnpm scripts,
which stay the single source of truth.

`pnpm e2e` overwrites the archived screenshots in `docs/screenshots/`. They are
artifacts for manual review against `docs/05-ui-design.md`, **not** goldens —
the stage runs ambient idle motion, so pixels differ between runs.

## Repo law

These are non-negotiable and predate any individual task. `docs/07` and
`docs/CLEANROOM.md` are the authorities.

1. **TDD.** No production code without a failing test first. A regression test
   seen only passing is not evidence — confirm it fails against the unfixed
   code (remove the fix and watch it fail) before trusting it.
2. **`src/domain` and `src/render` stay pure TypeScript** — zero React/DOM
   imports. Enforced by ESLint `import/no-restricted-paths` and by those tests
   running in a bare node environment.
3. **Cleanroom.** Never read upstream source code (`docs/CLEANROOM.md` §3 lists
   what is prohibited). Feature parity means matching _capabilities_; never
   copy names, artwork or UI copy. Behavioural observation of the deployed app
   is allowed and logged in `docs/research/blackbox-notes.md`.
4. **Goldens change only in a diff that states which values moved and why**
   (`src/render/goldens/*.svg`).
5. Test files reference the FR IDs they encode in their top comment. A roadmap
   task is done only when its FR tests pass.

## Architecture

Layers depend downward only (`docs/04-architecture.md` §1 has the full diagram):

- **`src/domain/`** — pure: document types, validation, mutations, geometry
  (superellipse/organic outlines, ellipsoid face projection), easing,
  `LoopPlayer`, blink, ambient idle motion, loop and document summaries, the
  library top-up.
- **`src/domain/content/`** — pure literal data, no logic: the 24-mood /
  20-loop starter library (FR-4.7, FR-5.7). Loops name moods by a stable local
  `key`; `starterKit()` in `document/create.ts` is the only thing that turns
  those keys into ids. Nothing here imports `create.ts` — the dependency runs
  one way, which is what keeps the library readable as a list.
- **`src/render/`** — pure: `scene.ts` composes document + live state into a
  `Scene`; `svg.ts` serializes it to a **byte-stable** SVG string (fixed
  attribute order, 2-decimal numbers). Same input → identical bytes, golden-tested.
- **`src/app/`** — studio shell: rail/stage/inspector, panels, `StageEngine`,
  reducer store, localStorage autosave, i18n.
- **`src/export/`** — portable `*.bubble-avatar.json`, SVG/PNG snapshots, ZIP.
- **`src/runtime/`** — SSR-safe `<BubbleAvatar/>`.

Seven cross-cutting mechanics that are not obvious from any single file:

**Copy-on-write kits.** A `Bubble` has `ownKit: Kit | null`; `null` means it
inherits `doc.starterKit`. Always resolve with `effectiveKit(bubble, doc)`
rather than reading either field directly. The first behaviour edit on an
inheriting bubble atomically clones the whole starter kit into `ownKit`
(`withOwnKit` in `document/mutate.ts`). This is why two bubbles can hold loops
with different IDs, and why the stage must stop playback when a bubble switch
leaves the current loop unreachable (FR-6.4).

**Transactional reducer.** Every mutation in `document/mutate.ts` returns a
`MutationResult`. `studioReducer` commits only if the result is ok _and_ the
resulting document re-validates; otherwise the previous document is kept and
`state.lastError` is set for the UI to surface (e.g. `E_REF` when deleting a
mood a loop still references, FR-5.6). Mutations never throw.

**The stage bypasses React per frame.** `StageEngine` owns the rAF loop and
writes SVG straight into its host element via `innerHTML`; React never
re-renders per frame (FR-11.2). Consequences: any stage overlay (status pill,
transport dock, gizmo pad, guide toggle) must be a _sibling_ of the engine's
host element, never a child — a child is wiped on the next frame, and
`Stage.test.tsx` asserts that directly. The engine also skips the DOM write when
the serialized SVG is byte-identical to the last frame, which is what makes a
paused stage cheap.

**The starter library reaches new documents only.** `starterKit()` runs inside
`createDefaultDocument()`, so a document already in localStorage keeps whatever
kit it was saved with — growing the library does not retro-fit saved projects.
That is deliberate: refreshing wholesale would clobber renamed or retuned
moods. But it means a returning user does not see new starter content, and it
is easy to mistake for a bug when the app shows four moods while the tests
assert twenty-four. **Verify library changes against a _fresh_ origin, not a
reloaded tab.**

`domain/document/library.ts` is the way out, and it is additive by
construction: `topUpKit()` appends only what a kit lacks and never renames,
retunes, reorders or removes, so no existing loop can lose its referent.
Matching is by _name_, because a saved document holds no link back to the
library entry it came from — so a renamed starter mood reads as missing and the
library entry returns beside the rename. `topUpLibrary(doc, bubbleId)` routes
to the kit that bubble actually reads: the shared starter kit when it inherits
(no copy-on-write fork), its own kit when it has diverged. Nothing in the UI
calls it yet — that is the last open P4/P3 item.

**Inspector overlays portal out of the scroll box.** `Modal` and
`Menu`/`MenuItem` live in `src/app/studio/ui.tsx`. `Modal` positions itself
against its nearest positioned ancestor rather than the viewport, and both the
mood editor and the import confirmation portal into the inspector `<aside>`
(`overlayHost`, threaded from `StudioView`). Two reasons, both load-bearing:
rendered in place, the inspector's `overflow-y-auto` clips the dialog header
against the tab strip; and a viewport-filling dim would hide the stage, which
is the thing a mood edit is meant to be judged against (FR-4.4). A panel
rendered without a host falls back to rendering in place, which is how the
panel tests drive it.

**The projection guide is opt-in at every layer.** `Scene.guide` is absent
unless a caller asks; `restingScene`/`moodScene`/`liveFrame` default it off and
only the stage passes true. That is what keeps snapshots, the ZIP, the runtime
and all three goldens byte-unchanged by it (FR-8.4). Its stroke is
`currentColor`, taken from the accent the stage host sets, so stage-only chrome
never hard-codes a palette value into the pure render layer.

**Three-state transport.** `playing | paused | stopped` (FR-6.2), owned by
`StudioView` and rendered by the stage dock. `stopped` rewinds the loop clock
but keeps ambient breathing; `paused` freezes everything. Picking a mood in the
Moods panel takes over the live state and pauses playback (FR-6.1/FR-4.4).

## Conventions

- **IDs** are `prefix_xxxxxxxx` via `newId(prefix)` in `src/domain/ids.ts`
  (crypto-backed, falls back to `Math.random`). Never hand-write an ID.
- **i18n is Spanish-first with es/en parity.** `MessageKey` in `src/app/i18n.ts`
  is a closed union; adding a key requires an entry in _both_ dictionaries or
  it fails typecheck. Never render a raw domain property name in the UI — route
  it through a message key.
- **UI colors come from the tokens** in `src/app/styles.css` (`@theme`), used as
  Tailwind utilities (`bg-panel`, `text-ink-dim`, `border-line`,
  `rounded-card`). Do not reintroduce hex literals in components. Inspector
  sections are built from `Card`/`Segmented`/`IconButton` in
  `src/app/studio/ui.tsx` so the radius, spacing grid and ≤160ms transition are
  stated once.
- Tests that render panels pass a spy `dispatch`; because the fields are
  controlled by props a spy never updates, commit a whole value in one change
  event rather than typing character by character.

## Docs

`docs/01..08` are product overview, functional spec (the FR-N.N IDs everything
cites), data model, architecture, UI design, export formats, testing strategy,
roadmap. `docs/05-ui-design.md` marks each UI item **[built]** or **[target]**
— it is a target document, so do not read an unmarked sentence as a claim about
what runs today.

Docs in this repo record measured numbers (test counts, bundle sizes) as
tripwires and say so. Re-derive them with `pnpm test` / `pnpm build` rather than
trusting the line; if a fresh run disagrees, the doc is stale and should be
updated in the same change.
