---
name: {{SLUG}}-observabilidad
description: Observabilidad en {{PROYECTO}} (nivel {{OBSERVABILIDAD}}) - logs estructurados, id de correlación, captura de errores{{SI_OBS_COMPLETA:, métricas, trazas y alertas}}, cómo se nombra un evento y qué nunca se registra. Cárgala al implementar las señales de una historia o al montar la infraestructura de observabilidad.
---

# Observabilidad (ODD)

<!-- La concreta el pack de observabilidad o de servidor: el logger, la librería, dónde se ve. -->

## La regla de oro

Una funcionalidad no está terminada si en producción no se puede saber que funciona. Las señales de la
historia (`## Señales` y el brief) son parte de la entrega.

## Logs

- Estructurados (JSON): `nivel`, `mensaje`, `evento`, `id_correlacion` y el contexto del negocio.
- Evento con nombre `<dominio>.<hecho_en_pasado>`: `pedido.confirmado`, `pago.fallido`.
- Niveles: `error` (alguien tiene que actuar), `warn` (raro pero manejado), `info` (hechos del negocio),
  `debug` (solo en local).
- El `id_correlacion` entra con la petición (o se crea) y viaja a otros servicios y a las colas.

## Errores

Captura con su pila y su contexto (usuario anonimizado, ruta, versión). Un error esperado del negocio
(«sin stock») no es una excepción: es un `warn` con su evento.

{{#SI_OBS_COMPLETA}}
## Métricas y trazas

- Estándar: OpenTelemetry.
- Métricas de negocio de la historia (contador de pedidos confirmados, de pagos fallidos por motivo) y
  técnicas (latencia por endpoint, errores, saturación).
- Una traza por petición, con los saltos a la base y a servicios externos.
- Alertas con el umbral del brief; cada alerta dice qué hacer.
{{/SI_OBS_COMPLETA}}

## Lo que nunca se registra

Contraseñas, tokens, claves, números de tarjeta, datos personales sin enmascarar (correo, teléfono,
documento): se enmascaran (`j***@dominio.com`).

## Verificación

En local, la acción de la historia produce sus señales en la salida de logs: se comprueba al verificar.
El catálogo vive en `docs/operaciones/observabilidad.md`.
