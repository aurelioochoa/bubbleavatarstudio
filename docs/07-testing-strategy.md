# 07 · Testing Strategy — TDD is mandatory

## 1. Policy (repo law)

1. **No production code without a failing test first.** Workflow per unit:
   red (test encodes a requirement ID) → green (minimal implementation) →
   refactor (stay green).
2. Every test file references the FR IDs it encodes in its top comment; the
   roadmap task is "done" only when its FR tests pass.
3. `pnpm check` (typecheck + tests + build) must be green before any commit is
   considered final. CI runs the same gate.

## 2. Layers & tools

| Layer            | Tool                             | What is tested                                                                                                                                                                 |
| ---------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `domain/` (pure) | Vitest (node env)                | Geometry math, document mutations/invariants, kit copy-on-write, validation, migration, playback timing with **fake clocks**, blink determinism, ambient math                  |
| `render/` (pure) | Vitest (node env)                | Scene building from fixtures; **byte-exact** SVG serialization (golden strings); determinism (same input → same bytes)                                                         |
| `export/`        | Vitest                           | Avatar/project file builders (round-trip: export → validate → import → deep-equal), loop pruning, orphan-mood pruning, error codes                                             |
| `app/` UI        | Vitest + Testing Library (jsdom) | User flows: create bubble, edit mood deltas with cancel restoring stage, linked-eye mirroring, loop step reorder keeps moodId, import confirmation gate, i18n key parity es/en |
| `runtime/`       | Vitest + Testing Library         | Renders resting face from a definition; starts/pauses; identical SVG vs studio for same state (FR-10.4)                                                                        |
| Theme a11y       | Vitest (parses `styles.css`)     | Contrast ratios computed from the real tokens: >= 4.5:1 for every text pair, >= 3:1 for non-text marks (`docs/05` §3). A palette edit that breaks the rule fails here          |
| Visual smoke     | Playwright (F5 only)             | Screenshots of studio boot, each panel, a playing loop and the rail context menu; asserts the stage dock and status pill; manual review vs `05-ui-design.md`                   |

## 3. Timing tests (the critical ones — FR-6.3)

`LoopPlayer` is advanced with an injected clock:

```ts
const p = new LoopPlayer(loop, moods);
p.advance(0);
p.advance(1000); // 1 big frame
const q = new LoopPlayer(loop, moods);
for (let t = 0; t <= 1000; t += 16) q.advance(t); // 62 small frames
expect(stateOf(p)).toEqual(stateOf(q)); // frame-rate independence
```

Blink uses a seeded PRNG: same seed → same schedule (assert exact interval
sequence); ambient is a pure function of `(t, config)` (assert zero offset at
t=0 and periodicity).

## 4. Fixtures

`src/test/fixtures/` — canonical documents: `minimal.json` (1 bubble, no kit)
and `full.json` (2 bubbles, own kit on the first, 2 moods and 1 loop in each
kit). Both are loaded through `validateDocument`, so schema drift breaks tests.

These stay hand-written and deliberately small — they are _not_ built from
`starterKit()`. That is what keeps `src/render/goldens/*.svg` frozen when the
starter library grows, and it was re-verified when P3 took the kit to 24 moods
and 20 loops.

`src/test/fixtures/invalid/` — one document per validation rule, each derived
from `minimal.json` and broken in exactly one place. The filename carries the
code it must fail with (`E_REF.step-names-a-missing-mood.json`), and
`validate.test.ts` globs the directory: a new case needs no test edit, a
fixture that fails with the wrong code fails by name, and one that trips a
second rule as well fails the "exactly one rule each" case. A roster in that
test mirrors the `ErrorCode` union, so a code shipped without a fixture breaks
the suite.

Writing them found dead weight: `E_ID` was declared in the union and emitted
nowhere — docs/03 §7 rule 2 asks for unique ids, not for an id _format_ — so
it is gone rather than given a fixture that could not be written.

The inline cases in `validate.test.ts` stay. They cover the same codes reached
from other places in the tree (a broken ref inside an `ownKit`, a bad
transition, a non-integer seed), which one file per code cannot express.

## 4b. Current state (re-derive; do not trust)

As of the track redesign (F6): **36 Vitest files, 600 tests**, plus **1
Playwright spec** of **11 scenarios** — boot, panels, a playing loop and the
rail menu, joined by the mood editor's focus behaviour, the gizmo, the
wireframe, the Share preview, drag-to-scrub, drag-to-reorder, and a 1024×720
check that the track's first row and the inspector do not clip. Production
bundle 343.42 kB JS / 37.86 kB CSS (102.86 / 7.47 gzipped).

