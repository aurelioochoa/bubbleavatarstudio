// i18n es/en kept in sync (FR-9). Spanish-first.
export type MessageKey =
  | "app.title"
  | "rail.bubbles"
  | "rail.add"
  | "rail.rename"
  | "rail.menu"
  | "rail.moveUp"
  | "rail.moveDown"
  | "empty.title"
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
  | "look.position"
  | "look.x"
  | "look.y"
  | "look.accentColor"
  | "look.eyeShape"
  | "look.eyeWidth"
  | "look.eyeHeight"
  | "look.eyeRoundness"
  | "look.leftEye"
  | "look.rightEye"
  | "look.offsetX"
  | "look.offsetY"
  | "look.scaleX"
  | "look.scaleY"
  | "look.eyeRotation"
  | "look.extras"
  | "look.addExtra"
  | "look.colorRole"
  | "look.zUp"
  | "look.zDown"
  | "look.ambient"
  | "look.ambientEnabled"
  | "look.bodyAmplitude"
  | "look.bodyPeriod"
  | "look.eyeAmplitude"
  | "look.eyePeriod"
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
  | "common.stop"
  | "common.cancel"
  | "common.duplicate"
  | "confirm.removeBubble"
  | "error.ref"
  | "error.generic"
  | "error.import";

const es: Record<MessageKey, string> = {
  "app.title": "Bubble Avatar Studio",
  "rail.bubbles": "Burbujas",
  "rail.add": "Nueva burbuja",
  "rail.rename": "Renombrar",
  "rail.menu": "Acciones de la burbuja",
  "rail.moveUp": "Subir burbuja",
  "rail.moveDown": "Bajar burbuja",
  "empty.title": "Crea tu primera bubble",
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
  "look.position": "Posición",
  "look.x": "X",
  "look.y": "Y",
  "look.accentColor": "Color de acento",
  "look.eyeShape": "Forma del ojo",
  "look.eyeWidth": "Ancho del ojo",
  "look.eyeHeight": "Alto del ojo",
  "look.eyeRoundness": "Redondez del ojo",
  "look.leftEye": "Ojo izquierdo",
  "look.rightEye": "Ojo derecho",
  "look.offsetX": "Desplazamiento X",
  "look.offsetY": "Desplazamiento Y",
  "look.scaleX": "Escala X",
  "look.scaleY": "Escala Y",
  "look.eyeRotation": "Rotación del ojo",
  "look.extras": "Primitivas extra",
  "look.addExtra": "Añadir primitiva",
  "look.colorRole": "Color",
  "look.zUp": "Traer al frente",
  "look.zDown": "Enviar atrás",
  "look.ambient": "Movimiento en reposo",
  "look.ambientEnabled": "Activar movimiento",
  "look.bodyAmplitude": "Amplitud del cuerpo",
  "look.bodyPeriod": "Periodo del cuerpo (ms)",
  "look.eyeAmplitude": "Amplitud de los ojos",
  "look.eyePeriod": "Periodo de los ojos (ms)",
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
  "common.stop": "Detener",
  "common.cancel": "Cancelar",
  "common.duplicate": "Duplicar",
  "confirm.removeBubble": "¿Eliminar esta burbuja?",
  "error.ref": "No se puede eliminar: está en uso.",
  "error.generic": "Operación rechazada.",
  "error.import": "Archivo de proyecto no válido.",
};

const en: Record<MessageKey, string> = {
  "app.title": "Bubble Avatar Studio",
  "rail.bubbles": "Bubbles",
  "rail.add": "New bubble",
  "rail.rename": "Rename",
  "rail.menu": "Bubble actions",
  "rail.moveUp": "Move bubble up",
  "rail.moveDown": "Move bubble down",
  "empty.title": "Create your first bubble",
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
  "look.position": "Position",
  "look.x": "X",
  "look.y": "Y",
  "look.accentColor": "Accent color",
  "look.eyeShape": "Eye shape",
  "look.eyeWidth": "Eye width",
  "look.eyeHeight": "Eye height",
  "look.eyeRoundness": "Eye roundness",
  "look.leftEye": "Left eye",
  "look.rightEye": "Right eye",
  "look.offsetX": "Offset X",
  "look.offsetY": "Offset Y",
  "look.scaleX": "Scale X",
  "look.scaleY": "Scale Y",
  "look.eyeRotation": "Eye rotation",
  "look.extras": "Extra primitives",
  "look.addExtra": "Add primitive",
  "look.colorRole": "Color",
  "look.zUp": "Bring forward",
  "look.zDown": "Send backward",
  "look.ambient": "Idle motion",
  "look.ambientEnabled": "Enable idle motion",
  "look.bodyAmplitude": "Body amplitude",
  "look.bodyPeriod": "Body period (ms)",
  "look.eyeAmplitude": "Eye amplitude",
  "look.eyePeriod": "Eye period (ms)",
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
  "common.stop": "Stop",
  "common.cancel": "Cancel",
  "common.duplicate": "Duplicate",
  "confirm.removeBubble": "Delete this bubble?",
  "error.ref": "Cannot remove: it is in use.",
  "error.generic": "Operation rejected.",
  "error.import": "Invalid project file.",
};

const DICTS = { es, en } as const;

export function translator(locale: "es" | "en"): (key: MessageKey) => string {
  const dict = DICTS[locale];
  return (key) => dict[key];
}
