---
name: {{SLUG}}-backend-nestjs
description: Cómo se construye el servidor de {{PROYECTO}} con NestJS - módulos, controladores finos, servicios de dominio, DTOs de entrada y de salida validados, Swagger, errores, eventos internos, webhooks entrantes y salientes, gateways de Socket.IO, configuración y pruebas. Cárgala antes de añadir o cambiar un endpoint, un servicio, un evento o un webhook.
---

# NestJS · {{PROYECTO}}

<!-- Pack backend-nestjs, forjado desde la documentación oficial el 2026-10-24. Sin revisar en proyecto.
     La versión exacta la fija el ADR del stack. -->

## La regla de oro

**El controlador traduce; el servicio decide.** El controlador recibe un DTO de entrada ya validado,
llama a un servicio y devuelve un DTO de salida. La regla de negocio, la máquina de estados y los
permisos finos viven en el servicio de dominio. Un `if` de negocio en un controlador es un defecto.

## La estructura

```text
src/
  main.ts                 ValidationPipe global, Swagger, CORS desde config, prefijo /api, rawBody para webhooks
  config/                 configuracion.ts: el ÚNICO sitio que lee process.env (validado)
  comun/                  filtros de excepción, interceptores, guards, decoradores, catálogo de errores
  <dominio>/
    <dominio>.module.ts
    <dominio>.controller.ts
    <dominio>.service.ts
    dto/                  crear-<x>.dto.ts, actualizar-<x>.dto.ts, <x>-respuesta.dto.ts, filtros-<x>.dto.ts
    schemas/              esquemas de Mongoose
    eventos/              clases de evento y listeners
    <dominio>.gateway.ts  si emite por socket
```

## DTOs de entrada y de salida

- **Entrada**: clases con `class-validator` y `@ApiProperty`. `ValidationPipe` global con
  `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`: lo que no está en el DTO se rechaza.
- **Salida**: un DTO de respuesta por recurso, **siempre**. Nunca se devuelve el documento de Mongoose:
  ```ts
  return plainToInstance(ClienteRespuestaDto, doc, { excludeExtraneousValues: true }); // con @Expose() en cada campo
  ```
  Así lo que un rol no debe ver (hash de contraseña, notas internas, campos de otro rol) no sale nunca
  por descuido. La prueba de fuga mira el JSON crudo.
- Los DTOs de salida son **el contrato** que consume la app: cambiarlos sigue la regla de contratos del
  proyecto (flexibles en 0.x, compatibles en producción).
- `PartialType`, `PickType`, `OmitType` de `@nestjs/swagger` para derivar sin duplicar.

## Swagger

Configurado en `main.ts`. Cada endpoint con `@ApiTags`, `@ApiOperation`, `@ApiOkResponse({ type: XRespuestaDto })`
y las respuestas de error del catálogo. La documentación se sirve solo fuera de producción, o protegida
(decisión del ADR). El esquema OpenAPI puede generar los tipos de la app.

## Errores

Un catálogo cerrado de errores de dominio (`codigo`, mensaje, estado HTTP). Un filtro global los traduce
a una forma única `{ codigo, mensaje, detalles? }`. Nunca un 500 por una entrada inválida: se valida al
leer (DTO o pipe), no al consultar.

## El módulo de configuración

`@nestjs/config` con validación (zod o joi) en `config/configuracion.ts`; si falta una variable, el
servidor no arranca y dice cuál. El resto inyecta `ConfigService` tipado o el objeto de configuración.
`MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, secretos de webhooks: `[SECRET]` en `.env.example`.
Nunca `process.env` fuera de `config/`.

## Eventos internos

`@nestjs/event-emitter` para desacoplar módulos **dentro del proceso**: el servicio emite
`pedido.confirmado` y otro módulo escucha (`@OnEvent`). Reglas:

- Un evento interno **no sobrevive a un reinicio**. Si su efecto no puede perderse (un correo, un cobro,
  un webhook saliente), se encola (`{{SLUG}}-colas-bullmq`) o se escribe en una bandeja de salida.
- Nombre `<dominio>.<hecho_en_pasado>`, con una clase de evento tipada.
- Un listener que falla no rompe al emisor: captura, registra y, si importa, encola el reintento.

## Webhooks

**Entrantes** (un proveedor nos avisa):
1. Ruta propia, con `rawBody: true` en `main.ts` para verificar la **firma** sobre el cuerpo crudo con el
   secreto (`[SECRET]`). Sin firma válida: 401 y se registra.
2. **Idempotencia**: el id del evento del proveedor se guarda (índice único); si ya se procesó, 200 sin
   repetir el efecto.
3. Responder **2xx rápido** y procesar en una cola: el proveedor reintenta si tardamos.

**Salientes** (avisamos a otro sistema):
- Se encolan (BullMQ) con reintento exponencial; cuerpo firmado (HMAC con su secreto) y cabecera con id
  de entrega para que el receptor deduplique.
- Lo que agota reintentos queda en fallidos, visible, y lo decide una persona.

## Tiempo real: gateways de Socket.IO

- `@WebSocketGateway` con CORS desde config. El token se valida **en la conexión** (en `handleConnection`
  o en un middleware del servidor de sockets); sin token válido se desconecta.
- Salas por rol o por recurso; lo que un rol no debe ver no entra en su sala.
- Se emiten **solo eventos declarados** en el contrato, con DTOs de salida, igual que por REST.
- Con varias instancias, adaptador de Redis.

## Lo que nunca

- Devolver un documento de Mongoose o una entidad sin DTO de salida.
- Lógica de negocio en controladores, gateways o listeners que no delegan.
- `process.env`, una URL o un secreto fuera de `config/`.
- Reintentar a mano, en un bucle, algo que pudo cobrarse o enviarse.
- Un `any` en un DTO.

## Lo que no se toma prestado

- Express suelto (`app.get(...)`) o middlewares para lo que es un guard, un pipe o un interceptor.
- TypeORM y sus entidades: aquí la persistencia es Mongoose (`{{SLUG}}-persistencia-mongodb`).
- GraphQL: aquí es REST con Swagger.

## Pruebas

Jest (el de Nest). Unitarias de servicio con dependencias simuladas; de API con `@nestjs/testing` +
`supertest` contra una base de prueba (Mongo en memoria o contenedor), comprobando el JSON crudo, los
códigos y los rechazos del `ValidationPipe`.

```bash
node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivos>
```

## Skills relacionadas

`{{SLUG}}-persistencia-mongodb` · `{{SLUG}}-colas-bullmq` (si hay colas) · `{{SLUG}}-tiempo-real` ·
`{{SLUG}}-configuracion` · `{{SLUG}}-contratos` · `{{SLUG}}-dinero` (si hay importes).
