# Plantillas

> Estado: versión 4 (borrador), 2026-10-24.

Lo que la metodología pone en un proyecto. **No se copia a mano**: `metodo.mjs iniciar` monta el
andamiaje y `metodo.mjs generar` regenera lo generado desde `.metodo/config.json`.

## Qué hay

| Carpeta | Qué |
| --- | --- |
| `config/` | `perfiles.json` (diales y perfiles: la fuente de verdad), `config.json` (plantilla de la config del proyecto), `entornos.json`, `env.example` |
| `agents/` | Los diez roles, con marcadores |
| `commands/` | `/hu-new`, `/hu-work`, `/hu-close`, `/fix`, `/qa`, `/deploy`, `/diseno-fundacion`, `/metodo` |
| `hooks/` | `guarda.mjs` (PreToolUse, fija) y `fin-de-turno.mjs` (Stop) |
| `scripts/` | `lib.mjs`, `metodo.mjs`, `hu.mjs`, `pruebas.mjs`, `config.mjs`, `entorno.mjs`, `alcance.mjs`, `contracts.mjs`, `grafo.mjs`, `migrar-v3.mjs`, `inventario.mjs`, `metricas.mjs`, `limite.mjs`; solo Node estándar |
| `docs/` | Plantillas de documentos: historia, bitácora, arquitectura, brief, vista, verificación, informe de QA, reglas, ADR, alcance, actas, propuesta, notas, stack, observabilidad, `AGENTS.md`, `CLAUDE.md` |
| `diseno/` | `maqueta-shell.html` (estructura fija de maqueta) y `guias.md` |
| `skills/` | Las base: `configuracion`, `pruebas`, `diseno`, `componentes` (índice de uso, `forma.md` y la plantilla de la skill de cada componente), `observabilidad` |
| `packs/` | El stack por defecto: `frontend-react-vite`, `backend-nestjs`, `persistencia-mongodb`, `colas-bullmq`; además `persistencia-postgres`, los de dominio `dinero`, `eventos`, `tiempo-real`, `contratos`, y `_plantilla` para forjar |

## Origen → destino

| Origen | Destino en el proyecto | Cuándo | Se regenera |
| --- | --- | --- | --- |
| la metodología entera | `.metodo/metodologia/` | `iniciar` | no |
| `scripts/*.mjs` | `.metodo/scripts/` | `iniciar` (siempre: son de la metodología) | no |
| (construido en código desde `repos`) | `.metodo/gates.config.json`, `.graphifyignore` | con grafo o paquete de contratos | **sí** (`.graphifyignore`, solo si falta) |
| `config/entornos.json` | `.metodo/entornos.json` | `iniciar`, si no existe | no |
| `config/env.example` | `.env.example` | `iniciar`, si no existe | no |
| `agents/<rol>.md` | `.claude/agents/<nombre>.md` | por cada rol activo | **sí** |
| `commands/<cmd>.md` | `.claude/commands/<cmd>.md` | si su rol o dial está activo | **sí** |
| `hooks/*.mjs` | `.claude/hooks/` | siempre | **sí** |
| (construido en código) | `.claude/settings.json` | siempre | **sí** |
| (construido en código) | `.claude/launch.json` | siempre | se **mezcla**: se conservan las configuraciones del proyecto y se añaden las que faltan |
| `docs/AGENTS.md` | `AGENTS.md` | siempre | **sí** |
| `docs/CLAUDE.md` | `CLAUDE.md` | si no existe | no |
| `skills/<s>/`, `packs/<p>/skills/<s>/` | `.claude/skills/<slug>-<s>/` | si algún rol activo la carga, y no existe | no (la rellenan los roles) |
| — | `.metodo/reglas/<rol>.md` | por cada rol activo, vacía si no existe | no (es del proyecto) |
| `docs/reglas.md`, `invariantes.md`, `stack.md` | `docs/producto/reglas/README.md`, `docs/producto/invariantes.md`, `docs/arquitectura/stack.md` | `iniciar` | no |
| `docs/observabilidad.md` | `docs/operaciones/observabilidad.md` | `iniciar`, si `observabilidad` no es `off` | no |
| `diseno/guias.md` | `docs/diseno/guias.md` | `iniciar`, si `diseno: sistema` | no |
| `docs/alcance.md`, `fuera-de-alcance.md` | `docs/producto/` | `iniciar`, si hay alcance | no |
| `docs/hu.md`, `seguimiento.md` | `hu/HU-####-<slug>/` | `hu.mjs new` | no |
| `docs/brief.md`, `arquitectura.md`, `vista.md`, `verificacion.md`, `qa-informe.md`, `adr.md`, `acta-alcance.md`, `propuesta.md` | los copia el rol que los escribe | al usarlos | no |
| `diseno/maqueta-shell.html` | `hu/HU-####-*/diseno/maqueta.html` | lo copia `product-design` | no |

## Los marcadores

Pocos, y todos salen de la config (`lib.mjs → contexto`):

```text
{{CLAVE}}                    valor: PROYECTO, SLUG, PERFIL, FASE, MODO, N_<ROL>, COLOR_<ROL>, MODELO_<ROL>,
                             SKILLS_<ROL>, REPOS_SERVIDOR, REPOS_APPS, LISTA_AGENTES, TIMEOUT_MIN…
{{#SI_X}} … {{/SI_X}}        bloque si SI_X (en líneas propias; se pueden anidar)
{{^SI_X}} … {{/SI_X}}        bloque si no
{{SI_X: texto}}              texto en línea si SI_X (puede llevar {{VALORES}} dentro)
{{INCLUIR:reglas/<rol>.md}}  el contenido de .metodo/reglas/<rol>.md
```

Las condiciones `SI_*` son de tres familias: **diales** (`SI_ALCANCE`, `SI_SELLADO`, `SI_DISENO_SISTEMA`,
`SI_DOS_PASOS`, `SI_QA`, `SI_GRAFO`, `SI_OBS`, `SI_PRODUCCION`…), **roles** (`SI_ARCHITECT`,
`SI_FULLSTACK`…) y **rasgos** (`SI_DINERO`, `SI_COLAS`, `SI_TIEMPO_REAL`…). Una condición que no existe
hace fallar la generación; un marcador sin resolver, también: no se escribe nada a medias.
