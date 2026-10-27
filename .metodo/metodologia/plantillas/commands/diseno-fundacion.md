---
description: La fundación de diseño de {{PROYECTO}} - marca, tokens, showcase con todos los componentes, una skill por componente con su índice, y guías - antes de cualquier maqueta.
argument-hint: <HU-#### de la fundación, o vacío para abrirla>
---

Historia: $ARGUMENTS (si está vacío, ábrela con `node .metodo/scripts/hu.mjs new "Fundación de diseño" --fundacion-diseno`).

- **La pregunta**, si no está respondida en `docs/producto/arranque-notas.md`: ¿el cliente tiene marca, manual, referencias o una idea, o se arma el sistema de cero? Su respuesta, literal, a la bitácora.
- **Despacha a `{{N_PRODUCT_DESIGN}}`** para la fundación (diseno.md §3).{{SI_CLAUDE_DESIGN: Si no tiene las herramientas de Claude Design en su sesión, la haces tú aquí con la skill de diseño, y el agente revisa.}}
- Con referencias o de cero: **dos o tres direcciones visuales**; elige la persona.
- Entregables: dirección (`docs/diseno/direccion.md`), tokens, **showcase**: una vista con todos los componentes; después **una skill por componente** (`{{SLUG}}-ui-<id>`, desde `.claude/skills/{{SLUG}}-componentes/plantilla.md`) y **el índice de uso** (`{{SLUG}}-componentes`); guías (`docs/diseno/guias.md`), y la propuesta de **skills de diseño** según el tipo de proyecto.
- La persona aprueba viendo el showcase y una pantalla de ejemplo. Su aprobación, literal, a la bitácora, y en `docs/diseno/guias.md` la línea de estado pasa a «Estado: **aprobada** el <fecha>» (es la señal que comprueba `hu.mjs`). Las skills de diseño elegidas: si existe su pack, a `stack.packs` y `metodo.mjs generar`; si no, se anotan en la skill de diseño del proyecto (no se añade un pack por forjar sin quien lo forje).

- Si el showcase vive en la app (una ruta `/showcase`), lo construye `{{N_FRONTEND}}` con la librería: es código. `{{N_PRODUCT_DESIGN}}` define cómo se ve y escribe las skills y el índice; quien construye ajusta en cada skill cómo se importa y dónde se ve. Al terminar, `node .metodo/scripts/hu.mjs check` (avisa si el índice y las skills no cuadran).

Hasta que esto esté aprobado, ninguna historia maqueta una vista.
