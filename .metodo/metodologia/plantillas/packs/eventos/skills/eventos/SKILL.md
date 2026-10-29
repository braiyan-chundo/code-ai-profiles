---
name: {{SLUG}}-eventos
description: Bus de eventos de {{PROYECTO}} - bandeja de salida transaccional, colas con reintento creciente y cola de fallidos, y la regla de que toda entrega es al-menos-una-vez y por tanto todo consumidor es idempotente. Cárgala al emitir, consumir o encolar cualquier cosa.
---

# Eventos y colas

<!-- Tipo: eventos. architect y backend, si tocan colas o flujos de cambios. -->

## La decisión, para que nadie la reabra

Qué tecnología y por qué no las otras, con su ADR.

## El camino de un evento

Desde la transacción que lo escribe en la bandeja de salida hasta el consumidor, paso a paso, y
dónde se reanuda si el proceso muere en medio.

## La regla que más caro sale olvidar

Al-menos-una-vez ⇒ todo consumidor es idempotente. Cómo se consigue aquí (clave de deduplicación,
efecto condicionado) y la prueba que lo demuestra (el mismo evento dos veces, un efecto).

## Colas

Nombres (del contrato), reintentos, prefijo por entorno **y por suite de pruebas**. Si las colas viven
en Redis, su política de memoria es `noeviction`: la de por defecto borra trabajos en silencio.

## Lo que nunca se reintenta solo

Lo que pudo mover dinero o consumir un envío: estado recuperable y una persona decide.

## Cola de fallidos

Cuánto se conserva, quién la mira, cómo se reprocesa.

## Verificación

Incluye: no correr la suite con el worker de desarrollo en pie si las colas no llevan prefijo.
