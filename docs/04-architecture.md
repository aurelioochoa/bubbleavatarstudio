# 04 · Architecture

## 1. Layer diagram

```
┌──────────────────────────── app/ (React) ────────────────────────────┐
│  StudioShell · panels (Look/Moods/Loops/Share) · Stage · transport   │
│  durable state: useStudioStore (reducer)  ·  i18n  ·  persistence    │
└──────────────┬───────────────────────────────┬───────────────────────┘
               │ calls (pure)                  │ owns
┌──────────────▼──────────────┐   ┌────────────▼────────────────────────┐
│  render/ (pure TS)          │   │  playback/ (pure TS engine, in      │
│  scene.ts  doc+live→Scene   │   │  domain): clock, LoopPlayer, blink  │
│  svg.ts    Scene→SVG string │   │  emits LiveState on tick(tNow)      │
└──────────────┬──────────────┘   └────────────┬────────────────────────┘
               │                               │
┌──────────────▼───────────────────────────────▼────────────────────────┐
│                domain/ (pure TS, zero React/DOM imports)              │
│  geometry (blob paths, projection, easing) · document (types, create, │
│  mutate, kit copy-on-write, validate, migrate) · ids · ambient        │
└───────────────────────────────────────────────────────────────────────┘
```

Dependency rule: arrows point downward only. `domain/` imports nothing from
`render/` or `app/`. Enforced by ESLint `import/no-restricted-paths` (F0) and
by the test suite importing `domain/` in a bare node environment.

## 2. State management

**Durable document state** — single `StudioDocument` in a reducer store
(`useStudioStore`): all FR mutations are named actions (`bubble.add`,
`mood.updateDeltas`, `loop.reorderSteps`, …) implemented as pure functions in
`document/mutate.ts`. The reducer validates invariants transactionally: an
action either applies completely or returns the previous state + error
(FR-5.6 blocking rule lives here).

**High-frequency state** — a `StageEngine` (one per stage) owns the
`LoopPlayer` + ambient math and writes results **directly to DOM nodes via
refs** (transform/attribute patches) inside one rAF loop. React never re-renders
per frame (FR-11.2). React subscribes only to coarse engine status
(`idle|playing|paused`, current step index) via `useSyncExternalStore` for the
transport pill.

**Undo (v1 minimal):** drag operations stash pre-drag values and restore on
Esc; structural edits rely on explicit cancel in editors (FR-4.4).

## 3. Rendering pipeline

1. `buildScene(bubble, live, ambientOffset) → Scene` — a plain data tree
   (`{tag, attrs, children}`) in _scene units_.
2. `sceneToSvg(scene, {viewBox, background}) → string` — deterministic
   serializer (stable attribute order) used by both the DOM (via
   `innerHTML` on a static wrapper, then per-frame attribute patching) and
   snapshot export (FR-10.1).
3. Per-frame updates patch only: surface `transform`, eye `transform`,
   blink `scaleY`, color fills on mood change. Scene rebuild happens only when
   _structure_ changes (body edited, bubble switched).

Determinism requirement (tested): same inputs → byte-identical SVG string.

## 4. Playback engine

- `LoopPlayer(loopDef, moodLookup)` — pure state machine advanced by
  `advance(tAbsMs)`; computes step index, blend progress, pingpong direction;
  applies `springSpeed` and per-style base durations; interpolates mood deltas
  with easing (`easing.ts`: linear, easeInOut, spring approximation).
- `BlinkScheduler` — deterministic pseudo-random (seeded) intervals within
  min/max; produces blinkPhase 0→1→0 over durationMs; composes by scaling eye
  height after mood deltas (FR-5.5).
- Frame-rate independence (FR-6.3): `advance()` is a pure function of absolute
  time; tests drive it with a fake clock (`advance(t)`, `advance(t+16)`,
  `advance(t+1000)`) and assert identical outcomes vs frame counts.

## 5. Persistence

`app/persistence/local.ts` — `load(): StudioDocument | null`,
`save(doc)` (JSON, debounced 300 ms, synchronous schema re-validation on load;
corrupt data → backup copy + fresh document, never a crash). Storage key:
`bubble-studio.document.v1`.

## 6. Export & runtime

- `export/avatar-file.ts` — resolves effective kit, inlines it, prunes loops to
  selection, validates, serializes (FR-10.2/3).
- `export/snapshot.ts` — background painters (transparent/solid/linear/radial)
  - PNG rasterization via canvas drawImage of an SVG blob (browser-only; the
    pure parts are tested in node).
- `runtime/` — `BubbleAvatar.tsx`: props `definition`, `loop?`, `autoplay`,
  `size`, `paused?`; internally reuses `render/` + `playback/`; zero app
  imports (FR-10.4).

## 7. i18n

`app/i18n.ts` — one module holding a `MessageKey` union and a flat map per
locale; `translator(locale)` returns `t(key)`. Spanish is the source of truth;
`en` must define the same key set.

Parity is enforced by the **type system**, not a test: both maps are declared
`Record<MessageKey, string>`, so a key added to one and missed in the other
fails `pnpm typecheck`. (An earlier draft of this section claimed a test
enforced parity and placed the dictionaries in `i18n/{es.ts,en.ts}`; neither
was ever true.)

## 8. Directory map

The tree below is the real one (35 non-test modules). It replaces a map drafted
before implementation which named 35 paths, of which **18 never existed** and 17
did — so roughly half of it was aspirational, and the halves were not visually
distinguishable. Treat this section as descriptive, and re-derive it with
`find src -name '*.ts*' | grep -v '\.test\.'` rather than trusting it to stay
current.

```
src/
  domain/            # pure: no React, no DOM (lint-enforced)
    ids.ts
    geometry/{primitives.ts,projection.ts,shapes.ts}
    document/{types.ts,create.ts,mutate.ts,validate.ts,migrate.ts}
    playback/{LoopPlayer.ts,easing.ts,ambient.ts}
  render/            # pure
    color.ts  scene.ts  svg.ts
    goldens/{resting.svg,ambient.svg,live-3000.svg}
  export/            # mostly pure; png raster browser-only
    avatar.ts  zip.ts
  runtime/
    BubbleAvatar.tsx
  app/
    studio/{StudioView.tsx,store.ts}
    studio/panels/{LookPanel.tsx,MoodsPanel.tsx,LoopsPanel.tsx,SharePanel.tsx}
    studio/panels/look/{fields.tsx,SurfaceSection.tsx,EyesSection.tsx,
                        ExtrasSection.tsx,AmbientSection.tsx}
    stage/{Stage.tsx,StageEngine.ts}
    i18n.ts  persistence.ts  styles.css
  test/fixtures/{minimal.json,full.json}
```

Names that differ from the draft and are worth knowing: kit copy-on-write lives
inside `document/mutate.ts` rather than its own `kit.ts`; blink and step
durations live in `playback/ambient.ts` and `playback/LoopPlayer.ts` rather than
separate modules; both export builders are in `export/avatar.ts`; and the i18n
dictionaries are one `i18n.ts`, not a directory.

## 9. Key ADRs (ours)

- **ADR-1 (chosen):** single versioned document with ID-referenced loop steps —
  reordering/deleting can never corrupt references.
- **ADR-2 (chosen):** deterministic pure render+playback core so the studio
  stage, snapshots, and the runtime share one code path and tests can be
  string-exact.
- **ADR-3 (chosen):** rAF writes bypass React; React renders only durable
  state — keeps 60 fps with zero vdom churn.
