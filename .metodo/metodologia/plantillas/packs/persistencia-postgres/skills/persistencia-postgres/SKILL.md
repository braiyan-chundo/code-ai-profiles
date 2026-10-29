---
name: {{SLUG}}-persistencia-postgres
description: Persistencia en PostgreSQL para {{PROYECTO}} - tipos exactos, transacciones, escrituras condicionadas al estado, bloqueos, índices, migraciones versionadas y trampas habituales. Cárgala antes de tocar un esquema, una consulta o una migración.
---

# Persistencia · PostgreSQL

<!-- Pack persistencia-postgres. La cargan data, architect, backend y fullstack al tocar la base.
     Lo concreto del ORM o del driver del proyecto va en el pack del servidor. -->

## La regla de oro

**Lo que se toma una sola vez se toma con una escritura condicionada al estado actual**, en una sola
sentencia. Nunca leer, comprobar en el código y escribir después: entre las dos cosas, otro proceso
gana.

```sql
UPDATE pedidos SET estado = 'tomado', tomado_por = $1
WHERE id = $2 AND estado = 'disponible'
RETURNING id;           -- 0 filas: otro lo tomó antes
```

## Tipos

| Para | Usa | Nunca |
| --- | --- | --- |
| Dinero | `numeric(12,2)` (o la escala del negocio); en la app, string decimal o una librería decimal | `real`, `double precision`, `money` |
| Fechas con hora | `timestamptz`, siempre en UTC; la zona del negocio se aplica al mostrar | `timestamp` sin zona |
| Identificadores | `uuid` (v7 si se ordena por creación) o `bigint generated always as identity` | `serial` en tablas nuevas |
| Estados | `text` con `CHECK` o un `enum` del dominio | números mágicos |
| Texto libre | `text` | `varchar(n)` arbitrario |

## Transacciones

- El cambio de estado y su efecto (el movimiento de stock, el registro de auditoría, la fila de la bandeja
  de salida) van **en la misma transacción**.
- Nada de llamadas a servicios externos dentro de una transacción: se guarda la intención (bandeja de
  salida) y se envía después.
- Nivel por defecto `READ COMMITTED`. Si una operación necesita leer y decidir, `SELECT … FOR UPDATE`
  sobre las filas exactas, o `SERIALIZABLE` con reintento de la transacción completa.

## Datos congelados

Lo que se usará después para cobrar, liquidar o auditar (precio, comisión, dirección) **se copia en la
fila al crearla**. Al liquidar se lee de la fila, nunca de la configuración actual.

## Índices

- Uno por consulta nueva que filtre u ordene, con la consulta que lo justifica en el análisis.
- Se comprueba con `EXPLAIN (ANALYZE, BUFFERS)` sobre datos de volumen realista, no sobre una tabla vacía.
- Índices parciales para estados frecuentes (`WHERE estado = 'pendiente'`); compuestos en el orden del
  filtro más selectivo.
- En tablas grandes en producción: `CREATE INDEX CONCURRENTLY`, fuera de una transacción.

## Migraciones

- **Versionadas** con la herramienta del stack; nunca cambios a mano en la base.
- **Idempotentes** y **compatibles hacia atrás**: primero se añade (columna nula, tabla nueva), se
  despliega el código que usa las dos formas, se rellena, y después se quita lo viejo en otra migración.
- Una columna `NOT NULL` en una tabla con datos: añadir nula → rellenar por lotes → `SET NOT NULL`.
- No mueven marcas de tiempo que nadie tocó.
- Cada una dice cómo se revierte.
- Con producción: plan, respaldo, aprobación de la persona y prueba previa sobre una copia anonimizada.

## Paginación

Por cursor (`WHERE (creado, id) < ($1, $2) ORDER BY creado DESC, id DESC LIMIT n`), no por `OFFSET` en
tablas que crecen. El cursor se valida al leerlo, no al consultar.

## Lo que nunca

- Concatenar valores en SQL: siempre parámetros.
- Guardar dinero en coma flotante.
- Borrar en cascada datos de negocio sin pensarlo: se prefiere el borrado lógico con fecha.
- La cadena de conexión en el código: va a `DATABASE_URL` (`[SECRET]`) y se lee desde el módulo de
  configuración.

## Verificación

```bash
node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivos>
```

Las pruebas de concurrencia lanzan dos tomas simultáneas y esperan exactamente un ganador.

## Skills relacionadas

`{{SLUG}}-dinero` (si hay importes) · `{{SLUG}}-eventos` (bandeja de salida) · el pack del servidor (ORM).
