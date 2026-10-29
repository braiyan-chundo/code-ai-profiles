# La observabilidad (ODD)

> Estado: versión 4 (borrador), 2026-10-24.

**Observability-Driven Development**: cada funcionalidad se construye junto con las señales que
demuestran, en producción, que funciona, y que avisan cuando deja de hacerlo. Dial `observabilidad`.

## 1. Por qué

- Las pruebas dicen que el código hace lo que se especificó; las señales dicen si **en producción**
  lo está haciendo.
- **Ahorra tokens y vueltas**: cuando algo falla, el agente lee logs y trazas en lugar de adivinar,
  añadir `console.log` y reprobar a ciegas.
- Con un cliente no técnico, «¿cuántos pedidos fallaron ayer?» tiene respuesta sin abrir la base.

## 2. Los niveles

| `observabilidad` | Qué se exige |
| --- | --- |
| `off` | Nada más allá de lo que el stack traiga |
| `basica` | **Logs estructurados** (JSON, con nivel, mensaje y contexto), un **id de correlación** por petición que viaja entre servicios, y **captura de errores** con su pila (Sentry o equivalente) |
| `completa` | Lo básico, más **métricas** (las de negocio de cada historia y las técnicas: latencia, errores, saturación), **trazas** distribuidas, **paneles** y **alertas** |

Estándar recomendado: **OpenTelemetry** para trazas y métricas, que no ata a ningún proveedor. El stack
concreto (Grafana con Loki y Prometheus, una plataforma gestionada, Sentry) lo propone `devops` y lo
decide el desarrollador.

Con `fase: produccion`, el mínimo es `basica`.

## 3. Las señales de cada historia

Con `observabilidad` distinto de `off`, la historia tiene `## Señales` junto a los criterios:

```markdown
## Señales

| Id | Señal | Tipo | Dónde | Alerta |
| --- | --- | --- | --- | --- |
| SG-01 | `pedido.confirmado` con pedido_id, total, método de pago | log info | servicio de pedidos | — |
| SG-02 | `pedido.pago_fallido` con motivo del proveedor | log warn + métrica | servicio de pagos | > 5 % en 15 min |
| SG-03 | Duración de la confirmación | métrica (histograma) | endpoint de confirmación | p95 > 2 s |
```

- El `product-owner` propone **qué** hay que poder saber (en lenguaje de negocio).
- El `architect` concreta **cómo**: nombre del evento, campos, tipo, dónde, umbral; y lo pone en el
  brief.
- El implementador las deja en el código; la verificación comprueba que aparecen (en local, en la
  salida de logs).
- **Nunca en una señal**: contraseñas, tokens, datos personales sin enmascarar.

## 4. El catálogo

`docs/operaciones/observabilidad.md` ([plantilla](plantillas/docs/observabilidad.md)) reúne todas las
señales vivas: id, historia que la creó, dónde se ve, alerta. Lo mantiene el `architect` al cerrar
cada historia con señales, igual que el PO mantiene las reglas de negocio.

## 5. La skill

`observabilidad` ([plantilla](plantillas/skills/observabilidad/SKILL.md)): cómo se loguea en este
proyecto, el logger y su formato, el id de correlación, cómo se nombra un evento, qué nunca se loguea,
cómo se añade una métrica. La concreta el pack del stack. La cargan los implementadores al tocar un
flujo con señales y `devops` siempre.
