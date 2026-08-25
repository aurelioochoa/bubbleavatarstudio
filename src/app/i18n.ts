// i18n es/en kept in sync (FR-9). Spanish-first.
export type MessageKey =
  | "app.title"
  | "rail.bubbles"
  | "rail.add"
  | "tab.look"
  | "tab.moods"
  | "tab.loops"
  | "tab.share"
  | "stage.playing"
  | "stage.paused"
  | "stage.resting"
  | "stage.transport"
  | "stage.loop"
  | "stage.gizmo"
  | "stage.guide"
  | "look.surface"
  | "look.width"
  | "look.height"
  | "look.roundness"
  | "look.shape"
  | "look.shapeRound"
  | "look.shapeOrganic"
  | "look.shapeDrop"
  | "look.lobes"
  | "look.wobble"
  | "look.seed"
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
  | "moods.deltas"
  | "moods.clearOverride"
  | "moods.menu"
  | "moods.edit"
  | "moods.moveUp"
  | "moods.moveDown"
  | "moods.mirror"
  | "moods.topUp"
  | "moods.topUpHint"
  | "moods.overrideBodyColor"
  | "moods.overrideEyesColor"
  | "common.save"
  | "common.reset"
  | "common.rotationX"
  | "common.rotationY"
  | "common.rotationZ"
  | "common.close"
  | "loops.title"
  | "loops.add"
  | "loops.mode"
  | "loops.springSpeed"
  | "loops.steps"
  | "loops.addStep"
  | "loops.holdMs"
  | "loops.transition"
  | "loops.moveUp"
  | "loops.moveDown"
  | "loops.name"
  | "loops.group"
  | "loops.groupLife"
  | "loops.groupReaction"
  | "loops.blink"
  | "loops.blinkMin"
  | "loops.blinkMax"
  | "loops.blinkDuration"
  | "loops.summary"
  | "loops.summarySteps"
  | "loops.summaryHolds"
  | "loops.summaryCycle"
  | "loops.summaryBlink"
  | "loops.blinkOff"
  | "rail.rename"
  | "rail.menu"
  | "rail.moveUp"
  | "rail.moveDown"
  | "empty.title"
  | "share.photo"
  | "share.runtime"
  | "share.project"
  | "share.resolution"
  | "share.background"
  | "share.bgTransparent"
  | "share.bgSolid"
  | "share.bgGradient"
  | "share.bgRadial"
  | "share.bgFrom"
  | "share.bgTo"
  | "share.preview"
  | "share.loops"
  | "share.importTitle"
  | "share.importReplace"
  | "share.solidColor"
  | "share.exportProject"
  | "share.importProject"
  | "common.remove"
  | "common.play"
  | "common.pause"
  | "common.stop"
  | "common.cancel"
  | "common.duplicate"
  | "confirm.removeBubble"
  | "confirm.removeLoop"
  | "confirm.removeMood"
  | "error.ref"
  | "error.generic"
  | "error.import";

