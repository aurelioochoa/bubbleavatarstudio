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

**Not built yet:** the `invalid/` cases per validation rule (E_VERSION, broken
ref, bad colour). `validate.test.ts` covers those error codes with documents
built inline instead. Extracting them into fixtures is F5 work — this section
described them as existing before they were written.

## 4b. Current state (re-derive; do not trust)

As of the P4 completion pass: **31 Vitest files, 343 tests**, plus **1
Playwright spec** of **4 scenarios** covering boot, panels, a playing loop and
the rail context menu. Production bundle 292.47 kB JS / 28.59 kB CSS (88.81 /
6.08 gzipped).

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
