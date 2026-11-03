# Bitácora · HU-0028 · Distintivo de la app original en el icono de instancia

Una línea por evento, en orden: fase, despacho, SHA, aprobación (con sus palabras), veredicto, decisión.
Se añade al final, nunca se reescribe. La escriben `hu.mjs` (fase, estado, log) y el orquestador.

| Fecha | Quién | Qué |
| --- | --- | --- |
| 2026-11-03 12:56 | hu.mjs | creada: «Distintivo de la app original en el icono de instancia» · fase requisitos |
| 2026-11-03 12:57 | orquestador | petición: «al momento de crear el icono o imagen de la instancia que se ve en la app y en el dock me gustaria que a cada imagen le agregues en la esquina inferior derecha el icono de claude, bueno en este caso del software que clona» — Braiyan Rodriguez (mantenedor), 2026-11-03 |
| 2026-11-03 13:04 | orquestador | maqueta: diseno/maqueta.html, vista.md y 2 capturas |
| 2026-11-03 13:04 | orquestador | maqueta aprobada: «Aprobada» — Braiyan, 2026-11-03, con las ★ D-1..D-7 (36 %, punto arriba, sin distintivo en 16 px) |
| 2026-11-03 13:04 | hu.mjs | fase requisitos → arquitectura |
| 2026-11-03 13:15 | orquestador | arquitectura: 6460ebf (arquitectura.md, briefs backend y frontend) |
| 2026-11-03 13:15 | hu.mjs | fase arquitectura → implementacion |
| 2026-11-03 13:31 | orquestador | implementación: backend 4dd8a55 (contrato), e90a629; frontend 771efe1, capturas 1eb605b; sonda con el electron.icns real: distintivo 512 px y Dock 1024 como la maqueta |
| 2026-11-03 13:41 | orquestador | revisión: PASS (f59102b), sin R-n; O-3 y O-4 corregidas en b97193f; O-1, O-2, O-5 aceptadas |
| 2026-11-03 13:41 | hu.mjs | fase implementacion → verificacion |
