---
description: QA no bloqueante de una historia de {{PROYECTO}} - prueba la guía en el navegador y deja un informe con capturas.
argument-hint: <HU-####>
---

Historia: $ARGUMENTS

- Comprueba que existe `verificacion.md` con su guía y que la app compilada está servida en local. Si no, prepáralo antes (`/hu-work`).
- **Despacha a `{{N_QA}}`** con la ruta de la historia, la URL local y qué cuentas del seed usar. Tiempo máximo: {{TIMEOUT_MIN}} min.
- Al volver, **no corrijas ni despaches a desarrollo**. Enséñale a la persona el **veredicto de QA (✅ APROBADO / ❌ RECHAZADO)**, el resumen y la ruta `qa/informe.md`, y pregúntale por cada `Q-n`: ¿arreglar (vía directa), deuda o descartar?
- Anota el veredicto de QA en la bitácora: `hu.mjs log <HU> "QA: ✅ APROBADO · …"`.
- Sus decisiones, literales, en el informe (`**Decisión de la persona:** …`) y en la bitácora (`hu.mjs log`).

QA no bloquea: la persona puede cerrar con hallazgos declarados como deuda o descartados.
