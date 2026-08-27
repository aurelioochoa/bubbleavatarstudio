// Bubble rail (docs/05 §1): a 72px column of live mini-renders, the active one
// highlighted, `+` at the bottom, and a per-bubble context menu carrying
// rename, duplicate, move up/down and delete-with-confirm.
import { useMemo, useState } from "react";
import { restingScene } from "../../render/scene";
import { sceneToSvg } from "../../render/svg";
import type { Bubble } from "../../domain/document/types";
import type { Action } from "./store";
import type { MessageKey } from "../i18n";
import { Menu, MenuItem } from "./ui";
import { useDragReorder } from "./dragReorder";

export interface BubbleRailProps {
  bubbles: Bubble[];
  activeId: string;
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  /**
   * FR-12.1: a column beside the stage, or a strip above it. Only the axis
   * changes — the thumbnails, the menu and the add button are the same rail
   * either way, which is why this is a prop rather than a second component.
   */
  orientation?: "vertical" | "horizontal";
}

/**
 * Rendered size of a rail thumbnail, in px. The rail is 72px and the thumb
 * 56px, so the 8px of margin either side is the same gutter the 56/40 pair
 * had — the column grew because the mini-render is the thing being read, not
 * because it needed more air.
 */
const THUMB = 56;

export function BubbleRail({
  bubbles,
  activeId,
  dispatch,
  t,
  orientation = "vertical",
}: BubbleRailProps) {
  const across = orientation === "horizontal";
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // docs/05 §1: the rail drags; the menu's move up/down stays the fallback.
  const drag = useDragReorder(
    bubbles.map((b) => b.id),
    (ids) => {
      dispatch({ type: "bubble/reorder", ids });
    },
  );

  return (
    <nav
      aria-label={t("rail.bubbles")}
      data-orientation={orientation}
      className={
        across
          ? // The strip scrolls sideways rather than wrapping: a rail that
            // grows a second row would take the height the stage needs.
            "flex shrink-0 flex-row items-center gap-2 overflow-x-auto border-b border-line bg-panel px-3 py-2"
          : "flex w-18 shrink-0 flex-col items-center gap-2 border-r border-line bg-panel py-3"
      }
    >
      <ul
        className={
          across
            ? "flex shrink-0 flex-row items-center gap-2"
            : "flex w-full flex-col items-center gap-2"
        }
      >
        {bubbles.map((b, i) => (
          <RailItem
            key={b.id}
            dragProps={drag.itemProps(b.id)}
            bubble={b}
            active={b.id === activeId}
            first={i === 0}
            last={i === bubbles.length - 1}
            open={menuFor === b.id}
            dispatch={dispatch}
            t={t}
            order={bubbles.map((x) => x.id)}
            index={i}
            onToggleMenu={() => {
              setMenuFor((cur) => (cur === b.id ? null : b.id));
            }}
            onCloseMenu={() => {
              setMenuFor(null);
            }}
          />
        ))}
      </ul>

      <button
        type="button"
        aria-label={t("rail.add")}
        title={t("rail.add")}
        onClick={() => {
          dispatch({ type: "bubble/add", name: "Bubble" });
        }}
        className="grid h-14 w-14 shrink-0 place-items-center rounded-field border border-dashed border-line text-lg leading-none text-ink-dim transition-colors duration-150 ease-out hover:border-primary hover:text-ink"
      >
        +
      </button>
    </nav>
  );
}

function RailItem({
  dragProps,
  bubble,
  active,
  first,
  last,
  open,
  index,
  order,
  dispatch,
  t,
  onToggleMenu,
  onCloseMenu,
}: {
  dragProps: ReturnType<ReturnType<typeof useDragReorder>["itemProps"]>;
  bubble: Bubble;
  active: boolean;
  first: boolean;
  last: boolean;
  open: boolean;
  index: number;
  order: string[];
  dispatch: React.Dispatch<Action>;
  t: (k: MessageKey) => string;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
}) {
  // Pure render of the resting pose — the same scene the stage and the
  // snapshots build, so the thumbnail is the character rather than an icon.
  const thumb = useMemo(
    () => sceneToSvg(restingScene(bubble), { background: null, size: THUMB }),
    [bubble],
  );

  const move = (to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[index], next[to]] = [order[to], order[index]] as [string, string];
    dispatch({ type: "bubble/reorder", ids: next });
    onCloseMenu();
  };

  return (
    <li {...dragProps} className="relative data-[dragging]:opacity-40">
      <button
        type="button"
        aria-label={bubble.name}
        title={bubble.name}
        aria-current={active}
        onClick={() => {
          dispatch({ type: "bubble/active", id: bubble.id });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onToggleMenu();
        }}
        className={`grid h-14 w-14 place-items-center overflow-hidden rounded-field bg-panel-2 transition-shadow duration-150 ease-out ${
          active
            ? "ring-2 ring-brand"
            : "opacity-70 ring-1 ring-line hover:opacity-100"
        }`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none block"
          dangerouslySetInnerHTML={{ __html: thumb }}
        />
      </button>

      <button
        type="button"
        aria-label={t("rail.menu")}
        title={t("rail.menu")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggleMenu}
        className="touch-target absolute -right-1 -bottom-1 grid h-4 w-4 place-items-center rounded-full border border-line bg-panel text-[9px] leading-none text-ink-dim opacity-60 transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:opacity-100"
      >
        ⋯
      </button>

      {open && (
        <RailMenu
          bubble={bubble}
          first={first}
          last={last}
          t={t}
          onClose={onCloseMenu}
          onRename={(name) => {
            dispatch({ type: "bubble/rename", id: bubble.id, name });
            onCloseMenu();
          }}
          onDuplicate={() => {
            dispatch({ type: "bubble/duplicate", id: bubble.id });
            onCloseMenu();
          }}
          onMoveUp={() => {
            move(index - 1);
          }}
          onMoveDown={() => {
            move(index + 1);
          }}
          onRemove={() => {
            // FR-1.5: deletion requires confirmation.
            if (globalThis.confirm(t("confirm.removeBubble"))) {
              dispatch({ type: "bubble/remove", id: bubble.id });
            }
            onCloseMenu();
          }}
        />
      )}
    </li>
  );
}

function RailMenu({
  bubble,
  first,
  last,
  t,
  onClose,
  onRename,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  bubble: Bubble;
  first: boolean;
  last: boolean;
  t: (k: MessageKey) => string;
  onClose: () => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(bubble.name);

  return (
    <Menu label={bubble.name} onClose={onClose}>
      <input
        type="text"
        value={draft}
        aria-label={t("rail.rename")}
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const name = draft.trim();
            if (name) onRename(name);
          }
        }}
        className="mb-1 w-full rounded-field border border-line bg-panel px-2 py-1.5 text-xs text-ink"
      />
      <MenuItem label={t("common.duplicate")} onClick={onDuplicate} />
      <MenuItem label={t("rail.moveUp")} onClick={onMoveUp} disabled={first} />
      <MenuItem
        label={t("rail.moveDown")}
        onClick={onMoveDown}
        disabled={last}
      />
      <MenuItem label={t("common.remove")} onClick={onRemove} danger />
    </Menu>
  );
}
