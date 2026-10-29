---
description: El método de {{PROYECTO}} - estado, diales, validar, cambiar de perfil o de fase, regenerar.
argument-hint: estado | efectivo | validar | perfil <S|M|L> | fase <desarrollo|produccion> | ajuste <dial> <valor> | generar
---

Pedido: $ARGUMENTS

- `estado`, `efectivo`, `validar`: corre `node .metodo/scripts/metodo.mjs <sub>` y resume en tres líneas.
- `perfil <X>`: primero `node .metodo/scripts/metodo.mjs perfil <X> --simular`. Enseña a {{METODO}} la diferencia de diales, las tareas hacia atrás y las preguntas de reevaluación (datos, packs, modelos, repos). **Solo con su sí**, sin `--simular`. Las tareas hacia atrás se abren como historias si son trabajo real.
- `fase <f>`: igual, con `--simular` primero y la checklist a la vista. La checklist no se da por hecha: se comprueba punto por punto.
- `ajuste <dial> <valor>`: escribe el ajuste en `.metodo/config.json` → `ajustes` (solo con el sí de {{METODO}}), `metodo.mjs validar` y `metodo.mjs generar`. Para volver al valor del perfil, se quita el ajuste.
- `generar`: `node .metodo/scripts/metodo.mjs generar`. Recuerda que hay que reiniciar la sesión para que Claude Code cargue agentes y comandos nuevos.

Los archivos generados (agentes, comandos, hooks, settings, `AGENTS.md`) no se editan a mano: las reglas propias de un rol van en `.metodo/reglas/<rol>.md`.
