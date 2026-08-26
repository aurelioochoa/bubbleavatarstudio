// What the help sheet says, as message keys only (FR-9.7, FR-9.9). Keeping it
// here rather than inside the component is what lets the tests state coverage
// — "at least eight sections", "every gesture has an effect" — without
// reaching into JSX, and keeps StudioView from growing another 80 lines.
//
// Every key below is written out in full rather than assembled from a name.
// `MessageKey` is a closed union, and a literal that does not exist in both
// dictionaries fails typecheck; a template string cast to `MessageKey` would
// compile and then render blank.
import type { MessageKey } from "../../i18n";

/**
 * One binding: what you do, and what it does. These were a single string each
 * until the sheet was redesigned; splitting them is what lets the gesture be
 * set as a key cap beside its effect rather than run together in a sentence.
 */
export interface Shortcut {
  gesture: MessageKey;
  effect: MessageKey;
}

export interface ShortcutGroup {
  title: MessageKey;
  items: Shortcut[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "shortcuts.stage",
    items: [
      { gesture: "shortcuts.dragHead.g", effect: "shortcuts.dragHead.d" },
      { gesture: "shortcuts.escUndo.g", effect: "shortcuts.escUndo.d" },
    ],
  },
  {
    title: "shortcuts.track",
    items: [
      { gesture: "shortcuts.scrubTrack.g", effect: "shortcuts.scrubTrack.d" },
      { gesture: "shortcuts.retime.g", effect: "shortcuts.retime.d" },
      { gesture: "shortcuts.dragMood.g", effect: "shortcuts.dragMood.d" },
      { gesture: "shortcuts.reorderStep.g", effect: "shortcuts.reorderStep.d" },
    ],
  },
  {
    title: "shortcuts.moods",
    items: [
      { gesture: "shortcuts.openEditor.g", effect: "shortcuts.openEditor.d" },
    ],
  },
  {
    title: "shortcuts.panels",
    items: [
      { gesture: "shortcuts.scrub.g", effect: "shortcuts.scrub.d" },
      { gesture: "shortcuts.escClose.g", effect: "shortcuts.escClose.d" },
    ],
  },
];

/** A section of the guide: a heading and a paragraph, both translated. */
export interface GuideSection {
  title: MessageKey;
  body: MessageKey;
}

/** The studio explained in the order a newcomer meets it. */
export const GUIDE_SECTIONS: GuideSection[] = [
  { title: "guide.bubble.title", body: "guide.bubble.body" },
  { title: "guide.rail.title", body: "guide.rail.body" },
  { title: "guide.stage.title", body: "guide.stage.body" },
  { title: "guide.look.title", body: "guide.look.body" },
  { title: "guide.moods.title", body: "guide.moods.body" },
  { title: "guide.loops.title", body: "guide.loops.body" },
  { title: "guide.share.title", body: "guide.share.body" },
  { title: "guide.saving.title", body: "guide.saving.body" },
];
