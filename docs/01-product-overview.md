# 01 · Product Overview — Bubble Avatar Studio

**Project:** Bubble Avatar Studio (working title) · **Owner:** helpbubble
**Status:** Approved design baseline · **License:** proprietary (helpbubble)

## 1. Vision

helpbubble products need friendly, living characters — "bubbles" — that react to
users across support, onboarding and engagement surfaces. Bubble Avatar Studio is
an in-browser authoring tool where designers create procedural SVG characters,
give them moods and looping behaviors, and export a portable definition that any
helpbubble frontend renders with a tiny runtime.

One studio, one file format, one renderer — used everywhere.

## 2. Users

| Persona | Need |
|---|---|
| Brand/character designer (primary) | Build and refine characters visually without code; iterate moods and loops quickly |
| Frontend engineer (secondary) | Drop an exported definition into a helpbubble app and trust it renders identically |
| End user (indirect) | Sees a living character that feels polished and responsive |

## 3. Product pillars

1. **Procedural, resolution-free** — characters are parameters, not bitmaps; SVG
   scales anywhere and stays tiny.
2. **Authoring without code** — full visual editing with instant live preview.
3. **Portable by design** — a character is one JSON file; the runtime has no UI
   dependencies and never reads storage or network.
4. **Safe ownership** — 100% original code and design (see `CLEANROOM.md`),
   proprietary to helpbubble.

## 4. Scope

**In scope (v1):**
- Character (bubble) CRUD with body built from a primary facial surface plus
  extra primitives; per-primitive geometry/color controls.
- Linked or independent eye editing; pseudo-3D head rotation and perspective.
- Moods: relative eye-delta presets with optional temporary color overrides.
- Loops: ordered mood steps with hold times and transition styles; playback
  modes loop / once / ping-pong; automatic blinking; spring tuning.
- Ambient idle motion for body and eyes.
- Studio: stage + inspector layout, direct canvas manipulation, autosave,
  project backup/restore, Spanish/English UI.
- Export: SVG/PNG snapshots (transparent/solid/gradient backgrounds) and a
  portable character definition consumed by an embeddable React runtime.

**Out of scope (v1):** multi-user/cloud sync, non-SVG renderers (Lottie/video),
audio lip-sync, marketplace, mobile-native editors. (Revisit post-v1.)

## 5. Success criteria

- A designer creates a new character with 3 moods and 1 loop in < 10 minutes.
- Exported definition renders pixel-identically in studio preview and runtime.
- Full check gate (`typecheck + tests + build`) green at every merge.
- No upstream code or prose anywhere in the repo (clean-room attested).
