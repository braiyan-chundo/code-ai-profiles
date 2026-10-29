# Migrar un proyecto de la v3

> Estado: versión 4 (borrador), 2026-10-24.

Un proyecto que ya corre en la v3 pasa a la v4 **sin perder historia**: la v4 desciende de la v3 y
los conceptos son los mismos (historia, brief, maqueta, acta, ADR). Lo que cambia es dónde vive cada
cosa y quién manda (la config en lugar de los marcadores).

## Antes de empezar

- **Entre historias**: ninguna en `en-proceso`. Si hay alguna, se termina o se deja `en-espera`.
- **En una rama** del repositorio de gobierno (`git switch -c metodo-v4`).
- Árbol limpio en todos los repos.

## El procedimiento

```bash
node <metodologia4>/plantillas/scripts/migrar-v3.mjs --destino . --simular   # el plan y la config propuesta
node <metodologia4>/plantillas/scripts/migrar-v3.mjs --destino . --aplicar   # mueve y escribe la propuesta
# revisar .metodo/config.json y .metodo/reglas/ (paso 3)
node <metodologia4>/plantillas/scripts/metodo.mjs iniciar --destino .        # copia, genera, instala hooks
```

`--aplicar` hace los pasos 4 a 9 y deja la config como **propuesta**; `iniciar` hace el 10 después de
que la revises. Probado sobre el proyecto de ejemplo de la v3 (`metodologia3/ejemplos/`): la historia
HU-1004 migra con su brief y su acta, el alcance sellado y el acta siguen válidos.

| Paso | Qué hace | Automático |
| --- | --- | --- |
| 1 · Leer la v3 | `marcadores.json`, `hu/config.json`, `docs/operations/flujo-agentico.md` | sí |
| 2 · Proponer la config | Deduce `rasgos`, `repos`, `stack`, `alcance` y los diales (alcance sellado → `sellado`; los gates activos; el modo) y propone el perfil más cercano (casi siempre M o L) | sí, como propuesta |
| 3 · Confirmar | Quien decide el método revisa la config propuesta: perfil, ajustes, nombres y colores de los agentes | **no** |
| 4 · Reestructurar `hu/` | Con `git mv`, para conservar la historia: `hu/HU-0012.md` → `hu/HU-0012-<slug>/hu.md`; `hu/briefs/HU-0012-<rol>.md` → `briefs/<rol>.md`; `hu/design/HU-0012.{html,md}` → `diseno/maqueta.html`, `diseno/vista.md`; `hu/qa/HU-0012.md` → `verificacion.md` | sí |
| 5 · Traducir el frontmatter | `title`→`titulo`, `status`→`estado`, `phase`→`fase` (`requirements`→`requisitos`, `architecture`→`arquitectura`, `design`→`diseno`, `implementation`→`implementacion`, `verification`→`verificacion`, `documentation` y `closure`→`cierre`), `contrato`→`alcance`, `depends_on`→`depende`; añade `migrada: v3` (una historia terminada en la v3 no debe los archivos de la v4) y crea `seguimiento.md` con una línea «migrada desde v3» | sí |
| 6 · Mover `docs/` | `docs/product/` → `docs/producto/`, `docs/architecture/` → `docs/arquitectura/`, `docs/operations/` → `docs/operaciones/`, `docs/decisions/` → `docs/decisiones/` | sí |
| 7 · Lo de la v3 | Los scripts **de la v3** (`hu.mjs`, `alcance.mjs`, `grafo.mjs`, `arranque.mjs`; `contracts.mjs` solo si era el gate de paquete), `metodologia/`, `marcadores.json`, `hu/index.md`, `hu/TEMPLATE.md`, `hu/config.json`, `docs/templates/` y los agentes v3 → `docs/archivo/metodo-v3/` (no se borra nada). **Los scripts propios del proyecto se quedan en `scripts/`**, y los que el hook de la v3 corría pasan a `config.gatesPropios` | sí |
| 7b · Lo que no sigue el patrón | Lo que queda en `hu/design/` (lienzos, maquetas de vía directa) → `docs/diseno/heredado/`; en `hu/qa/` y `hu/briefs/` → `docs/archivo/metodo-v3/` | sí |
| 7c · Los enlaces y las rutas | Los enlaces **y las rutas escritas como texto** (`node scripts/hu.mjs check`, `metodologia/arnes.md`) de los `.md` de `hu/`, `docs/`, `.claude/` y de las reglas propias se reescriben según lo movido; lo archivado de la v3 apunta a su equivalente en la v4. `docs/archivo/` no se toca | sí |
| 8 · Reglas propias | Los bloques de reglas del proyecto de cada agente v3 (las secciones «Reglas del proyecto») se copian a `.metodo/reglas/<rol>.md` | sí, para revisar |
| 9 · Skills | Las skills del proyecto se quedan; las que llevan nombre de rol (`<slug>-backend`, `-frontend`, `-persistencia`) se renombran al pack que corresponde (`<slug>-backend-nestjs`…) para que el generador las respete. Una skill que ya existe nunca recibe archivos del pack | sí |
| 9b · Diseño | Si la v3 tenía sistema de diseño aprobado, `docs/diseno/guias.md` nace **aprobada (heredada)**: no bloquea las maquetas | sí |
| 9c · Stack | Detecta los packs del stack (NestJS, React/Vite, el motor normalizado: «mongodb 8.0 en replica set» → `mongodb`) y los puertos de cada app | sí, para revisar |
| 10 · Iniciar | `metodo.mjs iniciar`: copia la metodología y los scripts a `.metodo/`, genera agentes, comandos, hooks, settings y `AGENTS.md`, instala el `pre-commit` | sí, tras revisar |
| 11 · Lo nuevo de la v4 | Tareas, no cambios: catálogo `.env.example` (el gate `config.mjs check --todo` dirá qué valores fijos hay en el código), `entornos.json`, seed de cuentas, primer borrador de reglas de negocio, señales si hay observabilidad | **no**: historia «Adopción v4» |
| 12 · Comprobar | `metodo.mjs validar`, `hu.mjs check`, `alcance.mjs check` si sellado | sí |
| 13 · Commit | «Migración a metodología v4». Sin push | sí, tras revisar |

