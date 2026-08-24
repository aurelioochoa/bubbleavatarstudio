// StageEngine frame ownership (FR-6.1, FR-6.2, FR-8.2). The engine renders the
// resting face whenever there is no loop to play, so a kit without loops — or a
// loop id the active kit does not know — still shows the character.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { StageEngine } from "./StageEngine";
import { createDefaultDocument } from "../../domain/document/create";
import { effectiveKit } from "../../domain/document/mutate";
import type { Bubble, Kit } from "../../domain/document/types";

function fixture(): { bubble: Bubble; kit: Kit } {
  const doc = createDefaultDocument();
  const bubble = doc.bubbles[0];
  if (!bubble) throw new Error("fixture missing bubble");
  return { bubble, kit: effectiveKit(bubble, doc) };
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
      playing: false,
      headRotation: { x: 0, y: 0, z: 0 },
    });
    engine.update({
      bubble,
      kit: { ...kit, loops: [] },
      loopId: null,
      playing: false,
      headRotation: { x: 0, y: 0, z: 0 },
    });
    expect(host.innerHTML).toContain('id="body"');
  });
});
