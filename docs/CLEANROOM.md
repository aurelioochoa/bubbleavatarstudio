# CLEANROOM Protocol — Bubble Avatar Studio

> **Status:** Active policy for the entire lifetime of this repository.
> **Owner:** helpbubble
> **Purpose:** Ensure that this codebase is an independent, original work and does
> not constitute a derivative of any third-party source code, so that helpbubble
> may license its own product freely.

## 1. What this project is

Bubble Avatar Studio is an original implementation of a *concept*: a browser-based
authoring studio for procedural 2D avatars (parametric body geometry, expressions,
animation timelines, portable exports). Concepts, ideas, features, and functionality
are not protected by copyright. Only the specific *expression* — source code,
comments, and creative written prose — is.

This project therefore re-implements the concept from a **functional specification**,
with entirely original code, naming, file formats, architecture vocabulary, UI copy,
and visual design.

## 2. Authorized sources (Tier 2)

The functional specification in `docs/` was derived exclusively from:

| Source | Use |
|---|---|
| Public README of the upstream project (`github.com/smontlouis/bible-strong-avatar-lab`, README page) | Feature inventory — facts only |
| Live deployed application (`avatars.bible-strong.app`), operated as a black box by driving it as a user would | Behavioral observation notes |
| Upstream non-code prose docs (`CONTEXT.md`, `docs/adr/*.md`) read via public GitHub raw URLs | Facts about intent/architecture extracted into original wording |

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

| Date | Incident | Resolution |
|---|---|---|
| — | none recorded | — |

*This file must be updated if any incident ever occurs. An honest log preserves the
credibility of this protocol.*
