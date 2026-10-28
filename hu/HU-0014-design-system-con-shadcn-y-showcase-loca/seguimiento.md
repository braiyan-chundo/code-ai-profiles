# Bitácora · HU-0014 · Design system con shadcn y showcase local

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-28 00:36 | hu.mjs | creada: «Design system con shadcn y showcase local» · fase requisitos |
| 2026-10-28 00:37 | orquestador | petición: «vamos a mejorar la ui […] instalar todos los componentes estilizarlos y dejar skill por cada uno con su indice»; elecciones: integrada en el proyecto con ruta solo local, Tailwind 4 con los tokens, todos los componentes, una skill con índice y fichas — Braiyan Rodriguez, 2026-10-28 |
| 2026-10-28 00:44 | orquestador | en espera de HU-0015: la estructura de features fija dónde van components/ui, lib/utils y hooks de shadcn — orquestador, 2026-10-28, con «analiza cual deberia ir primero y empieza por esa» de Braiyan Rodriguez |
| 2026-10-28 00:44 | hu.mjs | estado en-proceso → en-espera · depende de HU-0015: la estructura de features fija dónde instala shadcn sus componentes, utilidades y hooks |
| 2026-10-28 08:13 | hu.mjs | estado en-espera → en-proceso |
| 2026-10-28 08:13 | orquestador | se retoma tras cerrar HU-0015 (PR #10 en develop): historia ajustada a src/styles/, pnpm y alias @/; D-1 se mantiene con la justificación nueva (aislar el preflight de Tailwind del documento de la app) — orquestador, con «Sí, retoma HU-0014» de Braiyan Rodriguez |
| 2026-10-28 08:13 | hu.mjs | fase requisitos → arquitectura |
| 2026-10-28 08:32 | orquestador | arquitectura (architect): dist/ idéntico porque Tailwind solo carga en pnpm dev; tokens --ui-* en src/styles/ui-theme.css sin redefinir --primary ni --muted; shadcn@4.22.1 fijado, estilo radix-vega, 63 componentes (incluye 8 de chat y combobox con @base-ui/react); prueba de guarda tests/ui-isolation.test.ts; modelo recomendado para frontend: sonnet |
| 2026-10-28 08:32 | hu.mjs | fase arquitectura → implementacion |
| 2026-10-28 09:03 | orquestador | entrega de frontend (sonnet): pasos 1-7 (f78dc4e…b70217d); dist/ idéntico a la línea base en cada paso; 63 componentes, showcase y skill con 63 fichas; test:ui. Orquestador: test:ui en stack.comandos, showcase.html y components.json en el territorio de frontend, metodo generar; en el navegador integrado, / sin Tailwind y #root de 20114 (igual que la línea base de HU-0015), /showcase.html sin errores. frontend intentó pnpm approve-builds y el permiso lo denegó; no hacía falta (pendingBuilds vacío) |
| 2026-10-28 09:11 | orquestador | revisión técnica: FAIL por R-1 (tests/ui-isolation.test.ts: falso verde en Windows por separadores y sin detectar fugas de Tailwind fuera de index.css/main.tsx); R-2..R-8 sin bloqueo (R-5: anotar cookie sidebar_state y Cmd/Ctrl+B en la ficha). Vuelve a frontend con R-1 y R-5 — orquestador |
| 2026-10-28 09:13 | orquestador | frontend corrige R-1 y R-5 en 283649f; segunda vuelta de la revisión técnica: PASS (R-9 nueva, sin bloqueo). Orquestador: test:ui 5/5 y mutación con import de @/components/ui en src/features/scan en rojo, YAML del workflow parseado |
| 2026-10-28 09:13 | hu.mjs | fase implementacion → verificacion |
| 2026-10-28 09:14 | orquestador | verificación preparada; suite una vez sobre el commit de verificación; entregada al mantenedor — pendiente su veredicto |
| 2026-10-28 09:56 | orquestador | veredicto: «Aprobado, cierra» — Braiyan Rodriguez, 2026-10-28, tras revisar /showcase.html con pnpm dev |
| 2026-10-28 09:56 | hu.mjs | estado en-proceso → terminada |
