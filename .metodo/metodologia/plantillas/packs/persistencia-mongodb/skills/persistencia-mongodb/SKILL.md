---
name: {{SLUG}}-persistencia-mongodb
description: Persistencia en MongoDB con Mongoose para {{PROYECTO}} - diseño de documentos, transacciones (replica set), escrituras condicionadas al estado, Decimal128 para dinero, índices, paginación, migraciones y las trampas del driver. Cárgala antes de tocar un esquema, una consulta o una migración.
---

# Persistencia · MongoDB

<!-- Pack persistencia-mongodb, forjado desde la documentación oficial el 2026-10-24. Sin revisar en proyecto.
     La cargan data (siempre), architect, backend y fullstack al tocar la base. -->

## La regla de oro

**Lo que se toma una sola vez se toma con una escritura condicionada al estado actual**, en una sola
operación atómica. Nunca leer, comprobar en el código y guardar después.

```ts
const tomado = await this.pedidos.findOneAndUpdate(
  { _id: id, estado: "disponible" },                 // la condición va en el filtro
  { $set: { estado: "tomado", tomadoPor: usuarioId } },
  { new: true },
);
if (!tomado) throw new ErrorDominio("PEDIDO_NO_DISPONIBLE");   // otro lo tomó antes
```

## Las condiciones no negociables

- **Las transacciones necesitan un replica set** (también en local: un nodo con `--replSet` en el
  contenedor). Sin él, `startSession().withTransaction()` falla; la app comprueba al arrancar y se niega
  si una transacción es necesaria.
- La cadena de conexión es `MONGODB_URI` (`[SECRET]`), leída desde el módulo de configuración.

## Diseño de documentos

- **Embeber** lo que se lee siempre junto y no crece sin límite (líneas de un pedido, dirección de envío).
- **Referenciar** lo que se comparte o crece (cliente de un pedido, historial largo).
- Ningún array sin límite dentro de un documento (el documento máximo es 16 MB y se reescribe entero).
- `timestamps: true` en los esquemas; `versionKey` para concurrencia optimista cuando dos personas
  editan lo mismo.

## Dinero

`Decimal128` en el esquema; en la API, string decimal. Se convierte en la capa de persistencia
(getter/`toJSON`), nunca con `Number` ni `parseFloat`. Lo que se usará al cobrar o liquidar se **copia al
documento al crearlo**.

## Transacciones

El cambio de estado y su efecto (movimiento de stock, auditoría, bandeja de salida) en la misma
transacción, pasando `{ session }` a **cada** operación (olvidarlo en una la deja fuera sin error).
Nada de llamadas externas dentro: se guarda la intención y se procesa después.

## Índices

- Uno por consulta nueva que filtre u ordene, declarado en el esquema (`schema.index({ estado: 1, creado: -1 })`),
  con la consulta que lo justifica.
- Compuestos en orden igualdad → orden → rango; parciales para estados frecuentes
  (`partialFilterExpression`); únicos para lo que no se puede repetir (id de evento de un webhook).
- Se comprueba con `.explain("executionStats")` que no hay `COLLSCAN` sobre volumen realista.
- `autoIndex` apagado en producción: los índices se crean por migración.

## Paginación

Por cursor sobre un campo ordenado y único (`_id` o `creado` + `_id`), no con `skip` en colecciones que
crecen. El cursor se valida al leerlo.

## Migraciones

Con una herramienta versionada (por ejemplo `migrate-mongo`), nunca a mano. Idempotentes (`$set` con
filtro de «aún no migrado»), por lotes en colecciones grandes, compatibles con documentos viejos
mientras convivan, y con su vuelta atrás. En producción: plan, respaldo, aprobación de la persona y
prueba previa sobre una copia anonimizada.

## Las trampas del driver

- **ObjectId frente a string**: un filtro `{ clienteId: "65f…" }` contra un campo `ObjectId` no encuentra
  nada y no da error. Se convierte al validar la entrada (pipe de ObjectId) y el esquema tipa la referencia.
- **`lean()`** devuelve objetos planos: sin getters (el `Decimal128` llega crudo), sin virtuals, sin
  métodos. Se usa en lecturas, sabiendo eso.
- **`strictQuery`**: un campo mal escrito en un filtro puede ignorarse y devolver todo. Se fija en la
  conexión.
- `$where` y operadores construidos desde la entrada del usuario: nunca (inyección de operadores).
  Validar que los filtros que llegan son valores, no objetos (`{ $ne: null }`).

## Verificación

```bash
node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivos>
```

Las pruebas de concurrencia lanzan dos tomas simultáneas y esperan exactamente un ganador. Las de
transacción corren contra un replica set (en memoria o en contenedor), no contra un nodo suelto.

## Skills relacionadas

`{{SLUG}}-backend-nestjs` (módulos y DTOs) · `{{SLUG}}-dinero` · `{{SLUG}}-colas-bullmq` (bandeja de salida).
