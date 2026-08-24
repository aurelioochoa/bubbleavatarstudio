// docs/05 §2/§3: lists reorder by dragging, with the ↑ ↓ buttons kept as the
// accessible fallback. This pins the drag half — the order it produces and
// the cases that must not produce one at all.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useDragReorder } from "./dragReorder";

beforeEach(cleanup);

function List({ onReorder }: { onReorder: (ids: string[]) => void }) {
  const ids = ["a", "b", "c", "d"];
  const drag = useDragReorder(ids, onReorder);
  return (
    <ul>
      {ids.map((id) => (
        <li key={id} data-testid={id} {...drag.itemProps(id)}>
          {id}
        </li>
      ))}
    </ul>
  );
}

function setup() {
  const onReorder = vi.fn();
  render(<List onReorder={onReorder} />);
  return { onReorder };
}

/** jsdom's dragEvent has no dataTransfer; supply the parts the hook reads. */
function dropOn(fromId: string, toId: string) {
  const data = new Map<string, string>();
  const dataTransfer = {
    setData: (k: string, v: string) => data.set(k, v),
    getData: (k: string) => data.get(k) ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
  fireEvent.dragStart(screen.getByTestId(fromId), { dataTransfer });
  fireEvent.dragOver(screen.getByTestId(toId), { dataTransfer });
  fireEvent.drop(screen.getByTestId(toId), { dataTransfer });
  fireEvent.dragEnd(screen.getByTestId(fromId), { dataTransfer });
}

describe("useDragReorder", () => {
  it("moves the dragged item into the target's place, dragging down", () => {
    const { onReorder } = setup();
    dropOn("a", "c");
    expect(onReorder).toHaveBeenCalledWith(["b", "c", "a", "d"]);
  });

  it("inserts before the target when dragging up", () => {
    const { onReorder } = setup();
    dropOn("d", "b");
    expect(onReorder).toHaveBeenCalledWith(["a", "d", "b", "c"]);
  });

  it("does nothing when an item is dropped on itself", () => {
    const { onReorder } = setup();
    dropOn("b", "b");
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("marks the item being dragged so it can be shown as lifted", () => {
    setup();
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (k: string, v: string) => data.set(k, v),
      getData: (k: string) => data.get(k) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    fireEvent.dragStart(screen.getByTestId("b"), { dataTransfer });
    expect(screen.getByTestId("b").getAttribute("data-dragging")).toBe("true");
    fireEvent.dragEnd(screen.getByTestId("b"), { dataTransfer });
    expect(screen.getByTestId("b").hasAttribute("data-dragging")).toBe(false);
  });

  it("ignores a drop carrying an id the list does not hold", () => {
    const { onReorder } = setup();
    const data = new Map([["text/plain", "zz"]]);
    const dataTransfer = {
      setData: (k: string, v: string) => data.set(k, v),
      getData: (k: string) => data.get(k) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    fireEvent.drop(screen.getByTestId("a"), { dataTransfer });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
