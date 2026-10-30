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
| 2026-10-29 00:06 | orquestador | 0.3.0 en main (PR #15, c882b58, CI en verde). DMG local de macOS compilado desde main: Code AI Profiles_0.3.0_aarch64.dmg, 5,8 MB, sha256 289d1145ff1170b94f26c2390c23f633601e9d8d7518dc7f9b0b7a2e873b76c9, hdiutil verify válido, versión 0.3.0, mínimo macOS 13.3, firma ad hoc sin notarizar; pendiente la etiqueta v0.3.0 (mantenedor) y su veredicto |
| 2026-10-29 00:20 | orquestador | etiqueta v0.3.0 subida por el mantenedor; build-desktop.yml (run 40821883140) en verde: macOS Apple Silicon, Windows x64, Linux x64 y Linux ARM64, con sus artefactos en Actions. Falta su veredicto |
| 2026-10-29 00:25 | hu.mjs | fase verificacion → cierre |
| 2026-10-29 00:25 | hu.mjs | estado en-proceso → terminada · veredicto del mantenedor: «demosla por cerrada»; publicada como 0.3.0 |
