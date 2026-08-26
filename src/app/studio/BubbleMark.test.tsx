// FR-9.8 the header logo: the same mark the favicon is cut from, so the tab
// icon and the wordmark cannot drift apart. Decorative — the <h1> beside it
// already names the studio, and a screen reader should not hear it twice.
import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BubbleMark } from "./BubbleMark";
import { markInkRatio, markSvg } from "../../render/mark";

beforeEach(cleanup);

describe("BubbleMark", () => {
  it("draws the mark the renderer produces, at the size asked for", () => {
    render(<BubbleMark size={18} />);
    const svg = screen.getByTestId("bubble-mark").querySelector("svg");
    // Through the same parse on both sides: the DOM expands `<stop/>` to
    // `<stop></stop>` on the way in, so the raw string never matches back.
    const parsed = document.createElement("div");
    parsed.innerHTML = markSvg(18);
    expect(svg?.outerHTML).toBe(parsed.querySelector("svg")?.outerHTML);
    expect(svg?.getAttribute("width")).toBe("18");
  });

  it("claims only the height it inks, so the header does not grow", () => {
    // The scene is square and the capsule is not: a box tall enough to hold
    // the drawing is taller than the drawing. Occupying the difference would
    // push the header down over the stage for nothing anyone can see.
    render(<BubbleMark size={100} />);
    const host = screen.getByTestId("bubble-mark");
    const ink = markInkRatio();
    expect(host.style.height).toBe(`${String(100 * ink.y)}px`);
    expect(host.style.width).toBe(`${String(100 * ink.x)}px`);
    expect(ink.y).toBeLessThan(1);
    // The drawing itself is still the full box — it overflows, it is not cropped.
    expect(host.querySelector("svg")?.getAttribute("height")).toBe("100");
  });

  it("is hidden from assistive tech — the title beside it is the name", () => {
    render(<BubbleMark size={18} />);
    expect(screen.getByTestId("bubble-mark").getAttribute("aria-hidden")).toBe(
      "true",
    );
  });

  it("is the same drawing as the favicon, only boxed differently", () => {
    const strip = (s: string) => s.replace(/width="\d+" height="\d+"/, "");
    expect(strip(markSvg(18))).toBe(strip(markSvg(64)));
  });
});
