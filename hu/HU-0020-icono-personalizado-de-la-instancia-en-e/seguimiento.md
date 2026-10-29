# Bitácora · HU-0020 · Icono personalizado de la instancia en el Dock de macOS

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-28 21:03 | hu.mjs | creada: «Icono personalizado de la instancia en el Dock de macOS» · fase requisitos |
| 2026-10-28 21:04 | orquestador | petición: «analizar la posibilidad […] de que el icono personalizado de una instancia se pueda ver al montarla en el dock del mac» — Braiyan Rodriguez, 2026-10-28. Análisis (architect) en analisis.md: viable con el icono de Finder persistente sin tocar la firma. Decisiones: «Sí, cambiar regla», permiso «Gestión de apps» «Sí, si hace falta» |
| 2026-10-28 22:01 | orquestador | arquitectura (architect): comprobación equivalente con codesign --verify --deep --strict=symlinks + barrido de xattrs + forma de la raíz + CDHash fijado (managed_code_hash) + Team ID y bundle id; staging de sincronización verificado con --strict -R; «Gestión de apps» detectado por EPERM con systemIssue y reintento; contrato: CustomIcon.systemIssue y reapply_instance_icon. Desvíos: reaplicar al lanzar (no al detener), aceptar la autoactualización solo con versión igual o mayor, módulo macos_icon.rs. La regla técnica nueva entra en la regla ya confirmada por el mantenedor. Modelos: backend opus (B-1 primero), frontend sonnet |
| 2026-10-28 22:01 | hu.mjs | fase requisitos → arquitectura |
| 2026-10-28 22:01 | hu.mjs | fase arquitectura → implementacion |
| 2026-10-28 22:27 | orquestador | backend (opus): 391fa89…76fad7f (7 commits): contrato, verify_managed_bundle en macos_icon.rs, registro del CDHash, verificación del staging, ciclo de vida del icono, comprobación al lanzar. 115 pruebas de Rust (antes 92), fmt, build y relacionadas en verde. Desvío relevante: setIcon serializado con 3 reintentos; copias heredadas re-firmadas ad hoc piden sincronizar. No visto: Dock real, «Gestión de apps» real, Windows/Linux |
| 2026-10-28 22:38 | orquestador | frontend (sonnet): ef01d4f «Reintentar» y cableado, 02310ba textos, avisos y badge; test:format 16, test:ui 15/15, build ok; 48 capturas con el mock. Desvíos: error del reintento dentro del editor, iconBusy bloquea el diálogo, pruebas en format.test.ts. Duda de texto: «En el Dock.» + systemMessage suena contradictorio |
