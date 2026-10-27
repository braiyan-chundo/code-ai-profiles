# Adoptar la v4 en un proyecto que ya existe

> Estado: versión 4 (borrador), 2026-10-25.

Para un proyecto con código que **no** viene de la v3: con otra metodología (Scrum con backlog en Jira,
un `docs/` propio, otra configuración de agentes) o con ninguna. Es la tercera entrada de la v4:

| El proyecto | Camino |
| --- | --- |
| No tiene código | [arranque.md](arranque.md) |
| Está en la v3 (`hu/HU-####.md`, `marcadores.json`) | [migracion-v3.md](migracion-v3.md) |
| Tiene código, con otra metodología o ninguna | **este documento** |
| Ya está en la v4 y hay una versión nueva | [Actualizar la versión](#actualizar-la-versión-de-la-v4-en-un-proyecto) |

El inventario lo dice solo si te equivocas de camino. **Este documento basta**: los demás no se leen
enteros; un detalle se saca con `node <metodologia>/plantillas/scripts/metodo.mjs leer <documento> "<sección>"`.

## Lo que no se hace al adoptar

- **No se reescribe la historia**: lo ya construido no se convierte en historias retroactivas; se describe.
- **No se importa todo el backlog**: solo lo comprometido o en curso. El resto se queda en su herramienta.
- **No se toca el código**, salvo las fichas `[SECRET]`/`[PUBLICO]` de los `.env.example` (sin ellas, el
  pre-commit frena cualquier commit).
- **No se borra nada**: lo que no encaja va a `docs/archivo/previo/`.

## Antes de empezar

Árbol limpio en todos los repos, en una rama (`adopcion-v4`). Si hay trabajo a medias, se anota cuál y
en qué estado: entrará como historia en su fase real.

## Paso 1 · El inventario

```bash
node <metodologia>/plantillas/scripts/inventario.mjs --destino . --escribir
```

Solo lee. Deja `adopcion-inventario.md` con:
- **los repos** y su tipo propuesto (`api`, `worker`, `app`, `paquete`, `fullstack`, `otro`), con puertos,
  scripts y el estado de su `.env.example`;
- **el stack**: gestor, base de datos, pruebas, packs que encajan y packs por forjar;
- **los rasgos** que se ven en las dependencias (pasarela de pago, sockets, colas, PWA);
- **lo que ya existe**: documentos, decisiones, backlog en el repo, diseño (shadcn, Storybook, guías),
  configuración de otras herramientas de IA (`CLAUDE.md`, `.cursor/rules`, `copilot-instructions.md`…),
  scripts propios, CI y observabilidad;
- **los riesgos del primer commit** (`.env` seguidos por git, catálogos sin fichas);
- **una propuesta** de `repos`, `stack` y `rasgos` para la config;
- **las preguntas** que el código no responde.

El agente lee además lo que el script solo lista: los documentos de producto y arquitectura, las
decisiones, la configuración de IA. Las notas van a `arranque-notas.md` desde el primer mensaje, como en
el arranque.

## Paso 2 · Las preguntas que faltan

Las del paso 1 del arranque (`metodo.mjs leer arranque "Paso 1"`), **solo las que el inventario no
responde**, más estas:

1. ¿Dónde vive el backlog pendiente (Jira, Trello, Notion, GitHub Issues, un documento)? ¿Qué parte está
   comprometida con el cliente?
2. ¿Hay trabajo a medias ahora mismo? ¿En qué estado está cada cosa?
3. ¿Hay contrato y un alcance cerrado, o se trabaja sin alcance?
4. ¿Hay producción? ¿Con qué hosts?
5. ¿El diseño actual está aprobado y se mantiene, o se rehace?
6. Lo que propone el inventario (tipos de repo, rasgos), ¿es así?

Resumen de diez líneas y «¿lo he entendido bien?», como en el arranque.

## Paso 3 · Talla, perfil y diales

Como el paso 2 del arranque (`metodo.mjs leer arranque "Paso 2"`), con las señales del inventario
(repos, integraciones, rasgos) y de las respuestas: `metodo.mjs talla <señales>` da el perfil y la tabla
de diales. Todo dial que la persona elija con sus palabras va a
`ajustes`. Nombres y colores de los agentes: si el proyecto ya tenía agentes con nombre, se ofrece
conservarlos.

## Paso 4 · El mapeo: qué pasa con cada cosa

| Lo que existe | En la v4 | Quién |
| --- | --- | --- |
| Código y repos | `config.repos` con su tipo; en un monorepo, una entrada por app o paquete y `territorios` si comparten raíz | el agente propone, la persona confirma |
| Stack | `stack.packs`; lo que no tiene pack queda «por forjar» para la historia de adopción | idem |
| Comandos de pruebas | `stack.comandos` por repo (`relacionadas` con `{archivos}`, `suite`), o los del pack | idem |
| **Trabajo en curso** | Una historia por cosa, abierta con `hu.mjs new` y llevada a su fase real con `hu.mjs fase <HU> <fase> --forzar "adopción: venía de <herramienta>"`; la bitácora cita de dónde viene | el orquestador |
| **Backlog comprometido** | Con contrato: alcance (`lista-viva` o `sellado`), un ítem por compromiso. Sin contrato: historias `en-espera`, solo las de la próxima entrega | la persona elige |
| Backlog no comprometido | Se queda en su herramienta; `docs/producto/backlog.md` dice dónde está | — |
| Lo ya construido | No se hacen historias retroactivas. Se describe en `docs/arquitectura/` (stack, módulos, datos) y en las primeras reglas de negocio `RN-n` | historia «Adopción v4» |
| Decisiones (ADR, RFC, notas) | `docs/decisiones/`: se mueven si ya son ADR; si no, un ADR «heredado» por decisión de base, con el enlace al original | el agente |
| Documentos de producto y arquitectura | A `docs/producto/` y `docs/arquitectura/` si encajan sin reescribir; si no, a `docs/archivo/previo/` y enlazados desde el índice | el agente |
| **Sistema de diseño en uso** | `docs/diseno/guias.md` con «Estado: **aprobada** (heredada)» y enlace a lo existente; una skill por componente y su índice, en la historia de adopción | el agente |
| Configuración de otras herramientas de IA | Lo que dice de cada rol, a `.metodo/reglas/<rol>.md`; lo general, a `.metodo/reglas/orquestador.md` (entra en el `AGENTS.md` generado); el original, al archivo | el agente |
| Skills de Claude propias | Se quedan; las que coinciden con un pack se renombran al nombre del pack para que el generador las respete | el agente |
| Scripts y gates propios, CI | Los scripts se quedan; los que son gates, a `config.gatesPropios`; el CI no se toca | el agente |
| `.claude/launch.json` | Se mezcla: se conservan sus configuraciones | automático |
| `.env.example` | Fichas `[SECRET]`/`[PUBLICO]` en cada variable; los `[SECRET]`, vacíos | el agente, con la persona |
| Producción | `.metodo/entornos.json` con sus hosts; la guarda bloquea desde ese momento. Si el código nombra el host de producción, la guarda lo bloqueará: se anota | la persona |

## Paso 5 · El andamiaje

1. `git init` en la raíz si no lo hay (la raíz es el gobierno; los repos de código, a su `.gitignore`).
2. El agente escribe `.metodo/config.json` desde la plantilla y la propuesta del inventario.
3. Simulación y después de verdad:

   ```bash
   node <metodologia>/plantillas/scripts/metodo.mjs iniciar --destino . --simular
   ```

   ```bash
   node <metodologia>/plantillas/scripts/metodo.mjs iniciar --destino .
   ```

   `iniciar` no sobrescribe ningún documento que exista y traslada `adopcion-inventario.md` y las notas a
   `docs/producto/`.
4. Lo del mapeo que es mover o escribir (reglas, ADR heredados, guías, historias en curso).
5. Las comprobaciones: `metodo.mjs validar`, `hu.mjs check`, `config.mjs probar`, `entorno.mjs probar`.
6. `node .metodo/scripts/config.mjs check --todo`: lo que encuentre (URLs fijas, lecturas sueltas del
   entorno) **no se arregla ahora**: va a la historia de adopción.

## Paso 6 · La historia «Adopción v4» y el ADR

Una historia con lo que la adopción deja pendiente, como casillas:

- [ ] Configuración fuera del código: los hallazgos de `config.mjs check --todo`
- [ ] Packs por forjar
- [ ] Una skill por componente y su índice de uso, desde el sistema de diseño existente
- [ ] Primer borrador de reglas de negocio `RN-n` y de `docs/arquitectura/` desde lo construido
- [ ] Seed de cuentas de prueba por rol (si no lo hay)
- [ ] Señales de observabilidad de los flujos críticos (si el dial lo pide)

Y un ADR «Adopción de la metodología v4» con lo decidido (perfil, ajustes, mapeo) y lo que la v4 hizo mal
o no previó: eso vuelve a [decisiones-abiertas](decisiones-abiertas.md) de la metodología.

Commit del gobierno, sin push, y **sesión nueva** para que se carguen agentes, comandos y hooks.

## Actualizar la versión de la v4 en un proyecto

Cuando la metodología mejora y el proyecto ya está en la v4. Desde la raíz del proyecto, árbol limpio:

```bash
rsync -a --delete <metodologia4>/ .metodo/metodologia/
```

```bash
cp .metodo/metodologia/plantillas/scripts/*.mjs .metodo/scripts/
```

Si la versión nueva añade un rol al perfil del proyecto, `validar` lo dice: se añade su entrada en
`config.agentes` (o se quita con `ajustes.agentes`). Después:

```bash
node .metodo/scripts/metodo.mjs generar
```

```bash
node .metodo/scripts/metodo.mjs validar && node .metodo/scripts/hu.mjs check && node .metodo/scripts/config.mjs probar && node .metodo/scripts/entorno.mjs probar
```

`generar` no toca `hu/`, `docs/`, `.metodo/reglas/`, las skills que ya existen ni el `launch.json` del
proyecto (lo mezcla). Sesión nueva al terminar. Lo que cambió en cada versión está en
[decisiones-abiertas](decisiones-abiertas.md).