## Lo que conviene saber

- **El primer `config.mjs check --todo` va a encontrar cosas**: URLs y tokens que hoy están en el
  código. No se arreglan en la migración: se abren como historia «Adopción v4 · configuración fuera
  del código», y mientras tanto el gate de fin de turno solo mira lo que cambia.
- **El alcance sellado se conserva** si así estaba. Si se quiere apagar, `ajustes.alcance: off` y el
  alcance queda como histórico.
- **Los agentes generados reemplazan a los de la v3.** Lo propio del proyecto que tenían va a
  `.metodo/reglas/`; lo propio del `AGENTS.md` viejo, a `.metodo/reglas/orquestador.md`, que el
  generador incluye en el `AGENTS.md` nuevo. Revísalo antes del commit.
- **Los `.env.example` de los repos necesitan sus fichas** `[SECRET]`/`[PUBLICO]` antes del primer commit:
  el pre-commit nuevo los revisa. Es lo único que la migración obliga a tocar en los repos de código.
- Un proyecto migrado es la **mejor prueba en frío** de la v4: lo que falle se anota en
  [decisiones-abiertas](decisiones-abiertas.md).

## Qué cambia frente a la v3

| Tema | v3 | v4 |
| --- | --- | --- |
| Talla | Una sola, completa | Perfiles S, M, L con diales; migrables |
| Reglas | Fijas en prosa (alcance, actas, gates) | Dependen de la config; un dial apagado no se pide |
| Configuración del proyecto | ~80 marcadores `{{…}}` | `.metodo/config.json`; `metodo.mjs generar` regenera agentes y comandos |
| Agentes | Cinco, nombres fijos | Diez roles, activables, con nombre, color y modelo configurables |
| Especialidad | Skills atadas a un stack | Rol genérico + packs por tecnología |
| Datos | Dentro de la persistencia | Skill por motor siempre; agente `data` opcional |
| Arquitecto | Explora solo; briefs de una vez | Exploradores en paralelo; análisis con preguntas antes de los briefs |
| Diseño | Maqueta por historia | Fundación de diseño (marca, showcase, componentes, guías) y maquetas con estructura fija, en Claude Design |
| Historias | Archivos repartidos en `hu/`, `hu/briefs/`, `hu/design/`, `hu/qa/` | Una carpeta por historia con todo dentro y su bitácora |
| Lógica de negocio | Solo al inicio | Reglas vivas (`RN-n`) que el PO actualiza al cerrar cada historia |
| QA | Eliminado | Opcional, no bloqueante, con capturas y veredicto ✅/❌; la persona decide |
| Seguridad | — | Agente opcional, no bloqueante: bajo demanda, en historias riesgosas y antes de producción |
| Métricas | — | Tokens y tiempo por historia y por fase, guardados al cerrar |
| Despliegue | Dentro del cierre | Agente `devops` solo bajo demanda; recomienda, la persona decide |
| Pruebas | Varias pasadas de la suite, sin tiempo máximo | Relacionadas al implementar, suite una vez, timeout, registro por SHA |
| Contratos | Siempre estrictos | Flexibles en desarrollo, estrictos en producción, o lo que diga el dial |
| Entornos | Implícitos | Fase desarrollo o producción; credenciales de prueba sin fricción; guarda contra producción |
| Configuración en el código | Sin regla | Regla fija: `.env.example` con `[SECRET]`/`[PUBLICO]`, gate en tres momentos |
| Observabilidad | — | ODD por dial, señales en cada historia |
| Propuesta al cliente | — | Opcional, con estándares |
| Enfoque | Técnico | Técnico o producto primero (Steve Jobs) |

## Qué se quitó de la v3

- «Verifica una persona, no un agente» → «decide una persona; un agente puede ayudar».
- El acta como camino obligatorio para todo cambio → solo con `alcance: sellado`.
- El repositorio de gobierno separado como obligación → opcional; en un solo repo, `hu/` y `docs/`
  viven en él.
- Siete fases fijas → las que activan los roles presentes. La fase `documentation` desaparece: se
  documenta en la revisión o en el cierre.
- Revisión técnica en dos tiempos por defecto → por riesgo, en una pasada; dos tiempos es un dial.
- `arranque.mjs` con marcadores repartidos → `metodo.mjs` desde la config.
- Lecciones atadas a un stack (Redis, vitest) → a su pack.