Two of those scenarios exist because jsdom cannot decide them. The playing
loop asserts the **playhead has moved**: jsdom can prove the writer runs, not
that the engine's frames arrive. And the narrow-window case is a layout
question, which jsdom has no answer to at all.

Ten tests over the 456 that preceded them, in two batches.

Five are `solid.test.ts`'s pole-on and convergence blocks, and each failed
against the sampler as it stood. Three cover the pole: a solid of revolution
seen down its own axis is the ellipse its widest ring projects to, no bin near
the pole collapses into a notch, and a bin counts as reached only when a real
sample reached it. Two cover the sampler's convergence, which is the measure
that cannot be fooled by real geometry — compare a reading against a heavily
oversampled reading of the same solid and anything the shape really has
cancels. That is what caught the shallow-body case the pole tests miss, and it
is the tool to reach for when a silhouette looks wrong and it is not obvious
whether the shape or the sampler is at fault.

Five more are `migrate.test.ts`'s v4 -> v5 block: the top-up closes the library
gap, keeps every mood the project already had by id, leaves a renamed mood
alone, reaches a bubble's own kit as well as the shared one, and does not run
again on a v5 document — which is what keeps a deleted starter mood deleted.

The 91 tests over F5's 360 are the solid body's: `solid.test.ts` is the new
file (the turned silhouette, its agreement with the analytic ellipsoid, the
memo, and the assertion that an organic body's lumps travel), and the rest are
spread across authored depth and its v3 migration, the radial wobble, the
wireframe mesh, the face clip, the rim light, extras sharing the body's volume,
the cube family, and the depth every assembled primitive now carries. The
bundle moved 7.9 kB, almost all of it `solid.ts`.

Earlier, the 17 tests over P4's 343 were F5's own: the library top-up through
the store and its Moods-panel row, and the nine `invalid/` fixtures with the
three cases that police them.

Earlier in the P4 completion pass the reading was 292.47 / 28.59 kB across 343
tests and 4 e2e scenarios.

The JS grew 17.9 kB over P3 (274.55 kB) and the CSS 2.4 kB (26.20 kB). That is
the whole of P4's remaining surface arriving at once: the modal and menu
primitives, the mood editor with fourteen delta sliders, the loop summary and
blink card, the rotation gizmo and projection guide, the Share preview and loop
picker, and the two drag behaviours.

The test count grew 89 over P3's 254, across eight new files. Three are pure
domain — `playback/summary.test.ts`, `document/summary.test.ts` and
`document/library.test.ts` — and five are app: `ui.test.tsx`,
`dragReorder.test.tsx`, `panels/MoodsPanel.test.tsx`,
`panels/LoopsPanel.test.tsx` and `panels/look/fields.test.tsx`. Two of those
panels had been covered only indirectly through `StudioView.test.tsx` before,
which is why several of their behaviours had never been asserted at all.

One trap when re-deriving the CSS figure: Tailwind v4 scans every non-ignored
file in the repo for class candidates, **markdown included**. An untracked
research note containing the words "shadow" and "invisible" in prose adds
`.shadow` and `.invisible` rules and inflates the CSS by ~0.27 kB. Measure on a
clean tree, or the number reflects your scratch files rather than the app.

Earlier readings, kept as the trend rather than as claims about today: P3 was
274.55 / 26.20 kB, P2 269.46 kB JS, and the first P4 UI pass 267.09 kB JS
against a CSS that had roughly doubled from P2's 13.98 kB when the design
tokens, the collapsible-card chrome and the explicit range/swatch styling
arrived.

Re-derive rather than trusting these: `pnpm test` prints the file and test
counts, `pnpm build` prints the bundle sizes. They are recorded here as a
tripwire — if they disagree with a fresh run, this doc is stale, not the run.

## 5. Regression discipline

Any bug fix lands with the test that reproduces it (red → green). Golden SVG
files change only with an explicit snapshot update in the same diff, reviewed
visually (F5 screenshots) when geometry is touched.

A regression test that has only ever been seen passing is not yet evidence.
Confirm it fails against the unfixed code before trusting it — the defect sweep
(roadmap G) did this per fix, and the mood-preview test was verified by removing
the wiring again and watching it fail. When the test cannot be written before
the fix, remove the fix afterwards to check the test notices.

Where a change alters the goldens, the commit says which values moved and why
(e.g. eye corner radii scaling by exactly the fixture's 0.9 roundness), so a
reviewer can tell a deliberate visual change from an accidental one.