const es: Record<MessageKey, string> = {
  "app.title": "Bubble Avatar Studio",
  "rail.bubbles": "Burbujas",
  "rail.add": "Nueva burbuja",
  "tab.look": "Aspecto",
  "tab.moods": "Ánimos",
  "tab.loops": "Ciclos",
  "tab.share": "Compartir",
  "stage.playing": "Reproduciendo",
  "stage.paused": "En pausa",
  "stage.resting": "En reposo",
  "stage.transport": "Transporte",
  "stage.loop": "Ciclo",
  "stage.gizmo": "Rotar cabeza",
  "stage.guide": "Guía de proyección",
  "look.surface": "Cuerpo",
  "look.width": "Ancho",
  "look.height": "Alto",
  "look.roundness": "Redondez",
  "look.shape": "Familia de forma",
  "look.shapeRound": "Redonda",
  "look.shapeOrganic": "Orgánica",
  "look.shapeDrop": "Gota",
  "look.lobes": "Lóbulos",
  "look.wobble": "Irregularidad",
  "look.seed": "Semilla",
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
  "moods.deltas": "Ajustes de los ojos",
  "moods.clearOverride": "Quitar color",
  "moods.menu": "Acciones",
  "moods.edit": "Editar",
  "moods.moveUp": "Subir",
  "moods.moveDown": "Bajar",
  "moods.mirror": "Reflejar izquierdo → derecho",
  "moods.topUp": "Añadir lo que falta",
  "moods.topUpHint":
    "La biblioteca creció desde que guardaste este proyecto. Añadir no cambia nada de lo que ya tienes.",
  "moods.overrideBodyColor": "Color del cuerpo",
  "moods.overrideEyesColor": "Color de los ojos",
  "common.save": "Guardar",
  "common.reset": "Restablecer",
  "common.rotationX": "Rotación X",
  "common.rotationY": "Rotación Y",
  "common.rotationZ": "Rotación Z",
  "common.close": "Cerrar",
  "loops.title": "Ciclos",
  "loops.add": "Nuevo ciclo",
  "loops.mode": "Modo",
  "loops.springSpeed": "Velocidad del muelle",
  "loops.steps": "Pasos",
  "loops.addStep": "Añadir paso",
  "loops.holdMs": "Duración (ms)",
  "loops.transition": "Transición",
  "loops.moveUp": "Subir paso",
  "loops.moveDown": "Bajar paso",
  "loops.name": "Nombre del ciclo",
  "loops.group": "Grupo",
  "loops.groupLife": "Vida",
  "loops.groupReaction": "Reacciones",
  "loops.blink": "Parpadeo",
  "loops.blinkMin": "Intervalo mínimo (ms)",
  "loops.blinkMax": "Intervalo máximo (ms)",
  "loops.blinkDuration": "Duración del parpadeo (ms)",
  "loops.summary": "Resumen",
  "loops.summarySteps": "pasos",
  "loops.summaryHolds": "Duraciones",
  "loops.summaryCycle": "Ciclo completo",
  "loops.summaryBlink": "Parpadeo",
  "loops.blinkOff": "Sin parpadeo",
  "rail.rename": "Renombrar",
  "rail.menu": "Acciones de la burbuja",
  "rail.moveUp": "Subir burbuja",
  "rail.moveDown": "Bajar burbuja",
  "empty.title": "Crea tu primera bubble",
  "share.photo": "Photo Mode",
  "share.runtime": "Runtime",
  "share.project": "Proyecto",
  "share.resolution": "Resolución",
  "share.background": "Fondo",
  "share.bgTransparent": "Sin fondo",
  "share.bgSolid": "Sólido",
  // "Degradado" clipped to "Degrada…" in the four-way segmented control at the
  // inspector's 360px; docs/05 names the pair linear/radial anyway.
  "share.bgGradient": "Lineal",
  "share.bgRadial": "Radial",
  "share.bgFrom": "Color inicial",
  "share.bgTo": "Color final",
  "share.preview": "Vista previa",
  "share.loops": "Ciclos incluidos",
  "share.importTitle": "¿Reemplazar el proyecto?",
  "share.importReplace": "Reemplazar",
  "share.solidColor": "Color del fondo",
  "share.exportProject": "Exportar proyecto",
  "share.importProject": "Importar proyecto",
  "common.remove": "Eliminar",
  "common.play": "Reproducir",
  "common.pause": "Pausar",
  "common.stop": "Detener",
  "common.cancel": "Cancelar",
  "common.duplicate": "Duplicar",
  "confirm.removeBubble": "¿Eliminar esta burbuja?",
  "confirm.removeLoop": "¿Eliminar este ciclo?",
  "confirm.removeMood": "¿Eliminar este ánimo?",
  "error.ref": "No se puede eliminar: está en uso.",
  "error.generic": "Operación rechazada.",
  "error.import": "Archivo de proyecto no válido.",
};

