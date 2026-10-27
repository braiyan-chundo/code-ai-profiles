# Bitácora · HU-0011 · Adopción v4

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-10-27 17:21 | hu.mjs | creada: «Adopción v4» · fase requisitos |
| 2026-10-27 17:21 | hu.mjs | fase requisitos → implementacion (forzado: adopción: el andamiaje ya está hecho) |
| 2026-10-27 17:21 | hu.mjs | estado en-proceso → en-proceso · adopción en curso |
| 2026-10-27 17:22 | orquestador | config.mjs check --todo: 4 lecturas sueltas de process.env (GRAPHIFY_BIN, HOME) en scripts/graphify.mjs:14-19. Es tooling de desarrollo: decidir si se exceptúa en config.codigo o se refactoriza. |
| 2026-10-27 17:22 | orquestador | Andamiaje v4 hecho: config, iniciar, reglas por rol, HU-0010 migrada, ADR-0001, guías heredadas. Validaciones en verde. |
