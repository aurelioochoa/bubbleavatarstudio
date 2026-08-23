// i18n es/en kept in sync (FR-9). Spanish-first.
export type MessageKey =
  | "app.title"
  | "rail.bubbles"
  | "rail.add"
  | "tab.look"
  | "tab.moods"
  | "tab.loops"
  | "tab.share"
  | "look.surface"
  | "look.width"
  | "look.height"
  | "look.roundness"
  | "look.rotation"
  | "look.perspective"
  | "look.colors"
  | "look.bodyColor"
  | "look.eyeColor"
  | "look.eyes"
  | "look.spacing"
  | "look.linked"
  | "moods.title"
  | "moods.add"
  | "moods.name"
  | "moods.colorOverride"
  | "loops.title"
  | "loops.add"
  | "loops.mode"
  | "loops.springSpeed"
  | "loops.steps"
  | "loops.addStep"
  | "loops.holdMs"
  | "loops.transition"
  | "common.remove"
  | "common.play"
  | "common.pause"
  | "common.cancel"
  | "common.duplicate"
  | "error.ref"
  | "error.generic";

const es: Record<MessageKey, string> = {
  "app.title": "Bubble Avatar Studio",
  "rail.bubbles": "Burbujas",
  "rail.add": "Nueva burbuja",
  "tab.look": "Aspecto",
  "tab.moods": "Ánimos",
  "tab.loops": "Ciclos",
  "tab.share": "Compartir",
  "look.surface": "Cuerpo",
  "look.width": "Ancho",
  "look.height": "Alto",
  "look.roundness": "Redondez",
  "look.rotation": "Rotación",
  "look.perspective": "Perspectiva",
  "look.colors": "Colores",
  "look.bodyColor": "Cuerpo",
  "look.eyeColor": "Ojos",
  "look.eyes": "Ojos",
  "look.spacing": "Separación",
  "look.linked": "Vinculados",
  "moods.title": "Ánimos",
  "moods.add": "Nuevo ánimo",
  "moods.name": "Nombre",
  "moods.colorOverride": "Color temporal",
  "loops.title": "Ciclos",
  "loops.add": "Nuevo ciclo",
  "loops.mode": "Modo",
  "loops.springSpeed": "Velocidad del muelle",
  "loops.steps": "Pasos",
  "loops.addStep": "Añadir paso",
  "loops.holdMs": "Duración (ms)",
  "loops.transition": "Transición",
  "common.remove": "Eliminar",
  "common.play": "Reproducir",
  "common.pause": "Pausar",
  "common.cancel": "Cancelar",
  "common.duplicate": "Duplicar",
  "error.ref": "No se puede eliminar: está en uso.",
  "error.generic": "Operación rechazada.",
};

const en: Record<MessageKey, string> = {
  "app.title": "Bubble Avatar Studio",
  "rail.bubbles": "Bubbles",
  "rail.add": "New bubble",
  "tab.look": "Look",
  "tab.moods": "Moods",
  "tab.loops": "Loops",
  "tab.share": "Share",
  "look.surface": "Body",
  "look.width": "Width",
  "look.height": "Height",
  "look.roundness": "Roundness",
  "look.rotation": "Rotation",
  "look.perspective": "Perspective",
  "look.colors": "Colors",
  "look.bodyColor": "Body",
  "look.eyeColor": "Eyes",
  "look.eyes": "Eyes",
  "look.spacing": "Spacing",
  "look.linked": "Linked",
  "moods.title": "Moods",
  "moods.add": "New mood",
  "moods.name": "Name",
  "moods.colorOverride": "Temporary color",
  "loops.title": "Loops",
  "loops.add": "New loop",
  "loops.mode": "Mode",
  "loops.springSpeed": "Spring speed",
  "loops.steps": "Steps",
  "loops.addStep": "Add step",
  "loops.holdMs": "Hold (ms)",
  "loops.transition": "Transition",
  "common.remove": "Remove",
  "common.play": "Play",
  "common.pause": "Pause",
  "common.cancel": "Cancel",
  "common.duplicate": "Duplicate",
  "error.ref": "Cannot remove: it is in use.",
  "error.generic": "Operation rejected.",
};

const DICTS = { es, en } as const;

export function translator(locale: "es" | "en"): (key: MessageKey) => string {
  const dict = DICTS[locale];
  return (key) => dict[key];
}
