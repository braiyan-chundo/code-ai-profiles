# Metodología agéntica · versión 4

> Estado: versión 4 (borrador), 2026-10-24. Sale de la versión 3 y de
> lo que la v3 no resolvió en proyectos reales.

Una forma de construir software con un orquestador, agentes con autoridad separada y una persona que
decide. **Se ajusta al proyecto**: se elige un perfil (S, M o L) y se mueven diales encima. Ninguna
regla está escrita fija: cada una depende de `.metodo/config.json`.

> **Si eres Claude:** no leas los demás documentos de esta carpeta. Están escritos para personas, y lo
> que lees se vuelve a pagar en cada turno. Sigue **solo** [arranque.md](arranque.md), o
> [adopcion.md](adopcion.md) / [migracion-v3.md](migracion-v3.md) si el proyecto ya tiene código. Cuando
> un paso pida un detalle, saca solo esa sección: `node <metodologia>/plantillas/scripts/metodo.mjs leer
> <documento> "<sección>"`.

## Primer paso

**Abre [arranque.md](arranque.md) y síguelo en orden.** Claude pide el resumen del proyecto, estima la
talla, propone un perfil y te enseña los diales para que los confirmes o cambies.

Ya arrancado: si en la raíz hay `AGENTS.md` y `.metodo/config.json`, no se sigue el arranque. Se
trabaja con `/hu-new`, `/hu-work`, `/hu-close`, `/fix`, `/qa`, `/deploy` y `/metodo`.

Un proyecto en v3: [migracion-v3.md](migracion-v3.md). Un proyecto con código que no viene de la v3 (otra
metodología o ninguna): [adopcion.md](adopcion.md). Si dudas, `inventario.mjs` te dice cuál toca.

## Las ideas que sostienen la v4

1. **Perfil más diales.** El perfil es el punto de partida; cada dial se cambia por separado. Un L con
   el alcance apagado es válido. Subir o bajar de perfil solo añade o quita: nunca transforma lo que
   ya existe ([perfiles](perfiles.md)).
2. **La config manda, la prosa no.** Si el alcance está apagado, ningún agente pide un acta y ningún
   gate la comprueba ([configuracion](configuracion.md)).
3. **Decide una persona; los agentes ayudan.** QA existe, pero no bloquea ni devuelve trabajo solo.
4. **Se prueba una vez lo que hace falta.** Quien implementa corre lo relacionado; la suite completa
   corre una vez, con tiempo máximo, y un SHA en verde no se vuelve a probar ([verificacion](verificacion.md)).
5. **Dos reglas fijas, implacables en todo perfil:** nada de configuración escrita en el código
   ([configuracion-del-codigo](configuracion-del-codigo.md)) y ningún agente toca producción
   ([entornos](entornos.md)).
6. **Una carpeta por historia.** Historia, análisis, briefs, maqueta, verificación y QA juntos.
7. **El rol es genérico; la especialidad viene del stack.** Python y Vue cargan los packs de Python y
   Vue, no los de NestJS y React ([packs](packs.md)).

## A quién se refiere cada nombre

| Nombre | Quién es |
| --- | --- |
| **Quien aprueba** | El responsable del producto. Aprueba maquetas, prueba historias |
| **Quien decide el método** | El desarrollador: perfil, diales, stack, modelos, permisos |
| **Quien autoriza salidas** | Push, publicación, despliegue, envíos al cliente |
| **El cliente** | Quien contrató. No es técnico necesariamente; pide a través de quien aprueba |
| **El orquestador** | La sesión principal. Encamina, prepara la prueba, no decide por los roles |
| **Los roles** | Los agentes activos según la config, cada uno con el nombre y el color que elijas |

Pueden ser la misma persona.

## Índice

| Archivo | Qué cubre |
| --- | --- |
| [arranque.md](arranque.md) | El primer contacto: resumen, talla, perfil y diales, propuesta, alcance, stack, diseño, andamiaje |
| [configuracion.md](configuracion.md) | `.metodo/config.json`: cada dial, sus valores, dependencias y el validador |
| [perfiles.md](perfiles.md) | S, M y L; cambiar de perfil y de fase sin romper nada |
| [metodo.md](metodo.md) | Principios, caminos, fases, la carpeta de la historia, modos de trabajo, cierre |
| [orquestador.md](orquestador.md) | Deberes, despacho, exploradores en paralelo, cuándo se detiene |
| [roles.md](roles.md) | Los diez roles, nombres y colores, modelos, territorio, matriz de skills |
| [arquitectura.md](arquitectura.md) | Análisis en dos pasos, preguntas, briefs, grafo, datos, contratos según la fase |
| [diseno.md](diseno.md) | Fundación de diseño, Claude Design, showcase, componentes, guías, maquetas |
| [verificacion.md](verificacion.md) | Pruebas por alcance, registro por SHA, prueba humana, QA, revisión técnica |
| [entornos.md](entornos.md) | Fase desarrollo o producción, entornos, credenciales de prueba, la guarda |
| [configuracion-del-codigo.md](configuracion-del-codigo.md) | Variables de entorno, `.env.example`, módulo de configuración, el gate |
| [observabilidad.md](observabilidad.md) | ODD: señales por historia, niveles, OpenTelemetry |
| [metricas-y-actividad.md](metricas-y-actividad.md) | Ver qué hace cada agente; tokens y tiempo de cada historia, por fase |
| [packs.md](packs.md) | Especialidad por stack, skills por motor, cómo se forja un pack |
| [propuesta.md](propuesta.md) | La propuesta al cliente, con estándares |
| [arnes.md](arnes.md) | Permisos, hooks, comandos y scripts |
| [seguridad.md](seguridad.md) | Las reglas de todos, con su porqué |
| [migracion-v3.md](migracion-v3.md) | Pasar un proyecto de la v3 a la v4 |
| [adopcion.md](adopcion.md) | Adoptar la v4 en un proyecto con código que no viene de la v3; actualizar la versión de la v4 en un proyecto |
| [lecciones.md](lecciones.md) | Lo aprendido, convertido en regla |
| [decisiones-abiertas.md](decisiones-abiertas.md) | Lo que falta comprobar o decidir |
| [plantillas/](plantillas/README.md) | Config, agentes, comandos, hooks, scripts, documentos, diseño, skills y packs |

Qué cambia frente a la v3 y qué se quitó: [migracion-v3.md](migracion-v3.md#qué-cambia-frente-a-la-v3).

## Estado de esta versión

Borrador escrito el 2026-10-24 a partir de la conversación de diseño. **No se ha probado en frío.**
Antes de darla por buena faltan las comprobaciones de
[decisiones-abiertas](decisiones-abiertas.md#por-comprobar) y una prueba en frío como las de la v3.

## Historia de versiones

| Versión | Qué fue |
| --- | --- |
| 1 | Un documento: roles, skills, arnés y gates, con un agente de QA |
| 2 | Un documento: briefs, modelo por rol, maqueta aprobada, verificación humana |
| 3 | Una carpeta, agnóstica del stack, probada en frío tres veces |
| 4 | Perfiles y diales, roles configurables, packs de stack, diseño con Claude Design, entornos y configuración implacables, ODD |
