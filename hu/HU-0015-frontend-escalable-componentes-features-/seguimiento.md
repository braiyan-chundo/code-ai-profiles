# Bitácora · HU-0015 · Frontend escalable: componentes, features y router

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-28 00:40 | hu.mjs | creada: «Frontend escalable: componentes, features y router» · fase requisitos |
| 2026-10-28 00:41 | orquestador | petición: «deberias agregar router no? […]» y «crear una historia para que el codigo este separado en componentes y sea escalable siguiendo los patrones de diseño del frontend escalable de react vite»; elección: router en esta historia, no en HU-0014 — Braiyan Rodriguez, 2026-10-28 |
| 2026-10-28 00:44 | hu.mjs | fase requisitos → arquitectura |
| 2026-10-28 00:45 | orquestador | despacho: architect (opus) — arquitectura.md, brief de frontend y docs/arquitectura/frontend.md; orden decidido: HU-0015 antes que HU-0014 — orquestador |
| 2026-10-28 00:59 | orquestador | paso 0 (DOM) por el orquestador en el navegador integrado sobre 5995e50, modo mock, macOS, tema por localStorage: panel-oscuro f28d0af38ff1efc5 (20114), panel-claro 35abdd66022b1013 (20115), apariencia cad870d8bd0bde61 (23243), editor-nueva 8f4b8d1af01879f2 (23360), transferencia 4402e942c9521bfa (30284, con las sesiones de la original desplegadas); innerHTML de #root guardado en localStorage hu0015-baseline:<estado> |
| 2026-10-28 00:59 | hu.mjs | fase arquitectura → implementacion |
| 2026-10-28 00:59 | orquestador | despacho: frontend (opus, por recomendación de architect) con briefs/frontend.md; pasos 0-10, un commit por paso; DOM de pasos 0 y 8 a cargo del orquestador |
| 2026-10-28 01:51 | orquestador | entrega de frontend: pasos 0-10 (02480a9…f5c194a); DOM de los 5 estados idéntico a la línea base (normalizando horas) en dev con el navegador integrado; #/no-existe → #/; consola sin errores en carga limpia; reglas de frontend y stack.comandos actualizados por el orquestador |
| 2026-10-28 01:58 | orquestador | revisión técnica: PASS (architect), observaciones R-1..R-7 sin bloqueantes; R-6 aplicada por el orquestador en la skill; docs/arquitectura/frontend.md corregido por architect |
| 2026-10-28 01:59 | hu.mjs | fase implementacion → verificacion |
| 2026-10-28 02:00 | orquestador | verificación preparada en df42125: suite en verde y registrada; entregada al mantenedor — pendiente su veredicto |
| 2026-10-28 07:28 | orquestador | veredicto: «veo todo bien, lo unico que me gustaria cambiar es que nosotros no trabajamos con npm, trabajamos con pnpm podrias cambiarlo y con eso damos cerrada esta tarea» — Braiyan Rodriguez, 2026-10-28, tras npm run tauri dev en macOS |
| 2026-10-28 07:28 | orquestador | cambio pedido en la verificación: pnpm en lugar de npm (cb4c019), hecho por el orquestador; pnpm build, relacionadas y pnpm tauri dev en verde |
| 2026-10-28 07:28 | hu.mjs | estado en-proceso → terminada |
| 2026-10-28 07:53 | orquestador | CI del PR #10 en rojo: pnpm 12 rechaza react-router 7.18.5 (publicado hace menos de 24 h, minimumReleaseAge). Se fija 7.18.4 (2026-09-15, mismas dependencias); instalación limpia, build, relacionadas y #/no-existe → #/ en verde — orquestador |
| 2026-10-29 00:25 | orquestador | pendientes humanos descartados por el mantenedor, que prioriza otras historias: «necesito que ya no revisemos esas tareas… marcalas quizas como deprecadas o ignoradas» (2026-10-29). No se dan por comprobados; no se vuelven a listar |
