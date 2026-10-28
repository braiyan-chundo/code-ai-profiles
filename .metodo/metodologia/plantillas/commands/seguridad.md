---
description: Auditoría de seguridad no bloqueante en {{PROYECTO}} - de una historia, un repo o la entrega - con informe y veredicto.
argument-hint: <HU-#### | repo <nombre> | entrega>
---

Alcance: $ARGUMENTS

- Prepara el terreno: la app local compilada y servida, y las cuentas del seed por rol (una sin permiso).
- **Despacha a `{{N_SEGURIDAD}}`** con el alcance literal, las rutas (historia, repos), la URL local y las cuentas. Recuérdale: solo local, sin corregir.
- Al volver, **no corrijas ni despaches a desarrollo**. Enséñale a la persona el **veredicto (✅ / ❌)**, el resumen y la ruta del informe, y pregúntale por cada `S-n`: ¿arreglar (vía directa o historia), deuda o aceptar el riesgo?
- Sus decisiones, literales, en el informe y en la bitácora de la historia (`hu.mjs log <HU> "seguridad: ❌ … · S-1 arreglar"`).

{{#SI_SEGURIDAD_RIESGO}}
En este proyecto la seguridad se ofrece también sola: en cada historia riesgosa (riesgo con permisos, datos-personales, dinero o contrato), antes de la prueba humana, y como auditoría de la entrega antes de pasar a producción.
{{/SI_SEGURIDAD_RIESGO}}

La seguridad no bloquea: un hallazgo grave no impide cerrar, pero queda decidido y escrito.
