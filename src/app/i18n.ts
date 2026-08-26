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
  | "stage.follow"
  | "stage.axes"
  | "stage.intensity"
  | "stage.zoom"
  | "stage.zoomSlider"
  | "stage.guide"
  | "look.surface"
  | "look.size"
  | "look.sizeSlider"
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
  | "look.eyeSize"
  | "look.eyeSizeSlider"
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
  | "moods.eyeSpread"
  | "moods.eyeSpreadHint"
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
  | "header.help"
  | "shortcuts.stage"
  | "shortcuts.panels"
  | "shortcuts.track"
  | "shortcuts.moods"
  | "shortcuts.dragHead.g"
  | "shortcuts.dragHead.d"
  | "shortcuts.escUndo.g"
  | "shortcuts.escUndo.d"
  | "shortcuts.scrub.g"
  | "shortcuts.scrub.d"
  | "shortcuts.escClose.g"
  | "shortcuts.escClose.d"
  | "shortcuts.scrubTrack.g"
  | "shortcuts.scrubTrack.d"
  | "shortcuts.retime.g"
  | "shortcuts.retime.d"
  | "shortcuts.dragMood.g"
  | "shortcuts.dragMood.d"
  | "shortcuts.reorderStep.g"
  | "shortcuts.reorderStep.d"
  | "shortcuts.openEditor.g"
  | "shortcuts.openEditor.d"
  | "help.title"
  | "help.tab.shortcuts"
  | "help.tab.guide"
  | "guide.bubble.title"
  | "guide.bubble.body"
  | "guide.rail.title"
  | "guide.rail.body"
  | "guide.stage.title"
  | "guide.stage.body"
  | "guide.look.title"
  | "guide.look.body"
  | "guide.moods.title"
  | "guide.moods.body"
  | "guide.loops.title"
  | "guide.loops.body"
  | "guide.share.title"
  | "guide.share.body"
  | "guide.saving.title"
  | "guide.saving.body"
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
  "stage.follow": "Seguir el cursor",
  "stage.axes": "Ejes",
  "stage.intensity": "Intensidad",
  "stage.zoom": "Zoom",
  "stage.zoomSlider": "Zoom (deslizador)",
  "stage.guide": "Guía de proyección",
  "look.surface": "Cuerpo",
  "look.size": "Tamaño",
  "look.sizeSlider": "Tamaño (deslizador)",
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
  "look.eyeSize": "Tamaño del ojo",
  "look.eyeSizeSlider": "Tamaño del ojo (deslizador)",
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
  "moods.eyeSpread": "Separación",
  "moods.eyeSpreadHint": "Aleja o junta los dos ojos",
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
  "header.help": "Ayuda",
  "shortcuts.stage": "Escenario",
  "shortcuts.panels": "Paneles",
  "shortcuts.track": "Pista",
  "shortcuts.moods": "Ánimos",
  "shortcuts.dragHead.g": "Arrastrar",
  "shortcuts.dragHead.d": "gira la cabeza",
  "shortcuts.escUndo.g": "Esc",
  "shortcuts.escUndo.d": "deshace el giro",
  "shortcuts.scrub.g": "Arrastrar la etiqueta",
  "shortcuts.scrub.d": "cambia el número",
  "shortcuts.escClose.g": "Esc",
  "shortcuts.escClose.d": "cierra un menú o un diálogo",
  "shortcuts.scrubTrack.g": "Pulsar la línea de tiempo",
  "shortcuts.scrubTrack.d": "mueve la reproducción",
  "shortcuts.retime.g": "Arrastrar el borde de un paso",
  "shortcuts.retime.d": "cambia su duración",
  "shortcuts.dragMood.g": "Arrastrar un ánimo de la bandeja",
  "shortcuts.dragMood.d": "inserta un paso",
  "shortcuts.reorderStep.g": "Arrastrar un paso",
  "shortcuts.reorderStep.d": "lo reordena",
  "shortcuts.openEditor.g": "Doble clic en una tarjeta",
  "shortcuts.openEditor.d": "abre el editor",
  "help.title": "Ayuda",
  "help.tab.shortcuts": "Atajos",
  "help.tab.guide": "Guía",
  "guide.bubble.title": "Qué es una bubble",
  "guide.bubble.body":
    "Una bubble es un personaje: un cuerpo con volumen, una cara que mira desde él y una biblioteca propia de ánimos y ciclos. No hay imágenes de por medio — todo se dibuja a partir de esa descripción, así que se ve nítido a cualquier tamaño.",
  "guide.rail.title": "La columna de personajes",
  "guide.rail.body":
    "La columna de la izquierda guarda tus personajes, cada uno como una miniatura viva. Pulsa uno para editarlo, arrástralo para reordenarlo y abre su menú para duplicarlo o borrarlo.",
  "guide.stage.title": "El escenario",
  "guide.stage.body":
    "El escenario muestra el personaje en vivo, siempre. Arrastra sobre él para girarlo en tres ejes, pulsa Esc para deshacer el giro y enciende la guía para ver la superficie sobre la que se apoya la cara.",
  "guide.look.title": "Aspecto",
  "guide.look.body":
    "La pestaña Aspecto define el cuerpo: familia de forma, tamaño, redondez y profundidad, más los colores y la cara en reposo. El cuerpo es un sólido, así que la profundidad cambia lo que se ve al girarlo.",
  "guide.moods.title": "Ánimos",
  "guide.moods.body":
    "Un ánimo es una expresión guardada: la mirada, la postura de la cabeza y, si quieres, un color distinto. Pulsa una tarjeta para verla en el escenario y haz doble clic para editarla.",
  "guide.loops.title": "Ciclos y la pista",
  "guide.loops.body":
    "Un ciclo encadena ánimos en el tiempo. La pista de abajo dibuja cada paso como una ficha del ancho de su duración: arrastra un ánimo desde la bandeja para insertarlo, arrastra el borde de un paso para retimarlo y pulsa la línea para mover la reproducción.",
  "guide.share.title": "Compartir",
  "guide.share.body":
    "Desde Compartir exportas lo que necesites: una instantánea SVG o PNG, el personaje como archivo portátil para tu propia app, o todo junto en un ZIP. El marco dibujado sobre el escenario es el recorte real.",
  "guide.saving.title": "Dónde queda tu trabajo",
  "guide.saving.body":
    "Todo se guarda solo en este navegador, sin cuenta y sin botón de guardar, y la cabecera dice si el documento está a salvo. Para llevártelo a otro sitio, exporta el proyecto desde Compartir.",
  "empty.title": "Crea tu primera bubble",
  // Not "Photo Mode": that is upstream's own name for this card, recorded
  // verbatim in docs/LEGACY-DOCS.md, black-box notes. docs/05 calls ours the
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
  "stage.follow": "Follow the cursor",
  "stage.axes": "Axes",
  "stage.intensity": "Strength",
  "stage.zoom": "Zoom",
  "stage.zoomSlider": "Zoom (slider)",
  "stage.guide": "Projection guide",
  "look.surface": "Body",
  "look.size": "Size",
  "look.sizeSlider": "Size (slider)",
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
  "look.eyeSize": "Eye size",
  "look.eyeSizeSlider": "Eye size (slider)",
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
  "moods.eyeSpread": "Spread",
  "moods.eyeSpreadHint": "Moves the two eyes apart or together",
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
  "header.help": "Help",
  "shortcuts.stage": "Stage",
  "shortcuts.panels": "Panels",
  "shortcuts.track": "Track",
  "shortcuts.moods": "Moods",
  "shortcuts.dragHead.g": "Drag",
  "shortcuts.dragHead.d": "turns the head",
  "shortcuts.escUndo.g": "Esc",
  "shortcuts.escUndo.d": "undoes the turn",
  "shortcuts.scrub.g": "Drag the label",
  "shortcuts.scrub.d": "changes the number",
  "shortcuts.escClose.g": "Esc",
  "shortcuts.escClose.d": "closes a menu or a dialog",
  "shortcuts.scrubTrack.g": "Press the timeline",
  "shortcuts.scrubTrack.d": "moves playback there",
  "shortcuts.retime.g": "Drag a step's edge",
  "shortcuts.retime.d": "changes its duration",
  "shortcuts.dragMood.g": "Drag a mood from the tray",
  "shortcuts.dragMood.d": "inserts a step",
  "shortcuts.reorderStep.g": "Drag a step",
  "shortcuts.reorderStep.d": "reorders it",
  "shortcuts.openEditor.g": "Double-click a card",
  "shortcuts.openEditor.d": "opens the editor",
  "help.title": "Help",
  "help.tab.shortcuts": "Shortcuts",
  "help.tab.guide": "Guide",
  "guide.bubble.title": "What a bubble is",
  "guide.bubble.body":
    "A bubble is a character: a body with volume, a face looking out of it, and its own library of moods and loops. No images are involved — everything is drawn from that description, so it stays sharp at any size.",
  "guide.rail.title": "The character rail",
  "guide.rail.body":
    "The column on the left holds your characters, each one a live mini-render. Click one to edit it, drag it to reorder, and open its menu to duplicate or delete it.",
  "guide.stage.title": "The stage",
  "guide.stage.body":
    "The stage shows the character live, always. Drag on it to turn the body on three axes, press Esc to undo the turn, and switch the guide on to see the surface the face is anchored to.",
  "guide.look.title": "Look",
  "guide.look.body":
    "The Look tab defines the body: shape family, size, roundness and depth, plus the colours and the resting face. The body is a solid, so depth changes what you see when you turn it.",
  "guide.moods.title": "Moods",
  "guide.moods.body":
    "A mood is a saved expression: the gaze, the pose of the head and, if you want, a different colour. Click a card to see it on the stage, and double-click to edit it.",
  "guide.loops.title": "Loops and the track",
  "guide.loops.body":
    "A loop chains moods over time. The track below draws every step as a chip as wide as it lasts: drag a mood in from the tray to insert one, drag a step's edge to retime it, and press the timeline to move playback.",
  "guide.share.title": "Share",
  "guide.share.body":
    "Share exports whatever you need: an SVG or PNG snapshot, the character as a portable file for your own app, or all of it in a ZIP. The frame drawn on the stage is the real crop.",
  "guide.saving.title": "Where your work is kept",
  "guide.saving.body":
    "Everything autosaves in this browser — no account and no save button — and the header says whether the document is safe. To take it elsewhere, export the project from Share.",
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
