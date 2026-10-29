# Los roles

> Estado: versión 4 (borrador), 2026-10-24.

Once roles. Cada proyecto activa los que necesita (`agentes` en la config) y les pone **nombre,
color y modelo**. Las plantillas, listas para generar, están en
[plantillas/agents/](plantillas/agents/); este documento explica el porqué.

## Nombres y colores

El **rol** es interno y fijo (`backend`); el **nombre** y el **color** los eliges:

```json
"agentes": {
  "backend":  { "nombre": "kai-backend", "color": "blue",  "modelo": "sonnet" },
  "frontend": { "nombre": "mia-front",   "color": "green", "modelo": "sonnet" }
}
```

- El nombre va en minúsculas, con guiones, sin repetirse (Claude Code lo exige).
- El color es uno de los que admite Claude Code: `red`, `blue`, `green`, `yellow`, `purple`,
  `orange`, `pink`, `cyan`. Se ve mientras el agente trabaja: así sabes quién está activo. Hay ocho
  colores y diez roles: la plantilla repite color solo entre roles que no suelen trabajar a la vez
  (`backend` y `fullstack`; `data` y `devops`, que es bajo demanda).
- Los comandos y `AGENTS.md` se generan con esos nombres: el orquestador despacha a `kai-backend`.

## El catálogo

| Rol | Hace | Escribe | Modelo por defecto | Activo en |
| --- | --- | --- | --- | --- |
| `product-owner` | Qué se pide, criterios, reglas de negocio vivas, cierre | `hu/*/hu.md`, `docs/producto/reglas/` | sonnet | M, L |
| `architect` | Sintetiza, pregunta, decide contratos y datos, escribe briefs, revisa | `hu/*/arquitectura.md`, `hu/*/briefs/`, `docs/arquitectura/`, `docs/decisiones/` | opus | M, L |
| `explorador` | Mapea una zona del código, solo lectura | `hu/*/analisis/<área>.md` | haiku | M, L |
| `data` | Esquema, índices, migraciones, consultas, plan sobre datos reales | `hu/*/analisis/datos.md`, `docs/arquitectura/datos.md` | opus | L, o `datos: agente` |
| `product-design` | Fundación de diseño, maquetas, guías, componentes | `hu/*/diseno/`, `docs/diseno/`, skill de componentes | opus | S, M, L con interfaz |
| `backend` | Servidor, contra el contrato | su repo de servidor | sonnet | M, L |
| `frontend` | Apps y librería de componentes | sus repos de apps | sonnet | M, L |
| `fullstack` | Las dos capas, en proyectos pequeños | todos los repos de código | sonnet | S |
| `qa` | Prueba la historia en el navegador, no bloquea | `hu/*/qa/` | sonnet | bajo demanda |
| `devops` | Despliegue, entornos, observabilidad de infraestructura | `docs/operaciones/`, archivos de despliegue | sonnet | bajo demanda |
| `seguridad` | Busca vulnerabilidades, no bloquea | `hu/*/seguridad/`, `docs/operaciones/seguridad/` | opus | bajo demanda; en L también en historias riesgosas |

## Lo común a todos

- **Territorio que se hace cumplir**: qué rutas escribe cada rol (el PO, también la bitácora y, con
  alcance de lista viva, el alcance). Dentro de un subagente, el hook
  recibe el nombre del agente (`agent_type`), y la guarda bloquea un `Edit` o `Write` fuera de su
  territorio (`gates.territorio: bloqueo` en M y L). Los territorios por defecto salen de `repos`; en un
  solo repo con varias capas se declaran en `config.territorios` ([configuracion](configuracion.md)).
  Lo que se escribe con la shell no lo cubre: eso sigue en el prompt y la revisión del diff. La guarda
  reconoce a un agente por el nombre que le da la config y **solo entre los roles activos**; un
  subagente genérico (Explore, general-purpose) no lleva territorio.
- **Especialidad desde los packs**, en dos grupos: las skills «siempre» van al frontmatter (Claude Code
  inyecta su contenido completo al arrancar el agente) y las «según la tarea» se nombran en el cuerpo y
  el agente las carga con la herramienta `Skill` cuando hacen falta. Así un despacho no paga skills que
  no usa ([packs](packs.md)).
- **Diseño y QA heredan las herramientas de la sesión** (`disallowedTools` en lugar de `tools`): así
  tienen el navegador y Claude Design si la sesión los tiene.
