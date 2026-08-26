// FR-9.7 the help sheet the header opens: the shortcut list the studio answers
// to, and (FR-9.9) a guide to the studio itself, as two tabs of one dialog.
//
// The shortcut list used to be nine sentences stacked in one column, each
// packing a gesture and its effect into a single string. These cases pin the
// split — a gesture is its own element now — because that is what lets the
// groups sit two abreast instead of running down a mostly empty sheet.
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpSheet } from "./HelpSheet";
import { GUIDE_SECTIONS, SHORTCUT_GROUPS } from "./content";
import { translator } from "../../i18n";

beforeEach(cleanup);

const t = translator("es");
const open = (onClose = () => {}) =>
  render(<HelpSheet t={t} onClose={onClose} />);

describe("the sheet is one dialog with two tabs", () => {
  it("opens on the shortcuts tab", () => {
    open();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
  });

  it("names its panel, and points the selected tab at it", () => {
    open();
    const panel = screen.getByRole("tabpanel");
    const selected = screen.getAllByRole("tab")[0];
    expect(selected.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(selected.id);
  });

  it("switches to the guide, and back", async () => {
    const user = userEvent.setup();
    open();
    const first = t(SHORTCUT_GROUPS[0].items[0].gesture);
    const heading = t(GUIDE_SECTIONS[0].title);

    expect(screen.getByText(first)).toBeTruthy();
    expect(screen.queryByText(heading)).toBeNull();

    await user.click(screen.getAllByRole("tab")[1]);
    expect(screen.queryByText(first)).toBeNull();
    expect(screen.getByText(heading)).toBeTruthy();

    await user.click(screen.getAllByRole("tab")[0]);
    expect(screen.getByText(first)).toBeTruthy();
  });

  it("still closes on Escape, whichever tab is showing", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    open(onClose);
    await user.click(screen.getAllByRole("tab")[1]);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("shortcuts read as gesture and effect, not as one sentence", () => {
  it("gives every shortcut its own term and description", () => {
    open();
    const rows = screen.getAllByRole("term");
    const total = SHORTCUT_GROUPS.reduce((n, g) => n + g.items.length, 0);
    expect(rows).toHaveLength(total);
    expect(screen.getAllByRole("definition")).toHaveLength(total);
  });

  it("carries no separator left over from the old one-string form", () => {
    open();
    for (const term of screen.getAllByRole("term")) {
      expect(term.textContent).not.toContain("·");
    }
    for (const def of screen.getAllByRole("definition")) {
      expect(def.textContent).not.toContain("·");
    }
  });

  it("groups them under headings, each group its own list", () => {
    open();
    for (const group of SHORTCUT_GROUPS) {
      const heading = screen.getByText(t(group.title));
      const list = heading.parentElement?.querySelector("dl");
      expect(list).toBeTruthy();
      if (!list) continue;
      expect(within(list).getAllByRole("term")).toHaveLength(
        group.items.length,
      );
    }
  });
});

describe("the guide explains the studio in the reader's language", () => {
  it("renders every section, heading and body", () => {
    open();
    fireEvent.click(screen.getAllByRole("tab")[1]);
    for (const section of GUIDE_SECTIONS) {
      expect(screen.getByText(t(section.title))).toBeTruthy();
      expect(screen.getByText(t(section.body))).toBeTruthy();
    }
  });

  it("covers the studio's surfaces rather than a token paragraph", () => {
    expect(GUIDE_SECTIONS.length).toBeGreaterThanOrEqual(8);
  });

  it("says something in both languages — no key falls through", () => {
    for (const locale of ["es", "en"] as const) {
      const tr = translator(locale);
      for (const section of GUIDE_SECTIONS) {
        expect(tr(section.title).length).toBeGreaterThan(2);
        expect(tr(section.body).length).toBeGreaterThan(30);
      }
    }
  });

  it("is written differently in each language, not copied across", () => {
    const bodies = GUIDE_SECTIONS.map((s) => s.body);
    const same = bodies.filter(
      (b) => translator("es")(b) === translator("en")(b),
    );
    expect(same).toHaveLength(0);
  });
});
