---
description: Avanza una historia de {{PROYECTO}} a su siguiente fase.
argument-hint: <HU-####>
---

Historia: $ARGUMENTS

Lee `hu.md` (frontmatter: `fase`, `estado`) y `seguimiento.md`. **La fase del archivo es la verdad**, no tu memoria. **La fase dice lo que está en curso**: al empezar un paso, avanza la fase con `node .metodo/scripts/hu.mjs fase <HU> <fase>` (el script solo deja pasar a la siguiente y comprueba lo que esa fase exige: si falta algo, te lo dice), y después despacha. Para donde el modo (`{{MODO}}`) diga.

{{#SI_ARCHITECT}}
## Arquitectura

{{#SI_EXPLORADORES}}
- **`{{N_ARCHITECT}}`**: lanza él mismo, en paralelo, hasta {{EXPLORADORES}} `{{N_EXPLORADOR}}`{{SI_DATOS_AGENTE: y `{{N_DATA}}`}}, y sintetiza en `arquitectura.md`. Si te devuelve la lista de áreas y preguntas porque no pudo lanzarlos, lánzalos tú en un solo mensaje y vuelve a despacharlo.
{{/SI_EXPLORADORES}}
{{^SI_EXPLORADORES}}
{{#SI_DATOS_AGENTE}}
- `{{N_DATA}}`, si la historia toca el modelo de datos de forma no trivial.
{{/SI_DATOS_AGENTE}}
- **`{{N_ARCHITECT}}`** analiza y sintetiza en `arquitectura.md`.
{{/SI_EXPLORADORES}}
{{#SI_DOS_PASOS}}
- Si devuelve **preguntas**, llévaselas a la persona, numeradas, con la recomendación de cada una. Sus respuestas, literales, a la bitácora (`hu.mjs log`). Después, `{{N_ARCHITECT}}` otra vez para la solución y los briefs.
{{/SI_DOS_PASOS}}
- Comprueba que hay un brief por rol que interviene y la recomendación de modelo.
{{/SI_ARCHITECT}}

{{#SI_DISENO}}
## Diseño (si la historia toca interfaz)

{{#SI_DISENO_SISTEMA}}
- Si la fundación de diseño no está aprobada (`docs/diseno/guias.md` dice «pendiente de la fundación»), **primero `/diseno-fundacion`**: no se maqueta ninguna vista antes. `hu.mjs fase` no deja entrar en diseño sin ella.
{{/SI_DISENO_SISTEMA}}
- **`{{N_PRODUCT_DESIGN}}`** con su brief: maqueta con la estructura fija en `diseno/`, **estática** (pantallas y variantes en HTML y CSS, sin lógica ni el stack del proyecto).{{SI_CLAUDE_DESIGN: Si devuelve que no tiene las herramientas de Claude Design, hazlo tú en esta sesión con la skill de diseño.}}
- Entrega la maqueta a la persona y {{SI_FASE_A_FASE:**espera su aprobación**}}{{SI_CONSTRUIR_TODO:sigue: las ★ de diseño se toman con lo recomendado}}{{SI_BLOQUE:sigue; se aprueba en bloque}}. La aprobación, con sus palabras, a la bitácora (`hu.mjs log <HU> "maqueta aprobada: «…»"`){{SI_CONSTRUIR_TODO:; en este modo, «maqueta aprobada por defecto (construir todo)», y la persona la revisa al final}}.
- Diseño y servidor pueden ir **en paralelo** si el servidor no depende de la maqueta.
{{/SI_DISENO}}

## Implementación

{{#SI_IMPLEMENTA_SEPARADO}}
- **`{{N_BACKEND}}`** con su brief y el modelo recomendado. Al volver: commits, variables añadidas, pruebas relacionadas en verde.
{{#SI_DOS_TIEMPOS}}
- Si es riesgosa: `{{N_ARCHITECT}}` revisa el servidor (`### Servidor`). B-n vuelve a backend; O-n a commit corto o deuda.
{{/SI_DOS_TIEMPOS}}
- **`{{N_FRONTEND}}`** con su brief, la maqueta aprobada y la etiqueta o sección del contrato **literal**.
{{/SI_IMPLEMENTA_SEPARADO}}
{{#SI_FULLSTACK}}
- **`{{N_FULLSTACK}}`**{{SI_ARCHITECT: con su brief}}{{SI_DISENO: y la maqueta aprobada}}.
{{/SI_FULLSTACK}}
- Revisa el diff de cada repo: que cada uno escribió solo en su territorio.
{{#SI_REVISION}}
- **Revisión técnica** de `{{N_ARCHITECT}}` si la historia es riesgosa{{SI_REVISION_SIEMPRE: (en este proyecto, siempre)}}{{SI_DOS_TIEMPOS: (aquí, `### Pantallas`; la del servidor ya se hizo)}}, antes de la prueba humana. No corre pruebas: lee `pruebas.mjs estado`.
{{/SI_REVISION}}

## Verificación (la preparas tú; no corriges)

- **Una sola vez**: `node .metodo/scripts/pruebas.mjs suite todos` (tipos, build y suite, con tiempo máximo de {{TIMEOUT_MIN}} min; se salta lo ya en verde en su SHA).{{SI_COLAS: Para antes el worker de desarrollo y reinícialo después.}} Si tarda, di qué corre y cuánto lleva, con el avance que imprime el script.
- Recompila las apps y sírvelas en sus puertos de prueba.
- Fidelidad visual con la maqueta, en los tamaños y temas de la historia.{{SI_TIEMPO_REAL: Tiempo real: dos clientes a la vez.}}
- `verificacion.md` desde la plantilla: comprobaciones, ★, guía numerada con las cuentas del seed, «solo tú puedes comprobar».
{{#SI_SEGURIDAD_RIESGO}}
- **Si la historia es riesgosa** (su `riesgo` incluye permisos, datos-personales, dinero o contrato), ofrece `/seguridad <HU>` **antes** de la prueba humana: así lo grave se arregla antes de que la persona pruebe. No bloquea.
{{/SI_SEGURIDAD_RIESGO}}
- Entrégala{{SI_QA:. Si la persona no tiene tiempo de probar, ofrece `/qa <HU>` (no bloquea)}}. Según el modo: {{SI_FASE_A_FASE:espera el veredicto}}{{SI_CONSTRUIR_TODO:sigue con la siguiente historia}}{{SI_BLOQUE:sigue; se aprueba en bloque}}.
   - Aprobado → `/hu-close`.
   - Cambios → implementación, con responsable; se prueba lo que cambió (relacionadas) y la suite una vez sobre el SHA nuevo.

Informa siempre en una línea: maqueta / código / pruebas / revisión{{SI_QA: / QA}} / falta tu prueba.
