# CLEANROOM Protocol — Bubble Avatar Studio

> **Status:** Active policy for the entire lifetime of this repository.
> **Owner:** helpbubble
> **Purpose:** Ensure that this codebase is an independent, original work and does
> not constitute a derivative of any third-party source code, so that helpbubble
> may license its own product freely.

## 1. What this project is

Bubble Avatar Studio is an original implementation of a _concept_: a browser-based
authoring studio for procedural 2D avatars (parametric body geometry, expressions,
animation timelines, portable exports). Concepts, ideas, features, and functionality
are not protected by copyright. Only the specific _expression_ — source code,
comments, and creative written prose — is.

This project therefore re-implements the concept from a **functional specification**,
with entirely original code, naming, file formats, architecture vocabulary, UI copy,
and visual design.

## 2. Authorized sources (Tier 2)

The functional specification in `docs/` was derived exclusively from:

| Source                                                                                                        | Use                                                             |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Public README of the upstream project (`github.com/smontlouis/bible-strong-avatar-lab`, README page)          | Feature inventory — facts only                                  |
| Live deployed application (`avatars.bible-strong.app`), operated as a black box by driving it as a user would | Behavioral observation notes                                    |
| Upstream non-code prose docs (`CONTEXT.md`, `docs/adr/*.md`) read via public GitHub raw URLs                  | Facts about intent/architecture extracted into original wording |

**Rule applied to all prose sources:** every sentence in `docs/` and in this
repository's code is original writing. Facts and ideas were extracted; no text was
copied, paraphrase-copied, or structurally mirrored.

## 3. Prohibited sources (never, under any circumstances)

No contributor, agent, or contractor working on this repository may read, browse,
clone into their workspace for reference, prompt an AI with, or otherwise study:

- Any upstream source file: `src/**`, `packages/**`, `legacy/**`, `scripts/**`
- Any upstream build/config content used as an implementation reference
- Compiled or minified output of the upstream application
- The upstream Git history

If contamination occurs (someone reads prohibited material), they must be removed
from implementation duty for this repository and the incident recorded in §5 below.

## 4. Independence checklist

- [x] Own data format (`Bubble Avatar` JSON schema, versioned independently)
- [x] Own naming: domain terms chosen fresh ("Bubble", "pose layer", "mood", etc.)
- [x] Own visual design system for the Studio UI
- [x] Own architecture decisions, recorded as our own ADRs where significant
- [x] No upstream code, identifiers copied with cosmetic renaming, or translated text

## 5. Contamination / incident log

| Date | Incident      | Resolution |
| ---- | ------------- | ---------- |
| —    | none recorded | —          |

No contamination has occurred: no prohibited source in §3 has been read at any
point in this project's life. The §6 audit below is a separate thing — a sweep
of what we shipped, not a report of anything we read.

## 6. Pre-release audit (F5, 2026-08-25)

Swept `src/`, `e2e/` and `docs/` (excluding `docs/research/`, which quotes the
upstream by design) for anything of theirs that had reached ours.

**Clean:** no upstream project, author or repository name anywhere in the
source; no upstream vocabulary as an identifier — the §2 mapping holds, and
the code says bubble, resting face, live state, starter kit, own kit, mood,
loop throughout; no French or Chinese strings, which are two of the three
localizations the live app was observed in and would be the obvious trace of
copied UI copy; no upstream code, minified or otherwise, and no dependency on
anything they publish. `package.json` carries React and the toolchain, nothing
else.

**One finding, fixed in the same pass.** The Share panel's first card was
titled "Photo Mode" — in both locales, untranslated in Spanish, which is what
gave it away. That is upstream's own name for that feature, recorded verbatim
in `docs/research/blackbox-notes.md`. Observing that they have such a card is
a fact about capability and is fair; shipping their name for it is copied UI
copy under §3. It now reads "Instantánea" / "Snapshot", which is what
`docs/05` had called the card all along.

**Two considered and cleared.** Our starter mood library shares seven names —
happy, curious, sad, proud, playful, drowsy, surprised — with the twenty-three
expression names the live app was observed to carry, and one loop name (idle).
These are the common English words for the states themselves, not names for a
product feature: an emotion library that avoided "happy" and "sad" would be
a worse library, and the capability is what parity means. The other seventeen
moods and nineteen loops are ours outright, as are every delta and every
timing. Likewise "Spring speed" follows from `transition: "spring"` in our own
schema (docs/03 §5) rather than from anything of theirs, and "Blink" names a
behaviour our own FR-5.5 specifies.

Re-derive with:

```bash
grep -rniE "bible.?strong|smontlouis|avatar.?lab" src e2e docs --exclude-dir=research
grep -rnP "[\x{4e00}-\x{9fff}]" src        # Chinese strings
```

_This file must be updated if any incident ever occurs. An honest log preserves the
credibility of this protocol._
