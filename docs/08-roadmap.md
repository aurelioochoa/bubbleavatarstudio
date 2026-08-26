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

## P — Parity (done)

Bring the app level with what the concept demands, per the feature inventory in
`docs/research/blackbox-notes.md` session 3.

Every FR the four sub-phases name is covered by a test that cites it. The last
piece of UI this phase was waiting on — the row that calls `topUpLibrary()` —
landed in F5.

- **P1 (done)** Volume: anchor the face on a projected surface (FR-8.2), shade
  the body, and keep a resting character alive — blinking, micro-saccades,
  breathing (FR-7).
- **P2 (done)** Shape vocabulary: the `round`, `organic` and `drop` families
  and their parameters (FR-2.6, FR-2.7), schema v2 plus the v1→v2 migration,
  and a shape control in the Look panel. Later extended to seven families —
  `capsule`, `cylinder`, `cone` and `diamond` — with no schema change, since
  widening an enum leaves every saved document valid.

  The geometry had landed a step earlier (`9d957cf`) but nothing imported it —
  `scene.ts` still drew one superellipse. The wire-up is what closed P2:
  `Surface` carries the family, `migrate()` became a real chain, and the
  portable avatar format bumped alongside with `readPortableAvatar()` still
  accepting v1 files. The three render goldens are byte-unchanged across that
  commit, which is the evidence the migration default is behaviour-preserving
  rather than merely plausible.

