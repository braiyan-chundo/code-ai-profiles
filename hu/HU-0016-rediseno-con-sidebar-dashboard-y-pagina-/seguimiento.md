# Bitácora · HU-0016 · Rediseño con sidebar, dashboard y página por instancia

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-28 10:51 | hu.mjs | creada: «Rediseño con sidebar, dashboard y página por instancia» · fase requisitos |
| 2026-10-28 10:52 | orquestador | petición: «en base a los nuevos componentes, se cree una historia de rediseño de la app para que quede con mejor uso, me gustaria ahora un sidebar con un dashboard y que aparte el sidebar se coloque cada claude clonado»; elecciones: resumen global, página propia por instancia, original arriba de los clones — Braiyan Rodriguez, 2026-10-28 |
| 2026-10-28 10:55 | hu.mjs | fase requisitos → arquitectura |
| 2026-10-28 11:20 | orquestador | arquitectura (architect): 7 pasos en tres entregas (E1 Tailwind + tema + shell con rutas; E2 páginas y dashboard; E3 diálogos y limpieza), opus para E1 y E3, sonnet para E2. P-1 (Tailwind 4 exige motor de nivel Safari 16.4) resuelta por el mantenedor: «Subir macOS a 13.3». Paso O por el orquestador: minimumSystemVersion 13.3, README y CHANGELOG con los mínimos; cargo test en verde |
| 2026-10-28 11:20 | hu.mjs | fase arquitectura → implementacion |
