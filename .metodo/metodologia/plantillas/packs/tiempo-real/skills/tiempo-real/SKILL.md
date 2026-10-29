---
name: {{SLUG}}-tiempo-real
description: Tiempo real y operación sin conexión en {{PROYECTO}}.{{SI_TIEMPO_REAL: Salas por rol, resincronización por cursor y notificaciones push con sus límites por plataforma.}}{{SI_SIN_CONEXION: Bandeja de salida local con claves de idempotencia.}} Cárgala al tocar {{SI_TIEMPO_REAL:sockets, notificaciones o }}la operación sin conexión.
---

# Tiempo real y sin conexión

<!-- Tipo: tiempo real y sin conexión. backend y frontend, si tocan sockets, bandeja o notificaciones.
     Con solo una de las dos piezas en el stack, el arranque deja solo sus secciones. -->

{{#SI_TIEMPO_REAL}}
## El transporte

Tecnología, adaptador para varias instancias, y **el testigo de acceso pedido en cada reconexión**
(una función, no un valor guardado): si no, tras reconectar el socket queda mudo sin error.

## Salas

Tabla evento → salas que lo reciben. Lo que un rol no debe recibir no entra en su sala.

## Resincronización

Al reconectar: qué se pide, con qué cursor, filtrado por las salas de la sesión.

## La caché del cliente

Cada evento parchea o invalida una consulta concreta; nunca sondeo. Tabla evento → clave de caché.

## Notificaciones

Catálogo cerrado (dónde vive), a quién va cada una, adónde lleva al pulsarla, y los límites por
plataforma (instalación previa, permisos, segundo plano).

{{/SI_TIEMPO_REAL}}
{{#SI_SIN_CONEXION}}
## Bandeja de salida en el cliente

Dónde se guarda, la hora real de cada acción, la clave de idempotencia que el servidor respeta, el
orden de drenado, qué ve la persona mientras tanto y qué pasa si el servidor rechaza una acción ya
hecha en local.

{{/SI_SIN_CONEXION}}
## Cómo se comprueba

{{#SI_TIEMPO_REAL}}
Dos clientes abiertos a la vez y el cambio apareciendo solo.
{{/SI_TIEMPO_REAL}}
{{#SI_SIN_CONEXION}}
Varias acciones en modo avión: al volver la red llegan todas, en orden, con su hora real.
{{/SI_SIN_CONEXION}}
Lo que solo se ve en un dispositivo real se declara pendiente.
