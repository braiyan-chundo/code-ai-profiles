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
