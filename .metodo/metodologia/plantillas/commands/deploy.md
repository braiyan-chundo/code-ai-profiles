---
description: Despliegue e infraestructura de {{PROYECTO}} con el agente devops - pregunta, recomienda y la persona decide.
argument-hint: <qué se quiere: decidir dónde desplegar, preparar staging, desplegar la entrega N, montar observabilidad…>
---

Pedido: $ARGUMENTS

- **Despacha a `{{N_DEVOPS}}`** con el pedido literal y el contexto: `.metodo/entornos.json`, `.env.example`, `docs/operaciones/` y la config (repos, stack).
- Si devuelve **preguntas** (con qué cuentan el cliente y el desarrollador), llévaselas a la persona y vuelve con las respuestas literales.
- Si devuelve **opciones**, preséntalas con su recomendación. **Decide el desarrollador**; ninguna opción es obligatoria.
- Con la elección, `{{N_DEVOPS}}` documenta (`docs/operaciones/despliegue.md`, ADR) y prepara los archivos.
- **Cualquier acción sobre un entorno real** (desplegar, migrar, configurar secretos) la autoriza {{SALIDAS}} explícitamente, cada vez, con el comando exacto a la vista. La guarda bloquea producción: no se rodea.
