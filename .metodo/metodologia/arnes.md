# El arnés

> Estado: versión 4 (borrador), 2026-10-24.

Lo ejecutable. Los prompts orientan; esto impide. Y todo lee la config.

## 1. Qué hay en el proyecto

| Ruta | Qué | Quién la escribe |
| --- | --- | --- |
| `.metodo/config.json` | La fuente de verdad | Claude en el arranque; después, los comandos `/metodo` |
| `.metodo/entornos.json` | Entornos sin secretos | Arranque y `devops` |
| `.metodo/reglas/<rol>.md` | Reglas propias del proyecto por rol | La persona o el orquestador, a mano |
| `.metodo/scripts/*.mjs` | Los scripts | `metodo.mjs iniciar` (copia) |
| `.metodo/metodologia/` | Copia de la metodología, con sus plantillas | `metodo.mjs iniciar` |
| `.metodo/pruebas/` | Registro de pruebas por SHA y logs (fuera de git) | `pruebas.mjs` |
| `.claude/agents/`, `.claude/commands/`, `.claude/hooks/`, `.claude/settings.json`, `.claude/skills/` | **Generados** | `metodo.mjs generar` |
| `AGENTS.md`, `CLAUDE.md` | **Generados** | `metodo.mjs generar` |
| `hu/`, `docs/` | El gobierno del proyecto | Los roles y el orquestador |
| `.env.example` | El catálogo de configuración | Los implementadores |

Lo generado lleva la cabecera «generado por metodo.mjs: no editar». Cambiar la config y regenerar es
el único camino.

## 2. `.claude/settings.json` (generado)

| Se niega | Por qué |
| --- | --- |
| `Edit(/hu/INDEX.md)` | Derivado |
| `Edit(/.metodo/metodologia/**)`, `Edit(/.claude/agents/**)`, `Edit(/.claude/commands/**)`, `Edit(/.claude/hooks/**)`, `Edit(/AGENTS.md)` | Generados o copia: se regeneran |
| `Edit(/docs/producto/alcance.md)`, `Edit(/docs/producto/fuera-de-alcance.md)`, `Edit(/docs/producto/alcance-sellado.json)` | Solo con `alcance: sellado`: cambian por acta |
| `Edit(/<lienzo>/**)` | Solo con `rasgos.lienzo`: lo firmó el cliente |
| `Read` de cada archivo de `produccion.archivos` | Los secretos de producción fuera del alcance |
| `Bash(git push:*)`, `Bash(gh release:*)`, `Bash(gh pr create:*)` | Lo que sale lo autoriza la persona |

Recordatorios de Claude Code: las reglas de ruta son de `Edit(...)` (cubre también `Write`); se anclan
con `/` en la raíz del proyecto; no distinguen roles.

## 3. Los hooks

### `guarda.mjs` · `PreToolUse` (fija)

Antes de cada herramienta:

| Herramienta | Qué comprueba | Con |
| --- | --- | --- |
| Todas (Bash, Edit, Write, Read, Grep, Glob, Agent, Skill, WebFetch…) | Deja una línea en `.metodo/actividad.log`: qué hace cada agente ([metricas-y-actividad](metricas-y-actividad.md)) | — |
| `Bash` | Hosts, marcas o archivos de producción en el comando | `entorno.mjs` |
| `Edit`, `Write`, `MultiEdit` | En el texto nuevo de un archivo de código: secretos, URLs fijas, lecturas sueltas del entorno | `config.mjs` |
| `Edit`, `Write`, `MultiEdit` dentro de un subagente | Que la ruta esté en el territorio de su rol (por `agent_type`), con `gates.territorio: bloqueo` | `lib.mjs → territorio` |

Sale con **2** si bloquea (la herramienta no corre y el agente lee el porqué). **Fail-open** ante un
error propio o una entrada que no es JSON: avisa por stderr y deja pasar (al probarla a mano, genera el
JSON con `node`, no con `echo`). Es rápido: solo mira el texto que llega en la llamada.

### `fin-de-turno.mjs` · `Stop`

Al terminar un turno, corre **solo los gates cuyo dominio cambió** (según `git status` de cada repo y
del gobierno) y **según su nivel** en la config:

| Gate | Corre si cambió | Nivel |
| --- | --- | --- |
| `config.mjs check` | código en algún repo | fijo: bloqueo |
| `entorno.mjs check` | código o configuración | fijo: bloqueo |
| `hu.mjs check` | `hu/` | `gates.historias` |
| `alcance.mjs check` | `docs/producto/` (solo con `alcance: sellado`) | `gates.alcance` |
| `contracts.mjs check` | la carpeta de contratos | `gates.contratos` |
| `grafo.mjs check` | código (solo con `grafo: graphify`) | `gates.grafo` |
| Cada gate de `config.gatesPropios` | según su `cuando` | su `nivel` |

Imprime una línea con los gates que corrió. `aviso` imprime y deja terminar; `bloqueo` sale con 2. Si el turno ya fue bloqueado una vez
(`stop_hook_active`), los gates de dial pasan a aviso para no entrar en bucle; **los fijos siguen
bloqueando**. **No corre pruebas nunca.**

### `pre-commit` de git

`metodo.mjs iniciar`, `generar` y `hooks` instalan `.git/hooks/pre-commit` en cada repo con git (la
raíz y cada repo de código, en cuanto tiene su `git init`): `config.mjs check --staged`
y `entorno.mjs check --staged`. Frena también los commits a mano.

## 4. Los comandos (generados)

| Comando | Qué hace |
| --- | --- |
| `/hu-new <petición>` | Clasifica, comprueba el alcance según el dial, crea la carpeta, despacha requisitos |
| `/hu-work <HU>` | La fase siguiente: exploradores, arquitectura, diseño, implementación, verificación |
| `/hu-close <HU>` | Gates, QA resuelto, reglas de negocio, cierre, commits |
| `/fix <defecto>` | Vía directa |
| `/qa <HU>` | QA no bloqueante, con capturas (si `qa: bajo-demanda`) |
| `/deploy` | `devops`: pregunta, recomienda, documenta (si `devops` está activo) |
| `/seguridad <HU \| repo \| entrega>` | Auditoría no bloqueante con veredicto (si `seguridad` no es `off`) |
| `/diseno-fundacion` | La fundación de diseño (si `diseno: sistema`) |
| `/metodo <sub>` | `estado`, `efectivo`, `validar`, `perfil <S\|M\|L>`, `fase <desarrollo\|produccion>`, `generar` |

Solo se generan los comandos cuyo rol o dial está activo.

## 5. Los scripts

Node estándar, sin dependencias. Código 0 en verde, 1 con problemas. Fail-open si les falta lo que
miden (el repo aún no existe): informan y salen con 0.

| Script | Subcomandos |
| --- | --- |
| `metodo.mjs` | `iniciar`, `validar` (también avisa si crece lo que se carga solo: `AGENTS.md`, descripciones, agentes, skills), `efectivo`, `generar`, `perfil`, `fase`, `estado`, `actividad`, `hooks`; para el arranque, `talla`, `diales` y `leer <documento> "<sección>"` |
| `hu.mjs` | `new "<título>"`, `fase <HU> <fase>`, `estado <HU> <estado> "<por qué>"`, `log <HU> "<texto>"`, `index`, `check` |
| `pruebas.mjs` | `relacionadas <repo> <archivos…>`, `suite <repo>`, `estado` |
| `config.mjs` | `check [--staged \| --todo \| archivos…]`, `catalogo`, `probar` |
| `entorno.mjs` | `check [--staged]`, `comando "<cmd>"`, `probar` |
| `alcance.mjs` | `sellar`, `aplicar <acta>`, `check` (solo con `alcance: sellado`) |
| `contracts.mjs` | `check` (con paquete de contratos) |
| `grafo.mjs` | `build`, `check [--al-dia]`, `impacto <símbolo>` (con `grafo: graphify`) |
| `migrar-v3.mjs` | `--simular`, `--aplicar` ([migracion-v3](migracion-v3.md)) |
| `metricas.mjs` | `hu <HU>`, `resumen` ([metricas-y-actividad](metricas-y-actividad.md)) |
| `inventario.mjs` | `--destino <dir> [--escribir]`: inventario de un proyecto existente, solo lectura ([adopcion](adopcion.md)) |
| `limite.mjs` | `<segundos> <comando…>`: tiempo máximo portable (macOS no trae `timeout`) |

## 6. Los puertos

Cada app tiene su puerto de desarrollo y su puerto compilado en `config.json → repos`, con
`strictPort`. Un agente que levanta un servidor propio usa un puerto libre que no sea de la persona, lo
lanza con tiempo máximo (`node .metodo/scripts/limite.mjs <segundos> <comando>`; macOS no trae `timeout`) y lo apaga al terminar.