- **P3 (done)** Content: the starter library ships **24 moods** (FR-4.7) across
  the six bands the spec names — alert, calm, warm, negative, sleepy, playful —
  and **20 loops** split 10 `life` / 10 `reaction` (FR-5.7), all original.

  Lives in a new pure `src/domain/content/` module of literal records
  (`moods.ts`, `loops.ts`), with `starterKit()` composing it, so `create.ts`
  stays about document creation. Loops name moods by a stable local key, never
  by index. `content.test.ts` guards the counts, the band spread, name and key
  uniqueness, and that every delta and timing sits inside the range
  `validate.ts` accepts — so a bad record fails at its source rather than as a
  document-validation error three layers away.

  Two things the wire-up fixed on the way through. `starterKit(ids)` now fills
  injected mood and loop ids **positionally with a fallback**; previously a
  partial list (`playback.test.ts` passes two mood ids) left the remaining ids
  `undefined`. And the fake-`Random` step-id trick collided past the ninth step
  — it fed `n / 10 ** len(n)` to `newId`, so step 10 produced step 1's id — and
  is now a seeded LCG, still deterministic across runs.

  The predicted snags landed exactly as predicted and are fixed:
  `StudioView.test.tsx` derives the new-mood name from
  `starterKit().moods.length + 1` instead of hard-coding `"mood 5"`, and
  `mutate.test.ts`'s reorder case passes the complete id array `permute()`
  requires. Every mood is referenced by at least one loop, which is what keeps
  the E_REF path (FR-5.6) that test relies on true. The render goldens came out
  **unchanged**, as predicted — they are driven by `test/fixtures/full.json`,
  not by `starterKit()`.

  _Found by running the app rather than the tests, and since decided:_
  `starterKit()` is called only from `createDefaultDocument()`, so the library
  reaches **new** documents only. A project already in localStorage keeps the
  kit it was saved with, and a returning user still sees four moods while the
  tests assert twenty-four.

  Of the three options that were open — leave it, offer an explicit action,
  migrate on load — the decision is the middle one. Migrating on load would
  resurrect a mood the user had deliberately deleted, on every reload, which
  is worse than the gap it closes. `domain/document/library.ts` therefore
  holds an additive `topUpKit()`: it appends every library mood and loop the
  kit lacks and touches nothing else, so no existing loop can lose its
  referent. Matching is by name, because a saved document carries no link back
  to the library entry it came from — a renamed starter mood reads as missing
  and the entry returns _beside_ the rename rather than overwriting it.
  `topUpLibrary(doc, bubbleId)` routes it to the kit that bubble actually
  reads: the shared starter kit when it inherits (so sibling bubbles gain the
  content and nothing forks behind the user's back), its private kit when it
  has already diverged.

  _Closed in F5:_ the Moods panel measures the gap with `libraryGap()` and
  offers it as a row for as long as there is one, dispatching `library/topUp`.

- **P4 (done)** Remaining UI surfaces.

  The first pass built the stage transport dock and status pill (FR-6.2), rail
  thumbnails with rename/duplicate/reorder/delete (FR-1.2, FR-1.4), loop
  duplicate and the accessible ↑ ↓ step reorder (FR-5.2, FR-5.5), mood
  duplicate, collapsible inspector cards on shared tokens, and the rail and
  inspector at their documented 56px / 360px.

  The completion pass closed the rest:

  - **The defect first.** FR-8.3 says Esc restores the pre-drag rotation;
    `Stage.tsx` reset it to zero, and the test that asserted the zero
    behaviour was rewritten and watched fail before the fix.
  - **Loops** (FR-5.8, FR-5.2): a summary of steps, holds, whole cycle and
    blink schedule; rename; the blink card; and a list grouped by `group` with
    a control that moves loops between groups. `summarizeLoop()` shares
    `cycleSteps()` with `LoopPlayer`, so the summary cannot drift from the
    playback it describes — a pingpong cycle is longer than its holds sum to,
    and both now say so from one place.
  - **Moods** (FR-4.1–4.3): a modal editor carrying all seven deltas per eye —
    rotation X and Y had been in the renderer since `0f29cee` with no control
    to set them — plus a mirror action, a colour override covering body _and_
    eyes independently, and a per-card menu with edit, duplicate, move up/down
    and delete-with-confirm. `mood/reorder` finally has a call site.
  - **Stage** (FR-8.2, FR-8.4): a rotation gizmo spanning ±180° on all three
    axes, where a drag reaches X and Y across that whole range at 0.3° per
    pixel and wraps rather than stopping, leaving the roll to the gizmo; and the
    projection guide, whose arcs are sampled through the same `project()` the
    eyes go through, so it shows where an anchor would really land. Both are
    siblings of the engine's host element, asserted directly, because a child
    is erased by the next `innerHTML` write.
  - **Share** (FR-10.1, FR-10.3, FR-10.5, FR-9.3): a live preview of the
    framed result, radial backgrounds with configurable stops, a loop
    checklist that also drives the mood pruning, an import confirmation that
    counts what is in the file instead of a hard-coded `confirm()` string, and
    the `example.tsx` the package was missing.
  - **Direct manipulation** (FR-9.5, FR-1.4, FR-5.2): drag-to-scrub on every
    numeric label, and drag-to-reorder for the rail, the mood grid and the
    loop timeline — the ↑ ↓ buttons stay as the accessible path underneath.

  _Two shared primitives made the rest possible._ `Modal` and
  `Menu`/`MenuItem` now live in `studio/ui.tsx`; the menu is the rail's own,
  lifted, with the rail's existing tests as the evidence the lift changed no
  behaviour. The modal is scoped to its positioned ancestor rather than the
  viewport, and portals into the inspector column: the point of editing a mood
  is watching the stage change under the slider, so a full-screen dim would
  hide the thing being edited, and rendering in place would let the column's
  scroll box clip the dialog header.

  _One test taught a lesson worth keeping._ The rail's drag case was first
  written against two bubbles the studio both names "Bubble" — a list of two
  identical names reads the same reversed, so it passed with the wiring
  removed. It now seeds the Alpha/Beta fixture. A regression test seen only
  passing is not evidence.

- **AC:** `pnpm check` green per step; every FR above covered by a test that
  names it; a visual pass in a real browser, not only jsdom. The first two
  hold at 343 tests across 31 files. The browser pass was **done in F5**,
  against a re-archived `pnpm e2e` run.

## F5 — Hardening & final verification (done)

All five items closed, in the order they are listed.

1. **The starter-library affordance.** `topUpLibrary()` has a call site: a
   `library/topUp` action through the same transactional commit as every other
   mutation, and a Moods-panel row that measures the gap with `libraryGap()`
   and shows only while it is non-zero. It needs no confirmation because the
   domain function only ever appends. A fresh document is built from the
   current library, so the row is invisible there by construction — which is
   also why the test that asserts it stays hidden was checked against an
   unconditional row before being trusted.
2. **The smoke is ten scenarios**, weighted towards what jsdom models loosely:
   the mood editor's focus behaviour, the gizmo surviving a rendered frame,
   the guide reaching the SVG, the Share preview, and both drags. Both drag
   tests were confirmed to fail against a sabotaged build rather than trusted
   for passing.
3. **The visual pass is read.** Eleven frames against `docs/05` §1–§4; one
   defect, a background segment clipping "Degradado" to "Degrada…" at 360px,
   now "Lineal" / "Linear". Two non-defects are written into `docs/05` so the
   next read does not re-open them.
4. **The `invalid/` fixtures** exist: nine documents, one per validation rule,
   each broken in exactly one place, globbed by `validate.test.ts` from their
   filenames. Writing them found `E_ID` declared in the union and emitted
   nowhere; it is gone.
5. **The audit is recorded** as `docs/CLEANROOM.md` §6, with the greps to
   re-derive it. It found one piece of upstream UI copy — the Share panel's
   "Photo Mode", which is their name for that card — now "Instantánea" /
   "Snapshot", the name `docs/05` had used all along. Tagged **v0.1.0**.

- **AC:** all gates green (360 tests / 31 files, 10 e2e scenarios); eleven
  screenshots archived under `docs/screenshots/`; audit clean and recorded.

## F6 — The track redesign (done)

Direction A of a two-direction design canvas, built in nine steps, each
green on `pnpm check` before the next began.

**The thesis, in one move.** Playback was a pill floating over the character.
It is a permanent full-width band under all three columns now (FR-6.6), and
it carries the sequence with it (FR-6.7): a step is a chip exactly as wide as
its hold, the ruler is in seconds, and a transition is edited on the seam it
happens on. Three things follow from that and are worth stating.

_The playhead is not React state._ FR-11.2 keeps the per-frame path out of the
tree, so `StageEngine` publishes elapsed time into `app/stage/clock.ts` and
the track writes `style.left` by hand. `Track.test.tsx` counts renders across
a published frame; the e2e suite asserts the playhead has actually moved,
because jsdom can prove the writer runs but not that the frames arrive.

_Two totals, and they differ._ The ruler spans the authored strip; the readout
states the cycle playback takes, which for a pingpong includes the leg back.
The playhead walks the strip in both directions rather than the sequence
growing a second row for the return.

_A scrub rides the same seam backwards._ `clock.seek` moves the loop clock
from the UI rather than leaking the engine instance up into the shell, and a
scrub on a stopped stage pauses it there — stopped rewinds on every update,
so a scrub that left it stopped would do nothing visible.

**What the panels became.** The Loops panel lost half of itself to the track
and kept the catalogue, the loop's own settings and an editor for the step in
hand, pinned so it cannot scroll its own subject away. The Moods grid became
searchable (FR-4.9) and badged with usage (FR-4.8), and its card actions left
the kebab for a bar that can say _why_ a delete is unavailable — every one of
the 24 starter moods is in a starter loop, so the old path was offer,
confirm, refuse. The mood editor's fourteen stacked sliders became two XY
pads: an offset is two numbers that mean one place. Look laid its fields two
to a row. Share draws the export frame on the stage, where framing is decided,
and states what the package will weigh before it is built (FR-10.6).

**One thing the canvas drew that could not ship as drawn.** Its tertiary text
colour, `#6f759b`, measures 4.04:1 on `panel` — under the 4.5:1 docs/05 §3
requires. `--color-ink-mute` is the lifted value that clears the bar on all
four surfaces, and `theme.test.ts` now also records which of the new tints
sit under the 3:1 non-text bar deliberately, so the choice does not read as
an oversight later.

**Two habits that paid.** Every regression test was checked against a
sabotaged build before being trusted — which is how the drag scale, the
pad's Y direction, the loop-id guard on the playhead and the pre-empted
delete all earned their tests. And Testing Library's drag helpers turned out
not to carry `clientX` into React's synthetic event, silently landing every
drop at the end of the sequence; the drag tests build their events by hand,
and the real path was confirmed in Chrome with a genuine `DragEvent`.

- **AC:** all gates green — **600 tests / 36 files**, **11 e2e scenarios**
  (the eleventh is a 1024×720 check that the track's first row and the
  inspector do not clip); goldens byte-unchanged, verified by diffing
  `src/render/` and `src/domain/geometry/` against the branch point; every
  screen read against its artboard in a real browser at 1440px.

## F7 — A mood turns the body (done)

Reported as a gap by the user, confirmed by a black-box session against the
deployed reference (`docs/research/blackbox-notes.md`, 2026-08-26): their
expressions carry a three-axis rotation of the whole character, every one of
their preset thumbnails shows the body at a different orientation because of
it, and playback travels between those poses. Ours moved the eyes on a body
that never moved, so every animation in the library was a face working on a
statue.

**Schema v6** adds `head` to a mood. Three decisions in it are worth keeping.

_It composes, it does not replace._ The mood's pose is added to whatever
direct manipulation is holding, so a user who turned the character to see it
side-on keeps that view while it animates. `buildScene` does the addition
once, at the top, which is why all seven readers of the head rotation cannot
drift apart.

_The travel takes the shorter arc per axis._ From 170° to −170° is twenty
degrees across the back, not three hundred and forty across the front. The
eye deltas never hit this because they live inside ±30; a body pose spans the
whole turn. Their own engine avoids the same defect by interpolating the
rotation as a rotation, which was the fact worth taking from the observation
rather than the technique.

_The migration is a no-op by construction._ A v5 mood joins v6 facing
straight ahead, which is exactly what it drew, so no saved character changes
and the goldens are byte-identical. The portable format took the same step at
its own v5, because the runtime still reads files written before poses
existed.

**The starter library uses it**, or the feature would have shipped invisible:
24 poses in a table beside the moods, authored from what each one means and
deliberately small — a body swinging tens of degrees per keyframe reads as a
character being shaken rather than one reacting.

One note for whoever verifies this next in a browser. `requestAnimationFrame`
stalls in an unfocused automated tab, which freezes the engine and makes a
posed loop look static through the automation even though it is not. The
composed path is covered deterministically instead (`render.test.ts`, "a loop
turns the character"), and the visual check was done by clicking between two
moods, which needs no frame loop at all.

- **AC:** all gates green — **637 tests / 36 files**, 11 e2e scenarios;
  goldens byte-unchanged against the branch point; the observation logged and
  committed before the implementation, per docs/CLEANROOM.md.

## F8 — The knob that did nothing, and the link that squinted (done)

Two defects, both found by looking rather than by a failing test: the first by
trying to cite FR-5.4 on a test, the second reported from the editor with a
screenshot of two eyes pointing opposite ways.

**FR-5.4 · `springSpeed` reached the renderer and changed nothing.** It is
authored in the Loops panel, range-checked at 0.1–3, migrated, exported, and
read by `LoopPlayer` — which handed it to `spring(speed)`, where
`durationSec = 0.9 / s` divided by the same `s` that multiplied both terms:

```
k             = t * 0.9 / s
-6 * s * k    = -5.4 * t          <- s gone
2π * 1.2s * k = 2π * 1.08 * t     <- s gone
```

Every speed in the legal range returned one identical curve, to twelve
decimals.

The word meant two different things, and the choice was **curve, not timing**.
The spec said "scales transition durations globally", which would have widened
or narrowed the transition window — and the window is the final 40% of a hold,
which `summarizeLoop()` reports and the track draws step widths from, so timing
would have moved arithmetic that is already on screen. As a curve knob the
window is untouched and only the travel through it changes: higher speed
arrives sooner and rings more. FR-5.4's wording was corrected to match rather
than the other way round.

Dropping the `/ s` was not enough on its own, and the test says so: it left the
slow end short, `spring(0.1)` reaching 0.54 at t=0.999 before the `c >= 1`
branch snapped it to 1. The residual is therefore detrended by its own end
value — `1 - r(t) + t·r(1)` — which lands every speed on 1 with no jump and
moves s=1 by at most 0.004, so the starter library animates as authored. The
goldens are resting and ambient frames and came out byte-identical.

**FR-4.1 · linked eyes were mirrored, not copied.** The editor's
`Vinculados` mode ran each edit through `mirrorEye`, the handedness rule
FR-3.3 applies to the **resting face** — where the two eyes are geometry, and
handed. A mood's deltas are not geometry; they aim a gaze, and both eyes of a
face looking left are turned left. Mirroring put the two pad dots in opposite
corners, so a linked mood could not be pointed anywhere: the reported symptom
was a character that squints at itself whenever the two sides are in step.
Linked now copies. The one-shot `Reflejar izquierdo → derecho` action keeps
`mirrorEye`, which is the case it was written for.

- **AC:** all gates green — **643 tests / 36 files**, 11 e2e scenarios;
  goldens byte-unchanged; the `springSpeed` test confirmed against a
  `LoopPlayer` sabotaged to pass 1, and all three eye-link tests watched red
  before the copy landed; the linked pads read the same X/Y in a real browser,
  not only in jsdom.

## Beyond the roadmap — the 3D question

`docs/research/3d-bubble-exploration.md` is an investigation, not a committed
phase. It measured that our body outline does not turn: `surfacePath` takes no
rotation, so an `organic` character keeps the same lumps in the same screen
positions and merely squashes, which is the strongest "flat sticker" tell we
have. It also found three defects worth fixing whichever way that goes — the
shading gradient walks off the character past ~140° of yaw, extras get no
foreshortening or depth sort so they slide across a turning head like decals,
and there is no contact shadow at all.

**Built.** See the outcome section of that document: the body is a solid, the
silhouette turns, depth is authored (schema v3), the guide is a wireframe
raised on a drag, the face clips at the limb, and the body carries a rim light
that a roll no longer drags around with it. The three defects below are all
closed.

Those three were ordinary defect work. The larger idea — deriving the
silhouette from a radius field over the sphere, measured at 1.5% of a frame
and prototyped to keep the goldens frozen — needs a decision first, chiefly
whether the 3D shape stays derived from today's `lobes`/`wobble`/`seed` or
becomes an authored field with a v3 migration. It is not scheduled.
