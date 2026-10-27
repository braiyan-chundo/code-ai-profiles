# Decisiones abiertas

> Estado: versión 4 (borrador), 2026-10-24.

Lo que falta comprobar antes de dar la v4 por buena, y lo que queda por decidir.

## Por comprobar

Supuestos sobre Claude Code y Claude Design. El 2026-10-24 se contrastaron con la documentación
oficial (`code.claude.com/docs/en/sub-agents` y `/hooks`) y el supuesto 2, con un subagente
real en la app de escritorio:

| # | Supuesto | Resultado | Qué cambió en la v4 |
| --- | --- | --- | --- |
| 1 | Un subagente no puede lanzar otros | ✅ **Falso: sí puede**, hasta tres niveles bajo la sesión principal (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`) | El **arquitecto lanza** los exploradores; solo él tiene `Agent`. Si una instalación lo limita, se los devuelve al orquestador |
| 2 | Las herramientas de Claude Design solo están en la sesión principal | ✅ **Falso, comprobado con un subagente real**: tiene `Artifact` (diseños y sistemas de diseño) y el navegador; **no** tiene `DesignSync` | `product-design` y `qa` heredan las herramientas de la sesión (`disallowedTools` en vez de `tools`). `/design-sync` se lanza desde la sesión principal |
| 3 | El frontmatter admite `color` | ✅ Sí: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`; se ve en la lista de tareas y en la transcripción | Ninguno |
| 4 | El hook `PreToolUse` sabe qué subagente llama | ✅ Sí: `agent_id` y `agent_type` (el `name` del frontmatter) | **La guarda hace cumplir el territorio** de cada rol (`gates.territorio`) |
| 5 | `skills:` inyecta las skills completas | ✅ Sí, el contenido completo al arrancar (hasta 32); sin el campo, el agente las carga con `Skill` | Skills en dos grupos: «siempre» al frontmatter, «según la tarea» por `Skill`. Se añadió `Skill` a las herramientas de los roles |
| 6 | El hook de fin recibe `stop_hook_active` | ✅ Sí | Ninguno |

## Las pruebas en frío (2026-10-24)

Tres sesiones sin contexto, con solo esta carpeta y una persona simulada, llegaron hasta el final de
su encargo:

| Perfil | Proyecto | Bloqueos | Lo más grave que encontró |
| --- | --- | --- | --- |
| S | Landing de cafetería; luego pasa a M | 4 | La carpeta entregada, dentro del proyecto, hacía saltar los gates en cada turno; un nombre de agente reutilizado al cambiar de perfil se saltaba el territorio |
| M | Clínica veterinaria, dos repos | 6 | `http://localhost:3000` escrito a mano pasaba el gate fijo; el catálogo solo miraba la raíz; `hu.mjs fase` dejaba saltar fases |
| L | Marketplace con pagos, tres repos | 4 | La configuración del grafo salía con marcadores y JSON inválido; el acta escribía «<fecha>» en el alcance sellado y no levantaba exclusiones |

Todo lo encontrado se corrigió el mismo día y se volvió a probar sobre los mismos escenarios: el
movimiento de la carpeta entregada, el catálogo por repo y las claves de un esquema zod, `localhost`
bloqueado, el territorio con nombres reutilizados y del PO, las transiciones de fase con sus
requisitos, el acta con fecha y exclusiones levantadas, la trazabilidad por entrega, la
configuración del grafo generada en código y el paso a producción sin hosts.

## La primera migración real (MecanicLive, 2026-10-24)

Perfil L, tres repos, una historia en verificación. Migró sin perder estado, con todos los gates en
verde, y encontró nueve fallas de la v4. Corregidas el 2026-10-25:

| Falla | Arreglo |
| --- | --- |
| `migrar-v3.mjs` no ponía los packs del stack ni normalizaba el motor ni los puertos de la segunda app | Detecta NestJS, React/Vite y BullMQ; normaliza el motor; cuenta los puertos por app |
| Archivaba todo `scripts/`, también los propios | Solo los de la v3; los propios se quedan y sus gates pasan a `gatesPropios` |
| No movía lo que no sigue `HU-####` ni corregía enlaces | Lo mueve a `docs/diseno/heredado/` o al archivo, y reescribe los enlaces de todos los `.md` |
| Skills con nombre de rol huérfanas; `generar` metía fichas del pack en una skill del proyecto | Se renombran al pack; una skill que existe no recibe archivos |
| Sin sitio para gates propios ni reglas del orquestador | `config.gatesPropios` y `.metodo/reglas/orquestador.md` (incluido en `AGENTS.md`) |
| `guias.md` nacía «pendiente» con la fundación ya aprobada | La migración la crea aprobada (heredada) |
| `backend` decía «decimal exacto» en un proyecto que guarda enteros | «Tipo exacto: decimal o enteros en la unidad mínima, según el ADR» |
| `pruebas.mjs relacionadas` con rutas del repo corría cero pruebas y decía «ok» | Acepta rutas del repo, de la raíz o absolutas; sin archivos, falla |
| macOS no trae `timeout` | `limite.mjs`, portable, en todos los prompts |

## La segunda migración real (oficina virtual, 2026-10-25)

Perfil L con alcance off y construir todo, un monorepo con API, worker y web, 23 historias (18 esperando
la prueba humana). Migró sin perder estado; 97 documentos con enlaces reescritos. Encontró cuatro fallas,
corregidas el mismo día:

| Falla | Arreglo |
| --- | --- |
| Solo se reescribían los enlaces, no las rutas escritas como texto (`node scripts/hu.mjs`, `metodologia/…`) | La migración reescribe también las rutas en texto de `hu/`, `docs/`, `.claude/` y las reglas propias; lo archivado de la v3 apunta a su equivalente en la v4. `docs/archivo/` no se toca |
| El pre-commit revisaba el catálogo contra todo el código, y contaba la configuración de las pruebas | En un commit o un turno solo se revisan el catálogo tocado y los módulos de configuración tocados (todo, con `--todo`); la configuración de las pruebas no cuenta |
| `grafo.mjs` agrupaba por carpeta de primer nivel y no veía repos anidados (`happy-office/apps/*`) | Cada archivo cuenta para el repo de ruta más larga que lo contiene |
| `generar` reescribía el `.claude/launch.json` del proyecto (el agente quitó los puertos para salvarlo) | Se mezcla: se conservan las configuraciones del proyecto y solo se añaden las que faltan, por nombre |

Y un tipo de repo nuevo, `worker`: un proceso de servidor sin HTTP (colas, tareas). Es territorio de
`backend`, lleva el catálogo y los comandos del servidor.

Pendiente:

- **Una segunda ronda en frío** sobre la versión corregida, como hizo la v3 entre rondas.
- **La migración de un proyecto real de la v3** (la del ejemplo de la v3 ya funciona).

## Por decidir

| # | Decisión | Por defecto |
| --- | --- | --- |
| 1 | ¿La metodología como plugin de Claude Code? | **No por ahora**: se sigue puliendo como carpeta. Cuando sea robusta |
| 2 | ¿Repositorio de gobierno separado o dentro del código? | Dentro en S; a elección en M y L (`repos` lo dice) |
| 3 | Enlaces fijos: ¿archivo de enlaces o `.env`? | Archivo de enlaces (`codigo.enlaces: "archivo"`) |
| 4 | ¿Invariantes protegidas por `deny`? | No: se cambian con un ADR. Con `alcance: sellado`, a elección |
| 5 | ¿Dónde vive el showcase en el repo: ruta `/showcase` o Storybook? | Lo que el pack de apps recomiende |

## Pendientes con nombre (heredados de la v3)

| Pendiente | Qué haría falta |
| --- | --- |
| ~~Territorios en un repo único con paquetes compartidos~~ | Resuelto: `config.territorios` por rol, que la guarda hace cumplir |
| `launch.json` con varias apps | Generarlo desde `repos` (`metodo.mjs generar` ya lo hace: una pareja desarrollo/compilada por app) |
