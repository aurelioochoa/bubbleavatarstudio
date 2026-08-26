// FR-10.4 runtime: <BubbleAvatar/> is a pure function of its props with no
// storage or network access, and renders the SVG the studio stage renders for
// the same definition and state (jsdom per vite config).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { BubbleAvatar } from "./BubbleAvatar";
import { buildPortableAvatar } from "../export/avatar";
import { createDefaultDocument } from "../domain/document/create";
import { sceneToSvg } from "../render/svg";
import { restingScene } from "../render/scene";

beforeEach(() => {
  cleanup();
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

const definition = buildPortableAvatar(
  createDefaultDocument().bubbles[0],
  createDefaultDocument(),
);

describe("BubbleAvatar", () => {
  it("renders resting SVG initially (SSR-safe path)", () => {
    const { container } = render(
      <BubbleAvatar definition={definition} autoplay={false} />,
    );
    const host = container.firstElementChild as HTMLElement;
    // jsdom normalizes self-closing tags, so compare loosely against source parts.
    const svg = sceneToSvg(restingScene(definition.bubble, 0));
    expect(host.innerHTML).toContain('id="body"');
    expect(host.innerHTML).toContain(svg.match(/d="([^"]+)"/)?.[1] ?? "");
  });

  it("exposes size and aria label", () => {
    render(
      <BubbleAvatar
        definition={definition}
        autoplay={false}
        size={256}
        ariaLabel="Mi burbuja"
      />,
    );
    const el = screen_first();
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Mi burbuja");
    expect(el.style.width).toBe("256px");
  });

  it("renders the SVG at the requested size, not the scene size (FR-10.4)", () => {
    render(
      <BubbleAvatar definition={definition} autoplay={false} size={256} />,
    );
    const svg = document.querySelector('[role="img"] svg');
    expect(svg?.getAttribute("width")).toBe("256");
    expect(svg?.getAttribute("height")).toBe("256");
  });

  it("defaults aria label to the bubble name", () => {
    render(<BubbleAvatar definition={definition} autoplay={false} />);
    expect(screen_first().getAttribute("aria-label")).toBe(
      definition.bubble.name,
    );
  });
});

function screen_first(): HTMLElement {
  const el = document.querySelector('[role="img"]');
  if (!el) throw new Error("avatar not rendered");
  return el as HTMLElement;
}
