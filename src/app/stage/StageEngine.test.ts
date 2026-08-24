// StageEngine frame ownership (FR-6.1, FR-6.2, FR-8.2). The engine renders the
// resting face whenever there is no loop to play, so a kit without loops — or a
// loop id the active kit does not know — still shows the character.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StageEngine, type StageMode } from "./StageEngine";
import { createDefaultDocument } from "../../domain/document/create";
import { effectiveKit } from "../../domain/document/mutate";
import { restingScene } from "../../render/scene";
import { sceneToSvg } from "../../render/svg";
import type { Bubble, Kit } from "../../domain/document/types";

function fixture(): { bubble: Bubble; kit: Kit } {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  return { bubble, kit: effectiveKit(bubble, doc) };
}

/** jsdom re-serializes self-closing tags, so compare against parsed markup. */
function asMarkup(svg: string): string {
  const host = document.createElement("div");
  host.innerHTML = svg;
  return host.innerHTML;
}

let now = 0;

beforeEach(() => {
  now = 0;
  vi.stubGlobal("performance", { now: () => now });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StageEngine without a loop (FR-6.2)", () => {
  it("renders the resting face when the kit has no loop to play", () => {
    const { bubble, kit } = fixture();
    const host = document.createElement("div");
    const engine = new StageEngine(host, {
      bubble,
      kit: { ...kit, loops: [] },
      loopId: null,
      mode: "stopped",
      headRotation: { x: 0, y: 0, z: 0 },
    });
    engine.update({
      bubble,
      kit: { ...kit, loops: [] },
      loopId: null,
      mode: "stopped",
      headRotation: { x: 0, y: 0, z: 0 },
    });
    expect(host.innerHTML).toContain('id="body"');
  });
});

describe("StageEngine transport (FR-6.1, FR-6.2)", () => {
  function mount(mode: StageMode) {
    const { bubble, kit } = fixture();
    const loop = kit.loops[0];
    if (!loop) throw new Error("fixture missing loop");
    const host = document.createElement("div");
    const opts = {
      bubble,
      kit,
      loopId: loop.id,
      mode,
      headRotation: { x: 0, y: 0, z: 0 },
    };
    const engine = new StageEngine(host, opts);
    engine.update(opts);
    return { host, engine, opts, bubble };
  }

  it("does not advance a paused loop as wall time passes", () => {
    const { host, engine, opts } = mount("paused");
    const frozen = host.innerHTML;
    now = 900;
    engine.update(opts);
    expect(host.innerHTML).toBe(frozen);
  });

  it("advances a playing loop as wall time passes", () => {
    const { host, engine, opts } = mount("playing");
    const first = host.innerHTML;
    now = 900;
    engine.update(opts);
    expect(host.innerHTML).not.toBe(first);
  });

  it("returns to the resting face when stopped", () => {
    // Ambient idle motion keeps running while stopped (FR-7), so it is switched
    // off here to compare against a single resting frame.
    const { host, engine, opts, bubble } = mount("playing");
    const still = {
      ...opts,
      bubble: { ...bubble, ambient: { ...bubble.ambient, enabled: false } },
    };
    now = 900;
    engine.update(still);
    engine.update({ ...still, mode: "stopped" });
    expect(host.innerHTML).toBe(asMarkup(sceneToSvg(restingScene(still.bubble, 0))));
  });

  it("replays from the first step after a stop (FR-6.2)", () => {
    const { host, engine, opts } = mount("playing");
    const firstFrame = host.innerHTML;
    now = 900;
    engine.update(opts);
    engine.update({ ...opts, mode: "stopped" });
    engine.update({ ...opts, mode: "playing" });
    expect(host.innerHTML).toBe(firstFrame);
  });
});
