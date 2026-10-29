# Bitácora · HU-0022 · Configuración unificada con apariencia y permisos

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-29 00:26 | hu.mjs | creada: «Configuración unificada con apariencia y permisos» · fase requisitos |
| 2026-10-29 00:27 | orquestador | petición: «se requiere hacer una vista de configuracion unificada… apariencia… seccion de permisos con accesos directos… info o tooltip… opcionales… recuerda generar maqueta» — Braiyan Rodriguez, 2026-10-29 |
| 2026-10-29 00:39 | orquestador | maqueta (diseñador, general-purpose): diseno/maqueta.html, vista.md y 18 capturas. ★ página #/configuracion con pestañas Apariencia/Permisos (subrutas), B índice lateral; D-2 solo la plataforma actual; D-3 estados («Lo necesita: N instancias», «Sin uso todavía», «No se puede comprobar», «Solo informativo»); D-4 aviso del editor con enlace; info en popover accesible con teclado. Dudas: Archivos y carpetas solo con Proyectos, estado real de cuenta admin, enlaces x-apple.systempreferences a arquitectura |
| 2026-10-29 00:48 | orquestador | cambio a la maqueta: «la ui debe seguir estándares armónicos de espaciado y relación de aspecto entre componentes», evaluada con artifact-design y heurísticas de Nielsen; reenviada al diseñador |
| 2026-10-29 00:58 | orquestador | maqueta armónica (diseñador): 1493 casos fuera de escala → 10 (huecos de controles nativos), interlineados y líneas en retícula de 4, contraste corregido salvo el botón primario (3,03:1). Auditoría UX en vista.md (artifact-design + Nielsen). Abiertos: botón primario, correcciones globales (sidebar, chips 24, foco, --lh-*, --esc), radios de DESIGN.md |
| 2026-10-29 01:01 | orquestador | maqueta aprobada: «Aprobadas» — Braiyan Rodriguez, 2026-10-29, con las dos recomendaciones: sistema armónico en toda la app como primer paso de esta historia, y botón primario con texto oscuro (6:1). Radios unificados 9→8, 14→16, 26→24 |
| 2026-10-29 01:01 | hu.mjs | fase requisitos → arquitectura |
