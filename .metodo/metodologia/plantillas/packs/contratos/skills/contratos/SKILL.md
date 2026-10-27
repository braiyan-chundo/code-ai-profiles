---
name: {{SLUG}}-contratos
description: Cómo se añade o cambia algo que cruza una frontera en {{PROYECTO}} - endpoint, evento de tiempo real, cola, estado o código de error. Las capas en orden, el dinero como string decimal, la unión de eventos, y cómo se versiona y publica el paquete de contratos. Cárgala al tocar <ruta del paquete de contratos> o al consumir algo nuevo desde una app.
---

# Contratos entre capas

<!-- Tipo: contratos. architect siempre; backend si cambia el paquete; frontend si consume algo nuevo. -->

## La regla de oro

El paquete de contratos es la **única** fuente de la forma de los datos. Si algo cruza una frontera y
no está declarado ahí, no existe.

## Las capas, en este orden

`pantalla → hook tipado → cliente HTTP → controlador → servicio → esquema → base de datos`. Qué
archivo es cada capa en este proyecto y en qué orden se tocan al añadir algo.

## Qué contiene el paquete

Carpetas y qué vive en cada una: esquemas HTTP (petición y respuesta), rutas, eventos (unión
discriminada por `type`), nombres de cola, estados y su tabla de transiciones, catálogo de errores,
formateadores (dinero, fechas), versión.

## Las reglas congeladas

{{#SI_DINERO}}
- Dinero como string decimal validado; nunca `number`.
{{/SI_DINERO}}
{{#SI_TIEMPO_REAL}}
- Eventos solo dentro de la unión; añadir uno es una versión minor.
{{/SI_TIEMPO_REAL}}
- Estados y transiciones solo en la tabla; la interfaz la lee, no la reescribe.
<Reglas propias del proyecto, o nada.>

## Añadir un endpoint · Añadir un evento · Añadir un estado

Pasos numerados para cada caso, con los archivos exactos.

## Compatibilidad hacia atrás

Minor si solo añade; major si cambia o quita. Qué recibe una app desplegada con la versión anterior.
Si la API quita un campo: primero se despliega la app que lo leía.

{{#SI_PAQUETE_CONTRATOS}}
## Publicación

Cómo se versiona (`version` del paquete y la constante de versión), cómo se compila si se publica
compilado, la etiqueta (`contracts-vX.Y.Z`) **solo en local** hasta que la persona autorice el push,
y cómo la instala cada app. **Una etiqueta publicada no se mueve nunca.**
{{/SI_PAQUETE_CONTRATOS}}

## Verificación

{{#SI_PAQUETE_CONTRATOS}}
```bash
node scripts/contracts.mjs check
```
{{/SI_PAQUETE_CONTRATOS}}
{{^SI_PAQUETE_CONTRATOS}}
Los tipos y las pruebas de la API: el compilador cruza todo el repositorio.
{{/SI_PAQUETE_CONTRATOS}}
