---
description: Cierra una historia de Code AI Profiles - gates, reglas de negocio, cierre y commits, sin push.
argument-hint: <HU-####>
---
<!-- generado por metodo.mjs desde .metodo/config.json: no editar. -->

Historia: $ARGUMENTS

Gates en orden. Cada uno solo si aplica en este proyecto; si uno no pasa, se dice cuál y se para.

- **Veredicto** de la persona en `verificacion.md`, con fecha y sus palabras. Sin él no se cierra.
- **Revisión técnica** PASS, si la historia era riesgosa.
- **Suite en verde sobre los SHA finales**: `node .metodo/scripts/pruebas.mjs estado`. Si un repo no está en verde en su HEAD, `pruebas.mjs suite <repo>` (una vez).
- **Configuración y producción**: `node .metodo/scripts/config.mjs check` y `node .metodo/scripts/entorno.mjs check`. Fijos: en rojo no se cierra.
- **Cierras tú**: delta de reglas de negocio en `docs/producto/reglas/`, casillas, `## Cierre`, y `node .metodo/scripts/hu.mjs estado <HU> terminada`.
- **Documentación**: si cambió un contrato, una regla técnica o un flujo, `architect` lo deja en `docs/arquitectura/` (si no lo hizo en la revisión).
- `node .metodo/scripts/hu.mjs check` en verde.
- **Commits** por repo, con `HU: <HU>` como trailer, y el del gobierno (`hu/`, `docs/`). **Sin push, sin publicar, sin desplegar**: eso lo autoriza Braiyan Rodriguez (mantenedor), cada vez.

Informa: SHA por repo, pendientes humanos, deuda declarada, y si algo espera una autorización de salida.
