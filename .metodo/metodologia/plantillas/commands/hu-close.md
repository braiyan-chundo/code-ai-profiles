---
description: Cierra una historia de {{PROYECTO}} - gates, reglas de negocio, cierre y commits, sin push.
argument-hint: <HU-####>
---

Historia: $ARGUMENTS

Gates en orden. Cada uno solo si aplica en este proyecto; si uno no pasa, se dice cuál y se para.

- **Veredicto** de la persona en `verificacion.md`, con fecha y sus palabras. Sin él no se cierra.
{{#SI_REVISION}}
- **Revisión técnica** PASS, si la historia era riesgosa.
{{/SI_REVISION}}
{{#SI_QA}}
- **QA**: si existe `qa/informe.md`, cada `Q-n` tiene la decisión de la persona (arreglar, deuda o descartar). Si falta alguna, pregúntasela; no decidas tú.
{{/SI_QA}}
{{#SI_SEGURIDAD_DIAL}}
- **Seguridad**: si existe `seguridad/informe.md`, cada `S-n` tiene la decisión de la persona (arreglar, deuda o aceptar el riesgo).
{{/SI_SEGURIDAD_DIAL}}
- **Suite en verde sobre los SHA finales**: `node .metodo/scripts/pruebas.mjs estado`. Si un repo no está en verde en su HEAD, `pruebas.mjs suite <repo>` (una vez).
- **Configuración y producción**: `node .metodo/scripts/config.mjs check` y `node .metodo/scripts/entorno.mjs check`. Fijos: en rojo no se cierra.
{{#SI_PRODUCT_OWNER}}
- **`{{N_PRODUCT_OWNER}}` cierra**: aplica el delta de reglas de negocio en `docs/producto/reglas/`, coteja cada casilla, completa `## Cierre` y pasa a `terminada`. No corre pruebas.
{{/SI_PRODUCT_OWNER}}
{{^SI_PRODUCT_OWNER}}
- **Cierras tú**: delta de reglas de negocio en `docs/producto/reglas/`, casillas, `## Cierre`, y `node .metodo/scripts/hu.mjs estado <HU> terminada`.
{{/SI_PRODUCT_OWNER}}
{{#SI_ARCHITECT}}
- **Documentación**: si cambió un contrato, una regla técnica o un flujo, `{{N_ARCHITECT}}` lo deja en `docs/arquitectura/`{{SI_OBS: y las señales nuevas en `docs/operaciones/observabilidad.md`}} (si no lo hizo en la revisión).
{{/SI_ARCHITECT}}
- `node .metodo/scripts/hu.mjs check` en verde.
- **Commits** por repo, con `HU: <HU>` como trailer, y el del gobierno (`hu/`, `docs/`). **Sin push, sin publicar, sin desplegar**: eso lo autoriza {{SALIDAS}}, cada vez.

Informa: SHA por repo, pendientes humanos, deuda declarada, y si algo espera una autorización de salida.