const en: Record<MessageKey, string> = {
  "app.title": "Bubble Avatar Studio",
  "rail.bubbles": "Bubbles",
  "rail.add": "New bubble",
  "tab.look": "Look",
  "tab.moods": "Moods",
  "tab.loops": "Loops",
  "tab.share": "Share",
  "stage.playing": "Playing",
  "stage.paused": "Paused",
  "stage.resting": "Resting",
  "stage.transport": "Transport",
  "stage.loop": "Loop",
  "stage.gizmo": "Rotate head",
  "stage.guide": "Projection guide",
  "look.surface": "Body",
  "look.width": "Width",
  "look.height": "Height",
  "look.roundness": "Roundness",
  "look.shape": "Shape family",
  "look.shapeRound": "Round",
  "look.shapeOrganic": "Organic",
  "look.shapeDrop": "Drop",
  "look.lobes": "Lobes",
  "look.wobble": "Wobble",
  "look.seed": "Seed",
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
  "moods.deltas": "Eye adjustments",
  "moods.clearOverride": "Clear color",
  "moods.menu": "Actions",
  "moods.edit": "Edit",
  "moods.moveUp": "Move up",
  "moods.moveDown": "Move down",
  "moods.mirror": "Mirror left → right",
  "moods.topUp": "Add what's missing",
  "moods.topUpHint":
    "The library has grown since this project was saved. Adding never changes what you already have.",
  "moods.overrideBodyColor": "Body color",
  "moods.overrideEyesColor": "Eye color",
  "common.save": "Save",
  "common.reset": "Reset",
  "common.rotationX": "Rotation X",
  "common.rotationY": "Rotation Y",
  "common.rotationZ": "Rotation Z",
  "common.close": "Close",
  "loops.title": "Loops",
  "loops.add": "New loop",
  "loops.mode": "Mode",
  "loops.springSpeed": "Spring speed",
  "loops.steps": "Steps",
  "loops.addStep": "Add step",
  "loops.holdMs": "Hold (ms)",
  "loops.transition": "Transition",
  "loops.moveUp": "Move step up",
  "loops.moveDown": "Move step down",
  "loops.name": "Loop name",
  "loops.group": "Group",
  "loops.groupLife": "Life",
  "loops.groupReaction": "Reactions",
  "loops.blink": "Blink",
  "loops.blinkMin": "Min interval (ms)",
  "loops.blinkMax": "Max interval (ms)",
  "loops.blinkDuration": "Blink duration (ms)",
  "loops.summary": "Summary",
  "loops.summarySteps": "steps",
  "loops.summaryHolds": "Holds",
  "loops.summaryCycle": "Full cycle",
  "loops.summaryBlink": "Blink",
  "loops.blinkOff": "No blinking",
  "rail.rename": "Rename",
  "rail.menu": "Bubble actions",
  "rail.moveUp": "Move bubble up",
  "rail.moveDown": "Move bubble down",
  "empty.title": "Create your first bubble",
  "share.photo": "Photo Mode",
  "share.runtime": "Runtime",
  "share.project": "Project",
  "share.resolution": "Resolution",
  "share.background": "Background",
  "share.bgTransparent": "Transparent",
  "share.bgSolid": "Solid",
  "share.bgGradient": "Linear",
  "share.bgRadial": "Radial",
  "share.bgFrom": "From color",
  "share.bgTo": "To color",
  "share.preview": "Preview",
  "share.loops": "Included loops",
  "share.importTitle": "Replace the project?",
  "share.importReplace": "Replace",
  "share.solidColor": "Background color",
  "share.exportProject": "Export project",
  "share.importProject": "Import project",
  "common.remove": "Remove",
  "common.play": "Play",
  "common.pause": "Pause",
  "common.stop": "Stop",
  "common.cancel": "Cancel",
  "common.duplicate": "Duplicate",
  "confirm.removeBubble": "Delete this bubble?",
  "confirm.removeLoop": "Delete this loop?",
  "confirm.removeMood": "Delete this mood?",
  "error.ref": "Cannot remove: it is in use.",
  "error.generic": "Operation rejected.",
  "error.import": "Invalid project file.",
};

const DICTS = { es, en } as const;

export function translator(locale: "es" | "en"): (key: MessageKey) => string {
  const dict = DICTS[locale];
  return (key) => dict[key];
}
