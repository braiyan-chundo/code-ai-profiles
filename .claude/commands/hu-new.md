---
description: Abre una historia nueva en Code AI Profiles a partir de una petición.
argument-hint: <la petición, con las palabras de la persona>
---
<!-- generado por metodo.mjs desde .metodo/config.json: no editar. -->

Petición: $ARGUMENTS

- **Lee la config efectiva** (`node .metodo/scripts/metodo.mjs efectivo`) si no la tienes en esta sesión. No pidas nada que un dial apagado no exija.
- **Clasifica**: ¿es un defecto o un ajuste sin comportamiento nuevo? Entonces es `/fix`, no una historia: dilo y para. Ante duda, historia.
- Este proyecto no lleva alcance: no menciones alcance ni actas.
- **Crea la historia tú** (no el PO): `node .metodo/scripts/hu.mjs new "<título corto>"`. Si vienen del arranque, ábrelas en el orden propuesto: el número es el orden de apertura.
- **Escribe tú `hu.md`**: petición literal, criterios observables `AC-n`, ★ con alternativa, reglas de negocio afectadas.
- Anota en la bitácora: `node .metodo/scripts/hu.mjs log <HU> "petición: «…» — <quién>, <fecha>"`.
- **Informa**: la ruta, los criterios, las ★ que más pueden cambiar, lo pendiente de decisión. Si hay una ambigüedad con dos productos distintos, la historia queda `en-espera` y lo preguntas.

Siguiente: `/hu-work <HU>`.
