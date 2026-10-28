---
description: Abre una historia nueva en {{PROYECTO}} a partir de una petición.
argument-hint: <la petición, con las palabras de la persona>
---

Petición: $ARGUMENTS

- **Lee la config efectiva** (`node .metodo/scripts/metodo.mjs efectivo`) si no la tienes en esta sesión. No pidas nada que un dial apagado no exija.
- **Clasifica**: ¿es un defecto o un ajuste sin comportamiento nuevo? Entonces es `/fix`, no una historia: dilo y para. Ante duda, historia.
{{#SI_ALCANCE}}
- **El {{ALCANCE_NOMBRE}}** (`{{ALCANCE_ARCHIVO}}`): ¿en qué ítem cabe?
{{#SI_SELLADO}}
   - Si no cabe, es un **cambio de alcance con acta**: analiza qué existe y qué falta, propone el acta con tu recomendación y espera la respuesta literal de quien autoriza según la cláusula ({{APRUEBA}}, salvo que el contrato diga otra cosa). Sin respuesta, no hay historia. Con ella: `docs/producto/actas/acta-NN-<tema>.md` desde `.metodo/metodologia/plantillas/docs/acta-alcance.md` (con su fecha y, si levanta exclusiones, la sección «Exclusiones que se levantan»), `node .metodo/scripts/alcance.mjs aplicar <acta>`, `alcance.mjs check`, y sigue. Los ítems nuevos de un acta comparten área: un cambio que toca dos áreas son dos actas.
{{/SI_SELLADO}}
{{#SI_LISTA_VIVA}}
   - Si no cabe, se añade el ítem al {{ALCANCE_NOMBRE}} con esta historia como dueña, y la bitácora cita la petición. Sin acta.
{{/SI_LISTA_VIVA}}
{{/SI_ALCANCE}}
{{^SI_ALCANCE}}
- Este proyecto no lleva alcance: no menciones alcance ni actas.
{{/SI_ALCANCE}}
- **Crea la historia tú** (no el PO): `node .metodo/scripts/hu.mjs new "<título corto>"`. Si vienen del arranque, ábrelas en el orden propuesto: el número es el orden de apertura.
{{#SI_PRODUCT_OWNER}}
- **Despacha a `{{N_PRODUCT_OWNER}}`** con la plantilla de cuatro bloques (orquestador.md): la petición literal, el contexto comprobado (rutas), las reglas, la entrega.
{{/SI_PRODUCT_OWNER}}
{{^SI_PRODUCT_OWNER}}
- **Escribe tú `hu.md`**: petición literal, criterios observables `AC-n`, ★ con alternativa, reglas de negocio afectadas.
{{/SI_PRODUCT_OWNER}}
- Anota en la bitácora: `node .metodo/scripts/hu.mjs log <HU> "petición: «…» — <quién>, <fecha>"`.
- **Informa**: la ruta, los criterios, las ★ que más pueden cambiar, lo pendiente de decisión. Si hay una ambigüedad con dos productos distintos, la historia queda `en-espera` y lo preguntas.

Siguiente: `/hu-work <HU>`.
