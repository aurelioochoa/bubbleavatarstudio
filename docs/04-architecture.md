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

`app/i18n/{es.ts,en.ts}` exporting flat key maps; `t(key)` from a tiny context
provider. Spanish is the source of truth; en must define the same key set
(test enforces key parity).

## 8. Directory map

```
src/
  domain/            # pure
    ids.ts  ambient.ts  easing.ts
    geometry/{blob.ts,projection.ts}
    document/{types.ts,create.ts,mutate.ts,kit.ts,validate.ts,migrate.ts}
    playback/{loop-player.ts,blink.ts,durations.ts}
  render/            # pure
    scene.ts  svg.ts
  export/            # mostly pure; png raster browser-only
    avatar-file.ts  project-file.ts  snapshot.ts
  runtime/
    BubbleAvatar.tsx
  app/
    studio/{StudioShell.tsx,store.ts,useStageEngine.ts}
    studio/panels/{LookPanel.tsx,MoodsPanel.tsx,LoopsPanel.tsx,SharePanel.tsx}
    stage/{Stage.tsx,transport.tsx,Gizmo.tsx}
    i18n/{es.ts,en.ts,I18nProvider.tsx}
    persistence/local.ts
    styles.css
```

## 9. Key ADRs (ours)

- **ADR-1 (chosen):** single versioned document with ID-referenced loop steps —
  reordering/deleting can never corrupt references.
- **ADR-2 (chosen):** deterministic pure render+playback core so the studio
  stage, snapshots, and the runtime share one code path and tests can be
  string-exact.
- **ADR-3 (chosen):** rAF writes bypass React; React renders only durable
  state — keeps 60 fps with zero vdom churn.
