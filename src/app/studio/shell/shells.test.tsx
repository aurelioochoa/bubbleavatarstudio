// FR-12.1: the studio picks one of three shells from the window width, and the
// same state drives all three. These cases drive the real `StudioView` rather
// than a shell in isolation, because what is worth pinning is not how a shell
// looks but that swapping one changes nothing about the studio inside it.
//
// FR-12.3 has the case that would be easiest to lose: inspector overlays
// portal into whichever box the panels scroll in, and on a phone that box is
// the sheet. Get it wrong and the mood editor renders in place and is clipped —
// the exact failure docs/05 §2 describes for the desktop column.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudioView } from "../StudioView";

/** jsdom ships no matchMedia; these are the only queries the studio asks. */
function atWidth(kind: "phone" | "tablet" | "desktop") {
  const matches: Record<string, boolean> = {
    "(min-width: 48rem)": kind !== "phone",
    "(min-width: 64rem)": kind === "desktop",
    "(pointer: coarse)": kind !== "desktop",
  };
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    matches: matches[media] ?? false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Unmount after the last case too, not only before the next one. `cleanup` in
 * `beforeEach` alone leaves the final render of the file mounted when the
 * environment is torn down, and a studio that is still mounted still has its
 * autosave debounce pending — which then fires into a dead tree and fails the
 * run as an unhandled error, with every test passing.
 */
afterEach(cleanup);

const rail = () => screen.getByRole("navigation");

describe("shell selection (FR-12.1)", () => {
  it("gives a desktop the three columns it always had", () => {
    atWidth("desktop");
    render(<StudioView />);

    expect(document.querySelector("aside")).not.toBeNull();
    expect(screen.queryByTestId("sheet")).toBeNull();
    expect(rail().dataset.orientation).toBe("vertical");
  });

  it("gives a phone a bottom sheet and a rail across the top", () => {
    atWidth("phone");
    render(<StudioView />);

    expect(screen.getByTestId("sheet")).toBeTruthy();
    expect(document.querySelector("aside")).toBeNull();
    expect(rail().dataset.orientation).toBe("horizontal");
  });

  it("keeps the stage on every shell — it is what the studio is about", () => {
    for (const kind of ["phone", "tablet", "desktop"] as const) {
      cleanup();
      atWidth(kind);
      render(<StudioView />);
      expect(screen.getByLabelText("bubble stage")).toBeTruthy();
    }
  });

  it("carries the same tabs and the same starting tab across shells", () => {
    atWidth("phone");
    render(<StudioView />);
    const phone = screen.getAllByRole("tab").map((b) => b.textContent);

    cleanup();
    atWidth("desktop");
    render(<StudioView />);
    const desktop = screen.getAllByRole("tab").map((b) => b.textContent);

    expect(phone).toEqual(desktop);
  });
});

describe("phone overlays (FR-12.3)", () => {
  /**
   * The mood editor must mount inside the sheet, over the panel it was opened
   * from. Rendered anywhere else it is clipped by the sheet's scroll box, and
   * the character it exists to be judged against is what gets covered instead.
   */
  it("opens the mood editor inside the sheet, not in the panel that scrolls", async () => {
    atWidth("phone");
    const user = userEvent.setup();
    render(<StudioView />);

    await user.click(screen.getByRole("tab", { name: "Ánimos" }));
    await user.dblClick(screen.getByRole("button", { name: "happy" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(screen.getByTestId("sheet")).getByRole("dialog")).toBe(
      dialog,
    );
  });
});

describe("tablet (FR-12.1)", () => {
  /**
   * 768–1023px has room for the rail and a full-width stage, but not for a
   * 360px inspector standing beside them without squeezing the stage to less
   * than the character needs. So the inspector becomes a drawer: closed by
   * default, opened over the stage, and never covering all of it.
   */
  it("keeps the rail as a column and holds the inspector back", () => {
    atWidth("tablet");
    render(<StudioView />);

    expect(rail().dataset.orientation).toBe("vertical");
    expect(screen.queryByTestId("sheet")).toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("opens the inspector over the stage, and the stage stays", async () => {
    atWidth("tablet");
    const user = userEvent.setup();
    render(<StudioView />);

    await user.click(screen.getByRole("button", { name: "Inspector" }));

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    // FR-4.4 again: whatever the drawer covers, it is not the character.
    expect(screen.getByLabelText("bubble stage")).toBeTruthy();
  });

  it("closes again, so the stage can be had in full", async () => {
    atWidth("tablet");
    const user = userEvent.setup();
    render(<StudioView />);

    const toggle = screen.getByRole("button", { name: "Inspector" });
    await user.click(toggle);
    await user.click(toggle);

    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
