# Research Notes — Upstream Facts (original wording)

> Provenance: facts extracted under CLEANROOM.md §2 from public README page,
> `CONTEXT.md`, ADR-0022, ADR-0023, and black-box observation of the live app.
> All sentences below are original summaries written by this project. Facts only;
> no upstream prose is reproduced.

## 1. Product concept (facts)

- Browser-only authoring studio for procedural 2D avatars rendered as SVG.
- Character body assembled from one primary facial surface plus additional
  primitives with 3D-inspired parameters (dimensions, roundness, position, local
  rotation, perspective approximation, colors, optional wireframe guides).
- No backend: everything lives in browser local storage; JSON files are the
  portable interchange.
- Ships as: Studio app + reusable runtime libraries (React binding and a plain
  JS/ESM DOM renderer) consuming a single portable avatar definition file.
- UI localization observed: English, French, Simplified Chinese.

## 2. Domain vocabulary (facts we re-map to our own terms)

| Upstream term           | Meaning (fact)                                                                        | Our chosen term  |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| Avatar                  | Reusable character; persistent visual identity = body + colors + neutral eyes         | **Bubble**       |
| Neutral appearance      | Persistent base look before any expression is applied                                 | **Resting face** |
| Pose                    | Current temporary visual configuration; not persisted directly                        | **Live state**   |
| Base behavior library   | Bundled immutable expressions/animations inherited until first customization          | **Starter kit**  |
| Avatar behavior library | Per-avatar copy created atomically on first behavior edit (copy-on-write)             | **Own kit**      |
| Expression              | Saved preset; eye values RELATIVE to resting face; optional temporary color overrides | **Mood**         |
| Animation               | Ordered mood steps + transitions + blink settings                                     | **Loop**         |
| Playback                | The running execution of an Animation; owns live state until user grabs control       | **Playback**     |

We deliberately use different words than upstream so our codebase vocabulary is ours.

## 3. Behavioral invariants (facts)

1. A character inherits the starter kit until its FIRST mood/loop edit.
2. That first edit clones moods AND loops together (references stay valid) — atomic copy-on-write.
3. After that, edits affect only the owning character; duplicating a character duplicates its own kit.
4. Transferring a loop between characters must carry every mood it references.
5. The primary surface carries the facial coordinate frame and both eyes; secondary
   primitives are independent (own size/position/rotation).
6. Moods stay compatible across different bodies because eye deltas are expressed in
   the common facial frame, not absolute coordinates.
7. Live preview updates during editing, but in-editor unsaved edits must remain
   cancelable (reversible).
8. Playback exclusively controls the live state; direct manipulation on canvas
   pauses playback. Switching characters keeps playback position.

## 4. Document model lessons (from ADR facts)

- One versioned studio document, persisted as a whole — not separate silos.
- Moods have durable IDs; loop steps reference mood BY ID, never by array index
  (reordering/deleting must not corrupt loops).
- Mutations preserve cross-object invariants transactionally.
- Pre-release schema: bundled current version is the baseline; no legacy migrations kept.
- Terminology must be consistent across tabs/editor/player/export (they had three
  competing names once; we pick ours once and enforce).

## 5. Architecture boundaries (facts worth adopting as our own decisions too)

- Pure geometry/document logic lives framework-independent (no React imports).
- Durable editor state in React; high-frequency animation values outside the React
  render path (motion values / direct rAF writes).
- Exports receive explicit data as arguments; never reach into storage themselves.
- Generated standalone runtime artifact is committed and freshness-checked in CI-style validation.
- Studio controller pattern: one coordinator hook owning operations over the document;
  view components stay declarative.

## 6. Feature inventory (facts from public feature list)

Characters: create/rename/duplicate/reorder/delete. Body from primary facial surface +
extra primitives; per-primitive dimensions, roundness, position, local rotation,
perspective, colors, wireframe guides. Eyes editable jointly (linked size/proportion/
position) or independently. Direct canvas manipulation: translate + rotate handles.
Ambient subtle motion on body and eyes at rest.
Moods: create/save/duplicate/reorder/delete; relative eye deltas; optional temporary
body/eye color overrides per mood.
Loops: steps from moods with per-step hold time and transition style; playback modes
loop / play-once / ping-pong; configurable automatic blinking; preview/play/pause/stop.
Export: SVG or PNG snapshots with transparent / solid / linear-gradient /
radial-gradient backgrounds; resolution choice; portable `.avatar.json` consumed by
React package or framework-free ESM package; integration ZIP bundling definition +
wrapper + instructions without duplicating engine code; full project JSON backup +
import-with-confirmation.
Studio UX: canvas left / inspector right; four areas (body, moods, loops, export);
autosave to local storage; language switcher.

## 7. Deliberate divergences (our choices, ours to change freely)

- Own file format name and shape (`bubble-avatar.v1.json`, project `.bubble-studio.json`).
- Own brand voice and UI visual design (helpbubble palette/layout), same functional coverage.
- Spanish-first i18n (es/en) instead of en/fr/zh.
- We may simplify: single React runtime package now; ESM wrapper later if needed.
