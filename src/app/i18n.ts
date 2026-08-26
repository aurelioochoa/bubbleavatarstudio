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
  | "stage.orientation"
  | "stage.dragHint"
  | "stage.gizmo"
  | "stage.guide"
  | "look.surface"
  | "look.width"
  | "look.height"
  | "look.depth"
  | "look.roundness"
  | "look.shape"
  | "look.shapeRound"
  | "look.shapeOrganic"
  | "look.shapeDrop"
  | "look.shapeCube"
  | "look.shapeCapsule"
  | "look.shapeCylinder"
  | "look.shapeCone"
  | "look.shapeDiamond"
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
  | "moods.pose"
  | "moods.poseHint"
  | "moods.editTitle"
  | "moods.eyeLink"
  | "moods.linkedEyes"
  | "moods.independentEyes"
  | "common.scale"
  | "common.rotation"
  | "moods.search"
  | "moods.unused"
  | "moods.usedInOne"
  | "moods.usedIn"
  | "moods.usedInMany"
  | "moods.removeBlocked"
  | "moods.noMatch"
  | "moods.tray"
  | "moods.trayHint"
  | "moods.dropHint"
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
  | "loops.step"
  | "loops.stepOf"
  | "loops.hold"
  | "loops.entryTransition"
  | "loops.moveLeft"
  | "loops.moveRight"
  | "loops.noStep"
  | "loops.settings"
  | "loops.transitionLinear"
  | "loops.transitionEase"
  | "loops.transitionSpring"
  | "loops.transitionStep"
  | "loops.modeLoop"
  | "loops.modeOnce"
  | "loops.modePingpong"
  | "track.title"
  | "track.timeline"
  | "track.elapsed"
  | "track.expand"
  | "track.collapse"
  | "rail.rename"
  | "rail.menu"
  | "rail.moveUp"
  | "rail.moveDown"
  | "header.saved"
  | "header.saving"
  | "header.saveFailed"
  | "header.shortcuts"
  | "shortcuts.stage"
  | "shortcuts.dragHead"
  | "shortcuts.escUndo"
  | "shortcuts.panels"
  | "shortcuts.scrub"
  | "shortcuts.escClose"
  | "shortcuts.track"
  | "shortcuts.scrubTrack"
  | "shortcuts.retime"
  | "shortcuts.dragMood"
  | "shortcuts.reorderStep"
  | "shortcuts.moods"
  | "shortcuts.openEditor"
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
  | "share.frame"
  | "share.notExported"
  | "share.none"
  | "share.all"
  | "share.weight"
  | "share.pruned"
  | "share.definitionFile"
  | "share.definitionHint"
  | "share.packageFile"
  | "share.packageHint"
  | "share.downloads"
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
  "stage.orientation": "Orientación de la cabeza",
  "stage.dragHint": "Arrastra para girar la cabeza · Esc para deshacer el giro",
  "stage.gizmo": "Rotar cabeza",
  "stage.guide": "Guía de proyección",
  "look.surface": "Cuerpo",
  "look.width": "Ancho",
  "look.height": "Alto",
  "look.depth": "Profundidad",
  "look.roundness": "Redondez",
  "look.shape": "Familia de forma",
  "look.shapeRound": "Redonda",
  "look.shapeOrganic": "Orgánica",
  "look.shapeDrop": "Gota",
  "look.shapeCube": "Cubo",
  "look.shapeCapsule": "Cápsula",
  "look.shapeCylinder": "Cilindro",
  "look.shapeCone": "Cono",
  "look.shapeDiamond": "Rombo",
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
  "moods.pose": "Postura",
  "moods.poseHint": "Gira todo el personaje",
  "moods.editTitle": "Editar ánimo",
  "moods.eyeLink": "Vínculo entre ojos",
  "moods.linkedEyes": "Vinculados",
  "moods.independentEyes": "Independientes",
  "common.scale": "Escala",
  "common.rotation": "Rotación",
  "moods.search": "Buscar ánimo",
  "moods.unused": "Sin usar todavía",
  "moods.usedInOne": "Usado en 1 ciclo",
  "moods.usedIn": "Usado en",
  "moods.usedInMany": "ciclos",
  "moods.removeBlocked": "No se puede borrar mientras un ciclo lo use",
  "moods.noMatch": "Ningún ánimo con ese nombre",
  "moods.tray": "Ánimos",
  "moods.trayHint": "arrastra a la secuencia",
  "moods.dropHint": "Suelta para insertar el paso",
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
  "loops.step": "Paso",
  "loops.stepOf": "de",
  "loops.hold": "Mantener",
  "loops.entryTransition": "Transición de entrada",
  "loops.moveLeft": "Mover el paso a la izquierda",
  "loops.moveRight": "Mover el paso a la derecha",
  "loops.noStep": "Elige un paso en la pista para ajustarlo",
  "loops.settings": "Ciclo",
  "loops.transitionLinear": "Lineal",
  "loops.transitionEase": "Suave",
  "loops.transitionSpring": "Muelle",
  "loops.transitionStep": "Salto",
  "loops.modeLoop": "En bucle",
  "loops.modeOnce": "Una vez",
  "loops.modePingpong": "Ida y vuelta",
  "track.title": "Pista",
  "track.timeline": "Línea de tiempo",
  "track.elapsed": "Tiempo transcurrido",
  "track.expand": "Ampliar secuencia",
  "track.collapse": "Plegar secuencia",
  "rail.rename": "Renombrar",
  "rail.menu": "Acciones de la burbuja",
  "rail.moveUp": "Subir burbuja",
  "rail.moveDown": "Bajar burbuja",
  "header.saved": "Guardado",
  "header.saving": "Guardando…",
  "header.saveFailed": "No se pudo guardar",
  "header.shortcuts": "Atajos",
  "shortcuts.stage": "Escenario",
  "shortcuts.dragHead": "Arrastrar · gira la cabeza",
  "shortcuts.escUndo": "Esc · deshace el giro",
  "shortcuts.panels": "Paneles",
  "shortcuts.scrub": "Arrastrar la etiqueta · cambia el número",
  "shortcuts.escClose": "Esc · cierra un menú o un diálogo",
  "shortcuts.track": "Pista",
  "shortcuts.scrubTrack": "Pulsar la línea de tiempo · mueve la reproducción",
  "shortcuts.retime": "Arrastrar el borde de un paso · cambia su duración",
  "shortcuts.dragMood": "Arrastrar un ánimo de la bandeja · inserta un paso",
  "shortcuts.reorderStep": "Arrastrar un paso · lo reordena",
  "shortcuts.moods": "Ánimos",
  "shortcuts.openEditor": "Doble clic en una tarjeta · abre el editor",
  "empty.title": "Crea tu primera bubble",
  // Not "Photo Mode": that is upstream's own name for this card, recorded
  // verbatim in docs/research/blackbox-notes.md. docs/05 calls ours the
  // snapshot card (CLEANROOM §3, §6).
  "share.photo": "Instantánea",
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
  "share.frame": "Encuadre de exportación",
  "share.notExported": "La guía y la sombra de contacto no se exportan",
  "share.none": "Ninguno",
  "share.all": "Todos",
  "share.weight": "aprox.",
  "share.pruned": "ánimos podados",
  "share.definitionFile": "Definición portable del personaje",
  "share.definitionHint": "JSON que lee el runtime",
  "share.packageFile": "paquete .zip",
  "share.packageHint": "JSON + SVG + ejemplo",
  "share.downloads": "Descargas",
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
  "stage.orientation": "Head orientation",
  "stage.dragHint": "Drag to turn the head · Esc undoes the turn",
  "stage.gizmo": "Rotate head",
  "stage.guide": "Projection guide",
  "look.surface": "Body",
  "look.width": "Width",
  "look.height": "Height",
  "look.depth": "Depth",
  "look.roundness": "Roundness",
  "look.shape": "Shape family",
  "look.shapeRound": "Round",
  "look.shapeOrganic": "Organic",
  "look.shapeDrop": "Drop",
  "look.shapeCube": "Cube",
  "look.shapeCapsule": "Capsule",
  "look.shapeCylinder": "Cylinder",
  "look.shapeCone": "Cone",
  "look.shapeDiamond": "Diamond",
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
  "moods.pose": "Pose",
  "moods.poseHint": "Turns the whole character",
  "moods.editTitle": "Edit mood",
  "moods.eyeLink": "Eye linking",
  "moods.linkedEyes": "Linked",
  "moods.independentEyes": "Independent",
  "common.scale": "Scale",
  "common.rotation": "Rotation",
  "moods.search": "Search mood",
  "moods.unused": "Not used yet",
  "moods.usedInOne": "Used in 1 loop",
  "moods.usedIn": "Used in",
  "moods.usedInMany": "loops",
  "moods.removeBlocked": "Cannot delete while a loop uses it",
  "moods.noMatch": "No mood by that name",
  "moods.tray": "Moods",
  "moods.trayHint": "drag onto the sequence",
  "moods.dropHint": "Drop to insert the step",
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
  "loops.step": "Step",
  "loops.stepOf": "of",
  "loops.hold": "Hold",
  "loops.entryTransition": "Entry transition",
  "loops.moveLeft": "Move step left",
  "loops.moveRight": "Move step right",
  "loops.noStep": "Pick a step on the track to tune it",
  "loops.settings": "Loop",
  "loops.transitionLinear": "Linear",
  "loops.transitionEase": "Ease",
  "loops.transitionSpring": "Spring",
  "loops.transitionStep": "Step",
  "loops.modeLoop": "Looping",
  "loops.modeOnce": "Once",
  "loops.modePingpong": "Ping-pong",
  "track.title": "Track",
  "track.timeline": "Timeline",
  "track.elapsed": "Elapsed",
  "track.expand": "Expand sequence",
  "track.collapse": "Collapse sequence",
  "rail.rename": "Rename",
  "rail.menu": "Bubble actions",
  "rail.moveUp": "Move bubble up",
  "rail.moveDown": "Move bubble down",
  "header.saved": "Saved",
  "header.saving": "Saving…",
  "header.saveFailed": "Could not save",
  "header.shortcuts": "Shortcuts",
  "shortcuts.stage": "Stage",
  "shortcuts.dragHead": "Drag · turns the head",
  "shortcuts.escUndo": "Esc · undoes the turn",
  "shortcuts.panels": "Panels",
  "shortcuts.scrub": "Drag the label · changes the number",
  "shortcuts.escClose": "Esc · closes a menu or a dialog",
  "shortcuts.track": "Track",
  "shortcuts.scrubTrack": "Press the timeline · moves playback there",
  "shortcuts.retime": "Drag a step's edge · changes its duration",
  "shortcuts.dragMood": "Drag a mood from the tray · inserts a step",
  "shortcuts.reorderStep": "Drag a step · reorders it",
  "shortcuts.moods": "Moods",
  "shortcuts.openEditor": "Double-click a card · opens the editor",
  "empty.title": "Create your first bubble",
  "share.photo": "Snapshot",
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
  "share.frame": "Export frame",
  "share.notExported": "The guide and the contact shadow are not exported",
  "share.none": "None",
  "share.all": "All",
  "share.weight": "approx.",
  "share.pruned": "moods pruned",
  "share.definitionFile": "Portable character definition",
  "share.definitionHint": "the JSON the runtime reads",
  "share.packageFile": ".zip package",
  "share.packageHint": "JSON + SVG + example",
  "share.downloads": "Downloads",
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
