<p align="center">
  <img src="docs/media/banner.webp" alt="Bubble Avatar Studio" width="100%">
</p>

<h1 align="center">Bubble Avatar Studio</h1>

<p align="center">
  Design an expressive avatar in the browser, animate it, and drop it into your
  app as a self-contained SVG that weighs nothing.
</p>

<p align="center">
  <a href="https://github.com/aurelioochoa/bubbleavatarstudio/actions/workflows/check.yml">
    <img src="https://github.com/aurelioochoa/bubbleavatarstudio/actions/workflows/check.yml/badge.svg" alt="check">
  </a>
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6" alt="TypeScript 5.8">
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React 19">
  <img src="https://img.shields.io/badge/runtime%20deps-react%20only-brightgreen" alt="React is the only runtime dependency">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="Apache 2.0 licensed">
</p>

## Highlights

- **No image assets.** A character is a few hundred bytes of JSON. Every frame
  is drawn from that description, so it stays sharp at any size.
- **The body is a solid, not a sticker.** Turn the character and it turns —
  each shape family's outline is revolved into a solid and re-read as a
  silhouette per angle, so a lumpy avatar shows different lumps side-on.
- **Alive when idle.** Blink, micro-saccades and breathing run on their own,
  so a resting avatar never looks like a frozen picture.
- **A library to start from.** 24 moods across six expressive bands and 20
  loops, split into life and reaction, in every new project.
- **Ships as a React component.** `<BubbleAvatar/>` is SSR-safe and renders
  the resting pose on the server before it ever starts a frame loop.
- **Export what you need.** A portable `*.bubble-avatar.json`, an SVG or PNG
  snapshot, or a ZIP with all of it.
- **Bilingual.** Spanish-first, with full English parity.

## Overview

Bubble Avatar Studio is a browser studio for procedural SVG avatars — round,
soft characters with a face, a mood and a small repertoire of loops. You shape
the body, aim the eyes, author moods, sequence them into loops, and watch the
result on a live stage the whole time you edit.

It is built as pure layers under a thin React shell: the domain (document,
geometry, playback) and the renderer are plain TypeScript with no DOM in sight,
which is why the same character produces byte-identical SVG in a test, in the
studio and on your server.

Original clean-room work by helpbubble — no upstream source was ever read.

## The studio, running

A real capture of the app: playing a loop, swapping shape families and scaling
the body, reading the orientation off the axis triad while turning the
character by hand under the wireframe, letting it follow the cursor and dialling
that back, previewing moods from the library and opening one over the stage,
framing the export on the stage it crops, and the help sheet with its shortcuts
and guide.

![The studio in use](docs/media/demo.gif)

> The banner is generated art. Everything in the recording is the actual
> application, driven through Playwright against the production build —
> `pnpm demo` re-records it, `docs/media/demo.mp4` is the same take at full
> resolution, and `docs/screenshots/` holds the frames `pnpm e2e` archives.

## Quick start

You need [Node](https://nodejs.org) 22+ and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/aurelioochoa/bubbleavatarstudio.git
cd bubbleavatarstudio
pnpm install
pnpm dev
```

The studio opens at <http://localhost:5173>. Your work autosaves to
localStorage as you go, so there is nothing to set up and nothing to sign into.

## Using an avatar in your app

Export a character from the studio's Share panel, then render it:

```tsx
import { BubbleAvatar } from "./runtime/BubbleAvatar";
import definition from "./mochi.bubble-avatar.json";

<BubbleAvatar definition={definition} size={128} loop="idle" />;
```

`definition` is the exported file, and it is the only thing the component
needs. `loop` picks which loop plays (the first, if you leave it out);
`autoplay`, `paused`, `size` and `ariaLabel` do what they sound like. On the
server it renders the resting pose and starts no timers.

This is not published to a registry yet, so today you vendor `src/runtime/`
along with the `src/domain`, `src/render` and `src/export` modules it imports —
all of it pure TypeScript, React being the only runtime dependency.

## How it is built

| Layer          | What lives there                                                                       |
| -------------- | -------------------------------------------------------------------------------------- |
| `src/domain/`  | Document types, validation, mutations, geometry, easing, playback, the starter library |
| `src/render/`  | Scene composition and byte-stable SVG serialization                                    |
| `src/app/`     | The studio shell: rail, stage, inspector, rAF engine, autosave, i18n                   |
| `src/export/`  | Portable JSON, SVG/PNG snapshots, ZIP packaging                                        |
| `src/runtime/` | The SSR-safe `<BubbleAvatar/>` component                                               |

Dependencies point downward only, and the two bottom layers import neither
React nor the DOM — a lint rule fails the build if they try.

## Contributing

Issues and pull requests are welcome. Two things to know before you open one:

```bash
pnpm check   # format + typecheck + lint + tests + build — the same gate CI runs
pnpm e2e     # Playwright visual smoke against the production preview build
pnpm demo    # re-records the walkthrough above into docs/media/
```

`pnpm check` must be green, and this is a clean-room project — read part C of
[`docs/LEGACY-DOCS.md`](docs/LEGACY-DOCS.md) before contributing to see what
that rules out. `make help` lists the same targets if you prefer make; it
delegates to these scripts, which stay the single source of truth.

## Further reading

- [`docs/LEGACY-DOCS.md`](docs/LEGACY-DOCS.md) — the entire design record in one
  file: product overview, functional spec, data model, architecture, UI design,
  export formats, testing strategy, roadmap, the clean-room protocol and the
  research notes behind them.
- `docs/screenshots/` — the smoke scenarios `pnpm e2e` archives. They are
  artifacts for a human to read against part 05, not goldens; the stage
  animates, so pixels differ between runs.

## License

[Apache License 2.0](LICENSE) — Copyright 2026 Aurelio Ochoa.

Use it, change it, ship it inside a closed-source product and charge for that
product. All the license asks is that you keep the notice and say what you
changed. It also grants you a patent license from every contributor, and does
**not** grant any right to the Bubble Avatar Studio name.
