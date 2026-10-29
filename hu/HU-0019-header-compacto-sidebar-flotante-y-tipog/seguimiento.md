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
