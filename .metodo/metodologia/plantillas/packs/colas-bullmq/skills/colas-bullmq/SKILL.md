---
name: {{SLUG}}-colas-bullmq
description: Colas con Redis y BullMQ en {{PROYECTO}} - cuándo encolar, productores y workers en NestJS, idempotencia, reintentos con espera creciente, fallidos, deduplicación por jobId, la política de memoria de Redis y cómo no mezclar las pruebas con el worker de desarrollo. Cárgala al encolar, procesar o reintentar cualquier trabajo.
---

# Colas · Redis + BullMQ

<!-- Pack colas-bullmq, forjado desde la documentación oficial el 2026-10-24. Sin revisar en proyecto.
     Solo si el proyecto tiene colas (rasgos.colas). -->

## La regla de oro

**La entrega es al-menos-una-vez: todo worker es idempotente.** Un trabajo puede ejecutarse dos veces
(reintento, caída a mitad, reinicio). El mismo trabajo dos veces debe tener un solo efecto.

## Cuándo encolar

- Lo que no puede perderse aunque el proceso caiga: correos, webhooks salientes, cobros, notificaciones.
- Lo lento que no debe bloquear la respuesta: procesar un webhook entrante, generar un reporte.
- Lo programado o diferido: recordatorios, reintentos con espera.

Un evento interno de NestJS (`@OnEvent`) no basta para nada de lo anterior: se pierde con un reinicio.

## En NestJS

`@nestjs/bullmq`: `BullModule.forRootAsync` con la conexión desde config (`REDIS_URL`, `[SECRET]`),
`BullModule.registerQueue({ name })` por cola, productor con `@InjectQueue`, worker con `@Processor` +
`WorkerHost`. Los nombres de cola y la forma de cada trabajo son parte del contrato del servidor.

## Encolar bien

```ts
await this.cola.add("enviar-confirmacion", { pedidoId }, {
  jobId: `confirmacion:${pedidoId}`,              // deduplica: el mismo jobId no se encola dos veces
  attempts: 5,
  backoff: { type: "exponential", delay: 10_000 },
  removeOnComplete: { age: 86_400, count: 1000 },
  removeOnFail: false,                             // los fallidos se quedan para mirarlos
});
```

- El trabajo lleva **ids**, no objetos enteros: el worker lee el estado actual al ejecutarse.
- Si hay que encolar algo que nace de una transacción de base, **bandeja de salida**: se escribe la
  intención en la misma transacción y un proceso la pasa a la cola. Encolar dentro de la transacción y
  que esta falle deja un trabajo huérfano; encolar después y que el proceso caiga lo pierde.

## Workers idempotentes

- Efecto condicionado: «marcar enviado si no lo estaba» antes o junto con el envío, o una clave de
  idempotencia del proveedor externo.
- Lo que pudo mover dinero o consumir un envío y falló con respuesta incierta: **estado recuperable, sin
  reintento automático**; lo decide una persona.
- Errores definitivos (datos inválidos) se marcan como no reintentables (`UnrecoverableError`).

## Fallidos

Los que agotan reintentos quedan en estado `failed`: quién los mira (un panel como Bull Board protegido,
o un reporte), cuánto se conservan, cómo se reprocesan. Nunca se borran en silencio.

## Redis

- **`maxmemory-policy noeviction`** en el Redis de colas: la política por defecto de algunos proveedores
  borra claves al llenarse y los trabajos desaparecen sin error. Si Redis también hace de caché, que sea
  otra instancia o base.
- Persistencia (AOF) activada en el Redis de colas.
- `REDIS_URL` desde el módulo de configuración; nunca un host escrito.

## Pruebas y desarrollo

- **Prefijo por entorno y por suite** (`prefix: "test:<suite>"`) en colas, workers **y** en el adaptador
  de sockets si usa el mismo Redis: si no, el worker de desarrollo en pie consume los trabajos de las
  pruebas y pueden salir notificaciones reales.
- Si el prefijo no está, el orquestador **para el worker** antes de la suite y lo reinicia después.
- La prueba de idempotencia ejecuta el mismo trabajo dos veces y espera un efecto. La de bandeja de
  salida mata el proceso entre la transacción y el encolado y comprueba que se reanuda.

## Lo que nunca

- Un worker que no tolera ejecutarse dos veces.
- Reintento infinito o sin espera creciente.
- Objetos de dominio enteros dentro del trabajo.
- Redis con política de expulsión de claves para colas.

## Verificación

```bash
node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivos>
```

## Skills relacionadas

`{{SLUG}}-backend-nestjs` (eventos y webhooks) · `{{SLUG}}-persistencia-mongodb` (transacción y bandeja) ·
`{{SLUG}}-eventos` (el porqué de la bandeja de salida).
