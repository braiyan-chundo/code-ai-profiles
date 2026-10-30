# Bitácora · HU-0019 · Header compacto, sidebar flotante y tipografía legible

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-28 20:33 | hu.mjs | creada: «Header compacto, sidebar flotante y tipografía legible» · fase requisitos |
| 2026-10-28 20:34 | orquestador | petición: «el header me gustaria que no ocupe tanto espacio; el sidebar […] mas separado (ver imagen1) manteniendo el colapsable en tamaño icono; mejorar la typografy […]; importante si hacer maquetas de lo pedido antes de desarrollar» — Braiyan Rodriguez, 2026-10-28. Rama hu-0019-ajustes-visuales sale de hu-0017-actualizar-original-macos (aún sin fusionar) para no chocar con su interfaz. Comprobado: el tamaño de Apariencia solo cambia --session-* (6–14 px) |
| 2026-10-28 21:03 | orquestador | maqueta (diseñador, general-purpose): diseno/maqueta.html (5 pantallas + escala tipográfica), vista.md y 22 capturas. Variante A ★ una barra de 52 px (primer contenido a 60 px; hoy 193 en macOS), B dos barras (96 px), C sidebar pegado; sidebar flotante de 240 px con 8 px de margen (plegado 48 px); escala --fs-* 11–26 px con mínimo 11 y factor --esc. Entregada al mantenedor para aprobación |
| 2026-10-28 21:08 | orquestador | maqueta aprobada: «aprobada la maqueta puedes comenzar por alli» — Braiyan Rodriguez, 2026-10-28. Sin elegir variante: se toman las propuestas (A ★ una barra de 52 px, sidebar flotante D-2, escala global D-3) y los detalles de A (contadores de sesiones, marca dentro del panel, Escanear solo icono por debajo de 1071 px, barra de estado de 36 px) |
| 2026-10-28 21:08 | hu.mjs | fase requisitos → arquitectura |
| 2026-10-28 21:22 | orquestador | arquitectura (architect): una fila de 52 px (Titlebar sobre el sidebar + PageHeader en SidebarInset), sidebar floating de 256 px, tokens --fs-* y --esc en :root[data-text-size], text-* del catálogo reasignados a la escala, pruebas 12-14 en test:ui; desvíos: iconos y avatares no crecen, AUTO·60S visible a 980, «Cómodo» se queda, --fs-dialog nuevo. Paso 0 por el orquestador: trafficLightPosition 28,40 → 20,19. Modelo: sonnet |
| 2026-10-28 21:22 | hu.mjs | fase arquitectura → implementacion |
| 2026-10-28 21:48 | orquestador | frontend (sonnet): 00ca976…6788ed1 (8 commits, pasos 1-7). Medidas como la maqueta (cabecera 52, primer contenido y=60, sidebar 240/50 px); mínimo de 11 px en 216 combinaciones; test:ui 15/15; peso +0,8 % CSS y +0,7 % JS; 35 evidencias. No visto: macOS real, Windows/Linux reales, vacío del dashboard, tema sistema |
| 2026-10-28 21:53 | orquestador | revisión técnica: PASS (architect). Correcciones menores a frontend: R-3 huecos de las pruebas 12-14, R-4 capturas del showcase, R-5 barra de estado a 980 en Grande, R-6 chevron de migas sin arrastre, R-7 ejemplo text-(--quiet) en la skill, R-8 peso de la skill. R-2: comprobación en el escritorio de macOS con el mantenedor (pnpm tauri dev abierto) |
| 2026-10-28 21:55 | orquestador | R-2 comprobada por el mantenedor en el escritorio de macOS (pnpm tauri dev): «Todo responde» — semáforos, botón de plegar, acciones y arrastre |
| 2026-10-28 21:58 | orquestador | frontend corrige R-3..R-8 en 5ba9af8 (test:ui 15/15, build ok, skill de frontend en 12 045 B). Verificación preparada; la suite se corre en cuanto termine la arquitectura de HU-0020 (árbol limpio) |
| 2026-10-28 21:58 | hu.mjs | fase implementacion → verificacion |
| 2026-10-28 21:59 | orquestador | veredicto: «Aprobado, cierra» — Braiyan Rodriguez, 2026-10-28 |
| 2026-10-28 21:59 | hu.mjs | estado en-proceso → terminada |
| 2026-10-29 00:25 | orquestador | pendientes humanos descartados por el mantenedor, que prioriza otras historias: «necesito que ya no revisemos esas tareas… marcalas quizas como deprecadas o ignoradas» (2026-10-29). No se dan por comprobados; no se vuelven a listar |
