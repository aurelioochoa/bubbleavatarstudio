# Exploring a solid-object bubble

> Branch `explore/3d-bubble`. Investigation only — no production code changed yet.
> Method: reading our own render layer, plus measurements taken against it
> (recorded below). Behavioural targets come from `blackbox-notes.md`; no
> upstream source was read, per `docs/CLEANROOM.md` §3.

## The question

Make the character read as a real geometric solid that can be turned a full
360°, the way a rendered 3D object does — without changing the visual style we
have now.

## What we already have, and what is actually missing

The surprise is that **half of this is already built**, and the missing half is
narrower than it looks.

`projectFace` (`src/domain/geometry/projection.ts`) is genuine 3D: it treats the
face as anchors on an **ellipsoid**, yaws and pitches them in three dimensions,
foreshortens them locally, and returns a signed `depth` so an anchor that has
rotated behind the surface fades out. Its own comment names the reason — "a
shear only reads as a tilted sticker." That work is done and it is correct.

The body is the part that is not 3D. `surfacePath` takes `shape`, `width`,
`height`, `roundness`, `lobes`, `wobble`, `seed` — **and no rotation**. The
outline is computed once, then `buildScene` applies a uniform
`scale(scaleX scaleY)` to it. Measured directly:

```
organic path @ any yaw: M 97.91 0 C 99.93 4.29 102.33 8.9 ...
=> identical bytes at every head rotation; only a uniform scale() differs.
```

For the `round` family this is invisible and mathematically exact — an
ellipsoid's silhouette under orthographic projection really _is_ a scaled
ellipse, which is precisely what `apparent()` computes. For `organic` and
`drop` it is wrong in the way that matters most here: **a lumpy solid must show
different lumps as it turns.** Ours keeps the same bumps pinned in the same
screen positions and merely squashes them. That is the single strongest "flat
sticker" tell, and it lands exactly on the shape families that give characters
their identity.

## Measured: a 3D silhouette is affordable in plain SVG

The natural fix is to promote the shape from a 2D outline to a **radius field
over the sphere**, `R(θ, φ)` — a base ellipsoid modulated by the same kind of
harmonics `wobbleAt` already uses — then derive the outline per frame by
sampling the surface, rotating it, projecting, and taking the maximum extent per
screen angle.

Prototyped and timed against our own numbers:

```
3D silhouette: 64x32 samples -> 64 outline points
cost: 0.247 ms/frame  (16.7ms budget => 1.5% of one frame)
max outline radius change between yaw 0 and yaw 90: 17.6 px  <- the lumps travel
```

1.5% of a frame. This needs **no WebGL, no canvas, and no new dependency**, and
it stays a pure deterministic function of its inputs — so `src/render` keeps its
purity rule, the SVG stays byte-stable, and snapshots, thumbnails, the ZIP
export and the SSR runtime all keep working unchanged.

**The goldens stay frozen, and that is the proof of correctness.** A radius
field that reduces to a plain ellipsoid when `shape === "round"` produces
exactly today's silhouette, because `apparent()` is already the analytic
solution for that case. This is the same safety argument P2 used for
`surfacePath` vs `blobPath`: if `resting.svg`, `ambient.svg` or `live-3000.svg`
move, the wire-up is wrong. Stop and look.

## Defects found while probing 360°

These are real and worth fixing regardless of which direction we take.
**Three of the four are fixed** — see the commits following v0.1.0. What each
one needed is recorded under it.

**1. The light walks off the character past ~140°.** `shadingFor` positions the
gradient with `0.5 - 0.15 - (head.y / 90) * 0.22` — linear and unbounded, where
it should be trigonometric. Measured sweep:

```
yaw=  0  shadingCx= 0.350      yaw=150  shadingCx=-0.017
yaw= 90  shadingCx= 0.130      yaw=180  shadingCx=-0.090
yaw=120  shadingCx= 0.057      yaw=270  shadingCx=-0.310
```

Past 150° the lit crown is outside the shape entirely, so the body flattens into
a dead silhouette at exactly the angles a 360° turn has to survive.

**Fixed.** The travel is a rotation, not a ramp: a sine, bounded to ±0.14 and
closing the loop at 360°, with its amplitude picked to match the old slope at
zero. A small turn therefore looks exactly as it did, cx at rest is still 0.35
to the last bit, and the goldens did not move.

**2. Extras do not participate in the projection at all.** `buildScene` gives
each extra `translate(x y) rotate(deg)` — no foreshortening, no depth, and their
z-sort is the static authored value rather than their rotated depth. On a
turning head they slide across the body like decals instead of orbiting it. The
petal-ringed character in the parity inventory is the case that breaks hardest.

**3. There is no back of the head.** At 180° the eyes correctly reach opacity
0, which leaves a featureless blob — and, per defect 1, a badly lit one.

**4. There is no contact shadow.** The scene draws body, extras and eyes and
nothing else. A ground shadow is the cheapest and strongest volume cue there is,
and its absence is a large part of why the character reads as floating art
rather than a solid sitting in a space.

**Fixed, stage-only** — which answers open question 3 below. An avatar
composited into someone else's page has no ground to cast onto, so a baked
shadow would follow it into every PNG, every ZIP, the runtime and all 24 mood
thumbnails. `Scene.shadow` is opt-in the way `Scene.guide` is; the studio stage
is the only caller that asks. The shadow takes the body's resting position and
never the ambient bob, so a breathing character rises off a shadow that stays
put, and its width follows the silhouette's own foreshortening.

## Options

**A — Real WebGL (three.js).** Genuine meshes and lighting. It also discards
ADR-2, every golden, the byte-stable SVG contract, the SSR-safe runtime,
snapshot/ZIP export and all 24 mood thumbnails, and adds roughly 600 KB. It
contradicts nearly every architectural decision this repo has made. Not
recommended as a first move.

**B — 3D radius field with an analytic silhouette in SVG.** The core of the
idea, measured above at 1.5% of a frame. Keeps purity, determinism, goldens and
every downstream consumer. Makes the silhouette genuinely turn.

**C — Lighting and grounding.** Rim/fresnel term, a specular that tracks the
light, and a contact shadow. Independent of B, cheap, and probably the largest
perceived-realism gain per line of code.

**D — 360° correctness.** Defects 1–3 above.

_Where this stands:_ D is done and the cheap half of C (the contact shadow) with
it; the rim/fresnel and tracking specular are not. B is untouched and still
wants the conversation below.

The honest sequencing is **C → D → B**: C and D are small, self-contained, and
would make the current model noticeably more solid on their own, which also
gives us a fair baseline to judge whether B's silhouette work is worth its
complexity. B is the real answer to "it should be a 3D object," but it is the
one that wants a design conversation first — chiefly how a 3D shape family gets
authored and stored, since `Surface` currently persists a 2D vocabulary.

## Open questions for that conversation

1. Does the 3D shape stay _derived_ from today's `lobes`/`wobble`/`seed` (no
   schema change, every existing character gains volume for free), or does it
   become an authored 3D field (richer, but a v3 migration and new UI)?
2. Should 360° show a distinct back of the head, or is a featureless turned-away
   solid the right read for these characters?
3. ~~How far does the "Blender" cue go — is a contact shadow in scope for the
   exported snapshot and the runtime, or studio-stage only?~~ **Answered:
   studio-stage only.** If a shadow ever belongs in an export it wants to be an
   authored property of the character, not a render-time default.
