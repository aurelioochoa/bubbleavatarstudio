// Look panel flows: surface geometry, the shape family, colors, eye shape and
// placement, extra primitives and ambient idle motion (FR-2, FR-2.6, FR-2.7,
// FR-3, FR-3.4, FR-7). The panel is rendered with a spy dispatch so each
// control is checked against the action it commits.
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LookPanel } from "./LookPanel";
import { createBubble } from "../../../domain/document/create";
import { translator } from "../../i18n";
import { MAX_EXTRAS } from "../../../domain/document/validate";
import type { Action } from "../store";
import type { Bubble, ExtraPrimitive } from "../../../domain/document/types";

beforeEach(() => {
  cleanup();
});

const t = translator("es");

function setup(bubble: Bubble = createBubble("Look")) {
  const dispatch = vi.fn<(a: Action) => void>();
  render(<LookPanel bubble={bubble} dispatch={dispatch} t={t} />);
  return { dispatch, bubble, user: userEvent.setup() };
}

/** Last action of the given type, or undefined. */
function lastOf<T extends Action["type"]>(
  dispatch: ReturnType<typeof vi.fn>,
  type: T,
): Extract<Action, { type: T }> | undefined {
  const calls = dispatch.mock.calls as [Action][];
  const matching = calls.map(([a]) => a).filter((a) => a.type === type);
  return matching.at(-1) as Extract<Action, { type: T }> | undefined;
}

/**
 * The fields are controlled by the bubble prop, which a spy dispatch never
 * updates, so typing character by character would be reverted between keys.
 * Committing the whole value in one change event is what the app sees anyway.
 */
function setNumber(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function setColor(label: string, value: string) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
}

describe("Look panel · surface (FR-2.2)", () => {
  it("edits the surface position", () => {
    const { dispatch } = setup();
    setNumber(t("look.x"), "40");
    expect(lastOf(dispatch, "surface/patch")?.patch).toEqual({ x: 40 });
    setNumber(t("look.y"), "-25");
    expect(lastOf(dispatch, "surface/patch")?.patch).toEqual({ y: -25 });
  });

  // FR-2.2: depth is authored alongside width and height. Before v3 it was
  // derived from the box, so a character could not be made a flat disc or a
  // deep barrel — there was nothing to type into.
  it("edits the surface depth", () => {
    const { dispatch } = setup();
    setNumber(t("look.depth"), "90");
    expect(lastOf(dispatch, "surface/patch")?.patch).toEqual({ depth: 90 });
  });
});

