# Bitácora · HU-0010 · Publicar el fix de actualización como versión 0.2.2

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-27 17:21 | hu.mjs | creada: «Publicar el fix de actualización como versión 0.2.2» · fase requisitos |
| 2026-10-27 17:21 | hu.mjs | fase requisitos → verificacion (forzado: adopción: venía de docs/archivo/previo/hu/HU-0010 (metodología previa), en estado Review) |
| 2026-10-27 17:21 | hu.mjs | estado en-proceso → en-proceso · adopción: release 0.2.2 commiteado (be132e5), pendiente PR a develop, luego develop a main y bundle macOS |
| 2026-10-27 17:21 | orquestador | Origen: docs/archivo/previo/hu/HU-0010-publicar-fix-de-actualizacion-como-0-2-2.md (alcance, criterios y evidencia completos allí). |
| 2026-10-28 23:38 | orquestador | cambio de versión decidido por el mantenedor («Limpieza y 0.3.0», 2026-10-28): la 0.2.2 nunca llegó a main y develop acumula HU-0014..HU-0020, así que se publica como 0.3.0 (minor: funciones nuevas), que incluye el fix de la 0.2.2. Rama release-0.3.0: versión, CHANGELOG, README y docs/versionado; falta PR a develop, PR develop→main y el veredicto |