- **Reglas propias** del proyecto en `.metodo/reglas/<rol>.md`, incluidas al generar.
- **Las dos reglas fijas** en todos: nada de configuración en el código, nada de producción.
- **Nunca** hacen push, publican ni despliegan.

## product-owner

Escribe historias **cortas** (hasta 6 criterios, uno o dos días; si no cabe, propone el corte:
[el tamaño de una historia](metodo.md#4b-el-tamaño-de-una-historia)) con criterios **observables abriendo la aplicación**, las ★ con su alternativa y
la sección «Para la persona usuaria». Novedad de la v4: **es el dueño de las reglas de negocio**. Al
abrir, nombra las `RN-n` que la historia toca; al cerrar, aplica el delta en `docs/producto/reglas/`
([metodo](metodo.md#5-las-reglas-de-negocio)).

Tiene `Edit` y `Write` (en la v3 escribía con la shell y lo declarado no protegía nada); su territorio
es `hu/*/hu.md`, `hu/*/seguimiento.md` y `docs/producto/reglas/`. No corre pruebas para cerrar: coteja
la verificación.

## architect

Decide la forma de los datos, los límites entre capas y los contratos, y deja a cada implementador un
brief. Detalle en [arquitectura.md](arquitectura.md). Lo nuevo:

- **No explora**: lanza en paralelo a los exploradores (y al agente `data`), lee lo que dejan y sintetiza. Es el único rol con la herramienta `Agent`.
- **No es infalible**: con `arquitectura: dos-pasos` devuelve primero supuestos, preguntas y nivel de
  confianza; los briefs llegan después de las respuestas.
- **Usa el grafo siempre** que esté activo, y deja en el brief qué consultar si el implementador duda.
- **Declara las variables de entorno nuevas** en el brief ([configuracion-del-codigo](configuracion-del-codigo.md)).
- Recomienda el modelo de cada implementador.

## explorador

Un mapeador rápido y barato. Recibe un área y una pregunta, consulta el grafo (si lo hay) y `rg`, y deja
≤60 líneas con rutas comprobadas, símbolos y dudas. No opina sobre la solución. Varios corren en
paralelo, lanzados por el arquitecto ([orquestador](orquestador.md#los-exploradores-en-paralelo)).

## data

Experto en base de datos. **La skill del motor existe siempre** (`persistencia-postgres`,
`persistencia-mongodb`…): es el manual que leen `architect` y `backend` al tocar la base. **El agente
es opcional**: se activa cuando el dato es complejo (concurrencia, stock, multi-tenant, reportes,
migraciones sobre datos reales). Trabaja en paralelo con los exploradores y deja `analisis/datos.md`:
esquema propuesto, índices, plan de migración con vuelta atrás y riesgos. No escribe migraciones: las
escribe `backend` siguiendo ese plan.

Al subir de perfil se reevalúa si hace falta ([perfiles](perfiles.md#la-reevaluación-al-subir)).

## product-design

Detalle en [diseno.md](diseno.md). Lo nuevo:

- **Fundación de diseño antes de cualquier maqueta**: pregunta si hay marca o referencias, construye el
  sistema de diseño con su showcase, una skill por componente con su índice de uso y las guías de layout y niveles de vista.
- **Usa Claude Design** (`herramientaDiseno: claude-design`).
- **Propone skills de diseño** según el tipo de proyecto.
- **Estructura fija de maqueta**: barra lateral con pantallas, estados, tamaños, variantes y tema; la
  pantalla a la derecha.
- **Experto en UX/UI**: heurísticas, accesibilidad, leyes de UX, guías de plataforma.
- Cada maqueta en la carpeta de su historia.

## backend, frontend y fullstack

**Especialistas de su capa, con la especialidad que dicte el stack.** El prompt del rol es genérico
(territorio, cómo leer el brief, qué entregar); la tecnología llega por los packs: un proyecto en
FastAPI y Vue carga `backend-fastapi` y `frontend-vue`, no NestJS y React.

- Corren solo las **pruebas relacionadas** con lo que tocan, con timeout. La suite completa no.
- Leen la configuración **solo desde el módulo de configuración** de su app.
- En local, generan los secretos de desarrollo y usan las cuentas del seed sin pedir permiso
  ([entornos](entornos.md)).
- `fullstack` existe para S: landings y cosas puntuales. Al pasar a M se separa en `backend` y
  `frontend`.

## qa

Opcional y **no bloqueante**. Por qué volvió: a veces la persona no tiene tiempo de probar. Por qué no
bloquea: en la v1, QA devolvía a desarrollo y la historia entraba en bucle.

- Se llama con `/qa HU-####`, antes de cerrar.
- Sigue la guía de `verificacion.md` en el navegador, con las cuentas del seed, contra la app local.
- **Una sola pasada, con tiempo máximo.** Deja `qa/informe.md` con hallazgos `Q-n` y **capturas** en
  `qa/capturas/`.
- **Arriba del informe, su veredicto explícito**: ✅ APROBADO (todos los criterios pasaron y ningún
  hallazgo alto) o ❌ RECHAZADO. Es la opinión de QA, no la de la persona.
- **Nunca devuelve trabajo a desarrollo ni corrige.** La persona revisa cada `Q-n` antes de cerrar y
  decide: arreglar (vía directa), deuda o descartar. Esa decisión va a la bitácora.

## devops

**Solo bajo demanda**, con `/deploy`. No está en la máquina de estados.

1. **Pregunta primero** con qué cuenta el cliente y con qué cuenta el desarrollador: servidor, VPS,
   nube, dominio, presupuesto, quién paga, quién mantiene.
2. **Recomienda dos o tres opciones** según el tipo de proyecto, con su porqué y su costo. Puede
   recomendar herramientas (Dokploy, Docker, una plataforma gestionada…), pero **ninguna es
   obligatoria: decide el desarrollador**.
3. Con la elección, deja `docs/operaciones/despliegue.md` y un ADR, y usa `.env.example` como lista
   de lo que hay que configurar en cada entorno.
4. **Nunca ejecuta nada contra producción sin autorización explícita**, cada vez.

Si existe una skill de infraestructura del desarrollador (por ejemplo una de VPS con Dokploy), entra
como pack del agente.

## seguridad

Opcional y **no bloqueante**, como QA. Busca lo que un atacante encontraría: control de acceso (incluido
cambiar un id para ver lo de otro), autenticación y sesión, validación de entrada, datos de más en el JSON,
secretos y configuración, dependencias vulnerables, webhooks. Prueba ataques **solo contra la app
local**, con las cuentas del seed; nunca toca producción.

Cuándo se le llama (dial `seguridad`):

| Valor | Cuándo |
| --- | --- |
| `off` | Nunca (S) |
| `bajo-demanda` | Cuando la persona lo pide con `/seguridad <HU \| repo <nombre> \| entrega>` (M) |
| `riesgo` | Además, el orquestador lo ofrece en cada historia riesgosa (permisos, datos personales, dinero, contrato) **antes de la prueba humana**, y la auditoría de la entrega es parte del paso a producción (L) |

Deja `seguridad/informe.md` con un veredicto explícito (✅ sin hallazgos graves / ❌ con hallazgos
graves) y hallazgos `S-n` con severidad, categoría OWASP, cómo se reproduce y el arreglo propuesto. La
persona decide cada uno: arreglar, deuda o aceptar el riesgo. No corrige: el arreglo lo hace el rol dueño.

## La matriz agente × skill

`●` siempre · `○` según la tarea · vacío: no la carga.

| Skill | po | architect | explorador | data | design | backend | frontend | fullstack | qa | devops |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| packs de servidor | | ○ brief | ○ | | | ● | | ● | | |
| packs de apps | | ○ brief | ○ | | | | ● | ● | | |
| persistencia (motor) | | ○ | | ● | | ○ | | ○ | | |
| contratos | | ● | | | | ○ | ○ | ○ | | |
| dominio sensible (dinero…) | | ○ | | ○ | | ○ | | ○ | | |
| diseño · componentes · UX | | | | | ● | | ○ pantalla | ○ pantalla | ○ | |
| configuración del código | | ● | | | | ● | ● | ● | | ● |
| observabilidad | | ○ | | | | ○ | ○ | ○ | | ● |
| pruebas | | | | | | ○ | ○ | ○ | ● | |
| despliegue | | | | | | | | | | ● |

## Los modelos

| Rol | Por defecto | Sube a `opus` si |
| --- | --- | --- |
| `backend`, `frontend`, `fullstack` | sonnet | el brief lo recomienda: dinero, máquina de estados, permisos, migración sobre datos reales, cambio de contrato existente, datos personales, concurrencia |
| `explorador` | haiku | el área es enorme o confusa; entonces sonnet |
| `qa`, `devops`, `product-owner` | sonnet | casi nunca |
| `architect`, `data`, `product-design` | opus | — |

Si casi todas las historias suben de modelo, el valor por defecto está mal elegido.
