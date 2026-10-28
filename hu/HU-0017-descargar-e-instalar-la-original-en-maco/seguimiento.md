# Bitácora · HU-0017 · Descargar e instalar la original en macOS

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-28 13:40 | hu.mjs | creada: «Descargar e instalar la original en macOS» · fase requisitos |
| 2026-10-28 13:41 | orquestador | petición: «verifiques si es posible que el sistema checkee contra la version oficial en internet y valide si es la ultima version la que tengo instalada en el original, de manera que el sistema baje la version y la actualice automaticamente»; elecciones: «Un botón y listo», «Sincronizar las detenidas», «por ahora solo macos y luego que este implementado crea la hu para windows y linux» — Braiyan Rodriguez, 2026-10-28. Comprobado: el feed trae url (.zip en downloads.claude.ai), sha256 y size; la original es del usuario y la firma Anthropic (Q6L2SF6YDW) |
| 2026-10-28 13:45 | orquestador | el mantenedor confirma el cambio de regla («las reglas pueden mutar […] quiero llevar a code AI profiles al siguiente nivel») y pide implementar e instalar en su Mac; la prueba real queda para cuando salga una versión nueva («cuando salga un update te aviso como fue»); la HU de Windows y Linux se abre cuando esta esté implementada |
| 2026-10-28 13:45 | hu.mjs | fase requisitos → arquitectura |
| 2026-10-28 13:59 | orquestador | arquitectura (architect): RENAME_SWAP con recuperación al arrancar, codesign -R con el requisito de la instalada, hasta 3 redirecciones https a hosts permitidos, progreso por Channel, pendiente en memoria, URLs en compilación (build.rs + config.rs, salda la deuda de HU-0011), ADR-0002. Decisiones del mantenedor: «Sí, sha2 directa», «En memoria», carpeta temporal en /Applications «Sí, vale», reglas «Sí, modificarlas» (encadenar sincronización, red de descarga, módulos Rust); ADR-0002 aceptado. El usuario es admin (/Applications root:admin 775). Modelos: backend opus, frontend sonnet; en secuencia |
| 2026-10-28 13:59 | hu.mjs | fase arquitectura → implementacion |
| 2026-10-28 14:22 | orquestador | backend (opus): 46eae71 contrato B-1, c08a448 config.rs + build.rs (salda la deuda de URLs de HU-0011), befc811 funciones puras con sha2, bd232ef MacosTools inyectable, 87f20be verificación + swap + recuperación, 0023e97 flujo completo. 81 pruebas de Rust (47 antes), fmt, build y relacionadas en verde. 5 variables [PUBLICO] en .env.example. Única dependencia nueva: sha2 0.10 (ya transitiva). No visto: actualización real, compilación en Windows/Linux (CI) |
