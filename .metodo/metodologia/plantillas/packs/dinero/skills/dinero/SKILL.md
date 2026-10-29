---
name: {{SLUG}}-dinero
description: Reglas de dinero de {{PROYECTO}} - decimal exacto en todas las capas, lo que se congela al crear, el ciclo de liquidación, ajustes con motivo y comprobante. Cárgala ante cualquier cambio que toque un importe.
---

# Dinero

<!-- Tipo: dominio sensible. architect y backend ante cualquier importe. Si el producto no maneja
     dinero pero sí otro dominio sensible (salud, identidad), esta skill se sustituye por la de ese
     dominio con el mismo papel: reglas que ninguna prueba visual detecta. -->

## Las reglas

1. Decimal exacto en la base, string decimal en la frontera, formateador del paquete en la pantalla.
2. Lo que se usa al liquidar se congela en el documento al crearlo.
3. Liquidar dos veces el mismo ciclo da una sola liquidación.
4. <Reglas del dominio, o nada.>

## Cómo se compone un importe

La fórmula, con un ejemplo calculado a mano.

## El ciclo

Cuándo abre, cuándo cierra, qué pasa con lo que llega tarde, que no bloquee el siguiente.

## Ajustes y reembolsos

Con motivo, autor y fecha; nunca se borra, se compensa.

## Comprobante

Qué contiene, cómo se genera, cómo se prueba (texto extraído del documento).

## Lo que cada rol ve

Qué importes ve cada rol y cuáles nunca recibe.

## Verificación

Las pruebas que no pueden faltar: liquidación contra un valor calculado a mano; cambiar la
configuración no altera lo creado; cerrar dos veces; saldo negativo y positivo.