describe("Look panel · shape family (FR-2.6, FR-2.7)", () => {
  it("picks a shape family", async () => {
    const { dispatch, user } = setup();
    await user.click(screen.getByRole("radio", { name: t("look.shapeDrop") }));
    expect(lastOf(dispatch, "surface/patch")?.patch).toEqual({ shape: "drop" });
  });

  it("hides the organic parameters unless organic is the family", () => {
    setup();
    expect(screen.queryByLabelText(t("look.lobes"))).toBeNull();

    const organic = createBubble("Organic");
    cleanup();
    render(
      <LookPanel
        bubble={{
          ...organic,
          body: {
            ...organic.body,
            surface: { ...organic.body.surface, shape: "organic" },
          },
        }}
        dispatch={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByLabelText(t("look.lobes"))).toBeTruthy();
    expect(screen.getByLabelText(t("look.wobble"))).toBeTruthy();
  });

  it("edits the organic parameters", () => {
    const organic = createBubble("Organic");
    const dispatch = vi.fn<(a: Action) => void>();
    cleanup();
    render(
      <LookPanel
        bubble={{
          ...organic,
          body: {
            ...organic.body,
            surface: { ...organic.body.surface, shape: "organic" },
          },
        }}
        dispatch={dispatch}
        t={t}
      />,
    );
    setNumber(t("look.lobes"), "7");
    expect(lastOf(dispatch, "surface/patch")?.patch).toEqual({ lobes: 7 });
  });
});

describe("Look panel · colors (FR-2.3)", () => {
  it("edits the accent color used by extras", () => {
    const { dispatch } = setup();
    setColor(t("look.accentColor"), "#8be9ff");
    expect(lastOf(dispatch, "colors/patch")?.patch).toEqual({
      accent: "#8be9ff",
    });
  });
});

describe("Look panel · eyes (FR-3.1, FR-3.2, FR-3.3)", () => {
  it("edits the resting eye shape", () => {
    const { dispatch } = setup();
    setNumber(t("look.eyeWidth"), "40");
    expect(lastOf(dispatch, "eye/shape")?.patch).toEqual({ width: 40 });
    setNumber(t("look.eyeRoundness"), "0.4");
    expect(lastOf(dispatch, "eye/shape")?.patch).toEqual({ roundness: 0.4 });
  });

  it("shows one placement column while linked and two when unlinked", () => {
    const linked = createBubble("Linked");
    cleanup();
    render(
      <LookPanel
        bubble={{
          ...linked,
          restingFace: { ...linked.restingFace, linked: true },
        }}
        dispatch={vi.fn()}
        t={t}
      />,
    );
    expect(
      screen.queryByRole("group", { name: t("look.rightEye") }),
    ).toBeNull();

    cleanup();
    render(
      <LookPanel
        bubble={{
          ...linked,
          restingFace: { ...linked.restingFace, linked: false },
        }}
        dispatch={vi.fn()}
        t={t}
      />,
    );
    expect(
      screen.getByRole("group", { name: t("look.rightEye") }),
    ).toBeTruthy();
  });

  it("edits one side's placement", () => {
    const base = createBubble("Sides");
    const { dispatch } = setup({
      ...base,
      restingFace: { ...base.restingFace, linked: false },
    });
    const right = screen.getByRole("group", { name: t("look.rightEye") });
    fireEvent.change(within(right).getByLabelText(t("look.offsetY")), {
      target: { value: "12" },
    });
    const action = lastOf(dispatch, "eye/placement");
    expect(action?.side).toBe("right");
    expect(action?.patch).toEqual({ offsetY: 12 });
  });
});

describe("Look panel · extras (FR-2.3, FR-2.4)", () => {
  const withExtras = (): Bubble => {
    const base = createBubble("Extras");
    const extra = (id: string, z: number): ExtraPrimitive => ({
      id,
      kind: "circle",
      width: 40,
      height: 40,
      depth: 40,
      roundness: 1,
      x: 0,
      y: 0,
      rotationDeg: 0,
      z,
      colorRole: "accent",
      color: "#8be9ff",
    });
    return {
      ...base,
      body: { ...base.body, extras: [extra("ex_1", 0), extra("ex_2", 1)] },
    };
  };

  // FR-2.3: an extra is a solid, so it has a depth to author like the body
  // does. The surface carries a Depth field too, so this reaches for the
  // second one on the panel — the first belongs to the body.
  it("edits a primitive's depth", () => {
    const { dispatch } = setup(withExtras());
    const fields = screen.getAllByLabelText(t("look.depth"));
    const first = fields[1];
    if (!first) throw new Error("extra has no depth field");
    fireEvent.change(first, { target: { value: "90" } });
    expect(lastOf(dispatch, "extra/update")?.patch).toEqual({ depth: 90 });
  });

  it("stops at sixteen assembled primitives", () => {
    const base = createBubble("Full");
    const many: Bubble = {
      ...base,
      body: {
        ...base.body,
        extras: Array.from({ length: 16 }, (_, i) => ({
          id: `ex_${String(i)}`,
          kind: "circle" as const,
          width: 40,
          height: 40,
          depth: 34,
          roundness: 1,
          x: 0,
          y: 0,
          rotationDeg: 0,
          z: i,
          colorRole: "accent" as const,
          color: "#8be9ff",
        })),
      },
    };
    setup(many);
    expect(
      screen.getByLabelText(t("look.addExtra")).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("adds a primitive of the chosen kind", async () => {
    const { dispatch, user } = setup();
    await user.selectOptions(screen.getByLabelText(t("look.addExtra")), "ring");
    expect(lastOf(dispatch, "extra/add")?.extra).toMatchObject({
      kind: "ring",
    });
  });

  it("reorders a primitive in z and removes it", async () => {
    const { dispatch, user } = setup(withExtras());
    const rows = screen.getAllByRole("group", { name: /1|2/ });
    expect(rows.length).toBeGreaterThan(0);

    // The back-most primitive moves forward by swapping z with its neighbour.
    const [zUp] = screen.getAllByRole("button", { name: t("look.zUp") });
    if (!zUp) throw new Error("z control missing");
    await user.click(zUp);
    const updates = (dispatch.mock.calls as [Action][])
      .map(([a]) => a)
      .filter((a) => a.type === "extra/update");
    expect(updates).toHaveLength(2);

    dispatch.mockClear();
    const [remove] = screen.getAllByRole("button", {
      name: t("common.remove"),
    });
    if (!remove) throw new Error("remove control missing");
    await user.click(remove);
    expect(lastOf(dispatch, "extra/remove")?.extraId).toBe("ex_1");
  });
});

describe("Look panel · ambient (FR-7.1)", () => {
  it("toggles idle motion and edits its amplitude", async () => {
    const { dispatch, user } = setup();
    await user.click(screen.getByLabelText(t("look.ambientEnabled")));
    expect(lastOf(dispatch, "ambient/patch")?.patch).toEqual({
      enabled: false,
    });
    setNumber(t("look.bodyAmplitude"), "9");
    expect(lastOf(dispatch, "ambient/patch")?.patch).toEqual({
      bodyAmplitude: 9,
    });
  });

  it("sections collapse and reopen (docs/05 §2)", async () => {
    const { user } = setup();
    const header = screen.getByRole("button", { name: /Cuerpo/ });
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("Redondez")).toBeTruthy();

    await user.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByLabelText("Redondez")).toBeNull();

    await user.click(header);
    expect(screen.getByLabelText("Redondez")).toBeTruthy();
  });
});

describe("look card headers (docs/05 §2)", () => {
  it("says which family the surface is while the card is shut", async () => {
    // A card you have to open to learn what it currently says is a card you
    // will not collapse.
    const user = userEvent.setup();
    setup();
    const header = screen.getByRole("button", { name: /Cuerpo/ });
    expect(header.textContent).toContain("Redonda");
    await user.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(header.textContent).toContain("Redonda");
  });

  it("counts the assembled primitives against their cap in the header", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /Primitivas extra/ }).textContent,
    ).toContain(`0/${String(MAX_EXTRAS)}`);
  });

  it("keeps the eye link on the header of the card that holds the pair", () => {
    // It is a property of the pair, not one more number among the numbers.
    setup();
    const linked = screen.getByLabelText("Vinculados");
    expect(linked.closest("section")?.textContent).toContain("Ojos");
    expect(screen.getByRole("button", { name: /Ojos/ }).contains(linked)).toBe(
      false,
    );
  });
});

describe("colour channels (FR-2.5)", () => {
  it("shows the hex under each swatch, not only the colour", () => {
    // Two near-identical swatches are indistinguishable; their hexes are not.
    const { bubble } = setup();
    const field = screen.getByLabelText("Cuerpo").closest("label");
    expect(field?.textContent?.toLowerCase()).toContain(
      bubble.colors.body.toLowerCase(),
    );
  });
});
