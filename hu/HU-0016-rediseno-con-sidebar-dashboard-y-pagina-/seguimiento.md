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
| 2026-10-28 11:42 | orquestador | E1 (frontend, opus): eaac80d Tailwind en la app, tema en <html> y test:ui; c4c584f shell con sidebar, titlebar, statusbar y rutas. Orquestador: territorio correcto (sin src-tauri, types, bridge ni DashboardRuntime); en el navegador integrado #/instancias/demo-work con sidebar y sin errores. INCIDENTE: al parar vite, frontend mató con lsof -ti tcp:1420 el PID 62974, proceso de red de la instancia administrada en marcha del mantenedor; Electron lo relanzó (PID 85660, mismo padre 62969, 11:40:26); avisado al mantenedor |
| 2026-10-28 11:59 | orquestador | E2 (frontend, sonnet): 358823a página de instancia, f45efe9 página de la original, 0a83abd dashboard, FeedbackArea y búsqueda en el sidebar; panel heredado retirado; inventario de AC-06 completo salvo diálogos (E3). Orquestador: territorio correcto; dashboard en el navegador integrado sin errores; la instancia del mantenedor sigue viva y el puerto quedó libre |
