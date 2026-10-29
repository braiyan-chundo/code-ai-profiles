# Los perfiles

> Estado: versión 4 (borrador), 2026-10-24.

Un perfil es un **juego de valores de partida** para los diales. No es una jaula: después se mueve
cualquier dial por separado ([configuracion](configuracion.md)). Valores exactos en
[plantillas/config/perfiles.json](plantillas/config/perfiles.json).

## Los tres

| | **S · ligero** | **M · estándar** | **L · contrato** |
| --- | --- | --- | --- |
| Para | Landing, script, MVP de 1–2 semanas, una persona | Producto con varias pantallas, servidor y una o dos apps | Varios repos o apps, dinero o datos sensibles, contrato formal |
| Agentes | `fullstack`, `product-design` | `product-owner`, `architect`, `explorador`, `product-design`, `backend`, `frontend`, `qa`, `devops`, `seguridad` | Los de M más `data` |
| Propuesta | no | no | sí |
| Enfoque | producto | técnico | técnico |
| Modo | construir todo | fase a fase | fase a fase |
| Alcance | off | lista viva | sellado, con actas |
| Diseño | maqueta por historia | sistema de diseño completo | sistema de diseño completo |
| Arquitectura | — | dos pasos, 2 exploradores | dos pasos, 4 exploradores |
| Datos | skill del motor | skill del motor | skill + agente `data` |
| Revisión técnica | off | por riesgo | por riesgo, en dos tiempos |
| QA | off | bajo demanda | bajo demanda |
| Seguridad | off | bajo demanda | en historias riesgosas y antes de producción |
| Contratos | flexibles | estrictos en producción | estrictos en producción |
| Grafo | off | off | graphify |
| Observabilidad | off | básica | completa |
| Suite completa | al cerrar un lote, 5 min | al cerrar la historia, 10 min | al cerrar la historia, 15 min |
| Gate de historias | aviso | bloqueo | bloqueo |

En los tres: la [configuración fuera del código](configuracion-del-codigo.md) y la
[guarda de producción](entornos.md) son fijas.

## Cómo se estima la talla

En el arranque, `metodo.mjs talla <señales>` suma las señales del resumen ([perfiles.json](plantillas/config/perfiles.json) →
`talla`) y devuelve el perfil con su tabla de diales: un punto por repo o app más allá del primero y por integración externa; dos por dinero,
datos de menores, contrato formal o más de veinte requerimientos; uno por datos personales, tiempo
real, sin conexión, colas, un plazo de ocho semanas o más, o más de una persona desarrollando. Un simple
enlace (WhatsApp, redes) no es una integración. Una señal que aún no se conoce no suma: la talla se
revisa al terminar el paso 5 del arranque.

| Puntos | Propone |
| --- | --- |
| 0–3 | S |
| 4–8 | M |
| 9 o más | L |

Es una propuesta con su porqué («propongo M: dos apps, datos personales, ocho semanas»). Quien decide
el método la confirma o la cambia.

## Por qué son compatibles

Los tres usan **la misma estructura**: la misma carpeta por historia, el mismo frontmatter, el mismo
`.metodo/`. Un S simplemente tiene menos archivos dentro de cada carpeta. Por eso:

- **subir de perfil solo añade**: roles, documentos, gates;
- **bajar no borra nada**: lo que deja de usarse queda como histórico;
- ninguna historia se reescribe al cambiar de perfil.

## Cambiar de perfil

Ejemplo: empezó como un CRUD de clientes en S y ahora hay que sumar inventario y proveedores.

```bash
node .metodo/scripts/metodo.mjs perfil M --simular   # qué cambia y qué hay que rellenar hacia atrás
node .metodo/scripts/metodo.mjs perfil M             # lo aplica y regenera
```

O, desde Claude, `/metodo perfil M`. El comando:

1. Enseña la **diferencia de diales**, dial a dial, con el valor de antes y el de después. Los
   `ajustes` que ya tenías **se conservan**: si tenías `alcance: off`, sigue en `off` aunque M diga
   `lista-viva`, salvo que pidas quitarlo. Por eso el arranque guarda como ajuste todo dial que la
   persona eligió con sus palabras, aunque coincidiera con el perfil; el comando recuerda revisarlo y
   lista los roles nuevos con su nombre y color de plantilla, para cambiarlos si hace falta.
2. Lista lo que hay que **rellenar hacia atrás**, como tareas, no como cambios automáticos.
3. Con el sí de quien decide el método (lo pide `/metodo`; el script aplica sin preguntar, por eso
   primero `--simular`), actualiza `perfil`, corre `validar` y `generar`, que crea los documentos base
   que el perfil nuevo pide (`docs/diseno/guias.md`, `docs/operaciones/observabilidad.md`…): un M que
   viene de S queda igual que un M nuevo.
4. Deja un ADR «Cambio de perfil S → M», con el porqué y la lista de tareas.

### Lo que se rellena hacia atrás

| Al activar | Tarea |
| --- | --- |
| `architect` | Un documento de arquitectura base (`docs/arquitectura/stack.md`, módulos, datos) a partir del código existente, con exploradores |
| `backend` y `frontend` en lugar de `fullstack` | Se separa el agente; las historias abiertas se reasignan en su bitácora |
| `product-owner` | Primer borrador de las reglas de negocio (`docs/producto/reglas/`) desde las historias cerradas |
| `alcance: lista-viva` | Borrador del alcance desde las historias que ya existen, cada ítem con su historia; lo aprueba la persona |
| `alcance: sellado` | Lo anterior, más el sellado. Desde ahí, solo por acta |
| `diseno: sistema` | La fundación de diseño desde lo ya construido: tokens, componentes y guías reales, no inventados |
| `grafo: graphify` | Construir el grafo (`grafo.mjs build`) |
| `contratos: estrictos*` | Congelar los contratos actuales como versión base |
| `observabilidad` | Catálogo de señales de los flujos que ya existen (`docs/operaciones/observabilidad.md`) |
| `qa`, `devops` | Nada: son bajo demanda |

### La reevaluación al subir

Subir de perfil es el momento de **reevaluar lo que se decidió para el tamaño anterior**. El comando
lo pregunta, no lo supone:

- **Datos**: ¿sigue bastando la skill del motor, o el nuevo dominio (stock, concurrencia, reportes,
  migraciones sobre datos reales) pide el agente `data`?
- **Packs**: ¿el stack creció (colas, tiempo real, una segunda app)? ¿Faltan packs?
- **Modelos**: ¿algún rol debe subir de modelo por el nuevo riesgo?
- **Repos**: ¿un solo repo sigue siendo lo adecuado?

## Cambiar de fase

`desarrollo` → `produccion` cuando hay usuarios o datos reales. Es otro comando, con su propia
checklist: [entornos](entornos.md#el-paso-a-producción).

```bash
node .metodo/scripts/metodo.mjs fase produccion --simular
```

## Bajar de perfil

Pasa: un proyecto entra en mantenimiento y ya no necesita toda la ceremonia. `perfil S` desactiva roles
y gates; las historias, actas, ADR y maquetas se quedan. Si había alcance sellado, el comando pregunta
si se mantiene (`ajustes.alcance: sellado`) o pasa a histórico.
