---
id: HU-0011
titulo: "Adopción v4"
estado: terminada
fase: cierre
area: metodo
entrega: 1
prioridad: media
creada: 2026-10-27
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: []
reglas: []
depende: []
---

# Adopción v4

Como mantenedor
quiero llevar Code AI Profiles de su metodología propia (architect, backend, frontend y document, con las HU en `docs/hu/`) a la metodología v4
para trabajar con perfil, diales, guardas y comandos (`/hu-new`, `/hu-work`, `/hu-close`, `/fix`) sin perder el flujo de Graphify ni las reglas de privacidad.

## Petición original

> «entra en contexto de esta app, luego vas a implementar en ella la metodologia 4 que te deje linkeada» — Braiyan Rodriguez, 2026-10-27

Elecciones de la persona: commitear HU-0010 y ramificar desde ahí; perfil **S con architect, backend y frontend**; sin alcance ni propuesta; sin el rasgo de datos personales.

## Problema

El proyecto tenía un contrato de agentes propio (`AGENTS.md`, `.agents/roles/`, `.codex/agents/`). Sus HU eran archivos sueltos y no había ni guardas ni configuración central.

## Alcance

El andamiaje v4 (hecho en esta adopción) y lo que la adopción deja pendiente, que se lista abajo.

## Fuera de alcance

Cambios de producto. Tampoco se reescriben las HU-0001 a HU-0010 heredadas.

## Lo que queda pendiente

- [x] Configuración fuera del código: las 4 lecturas de `scripts/graphify.mjs` quedan como excepción declarada (`metodo:permitir`, herramienta de desarrollo). `config.mjs check --todo` en orden
- [x] Pack por forjar: **rust-tauri**. Forjado en `pack-rust-tauri/`, revisado por architect e instalado como skill del proyecto `code-ai-profiles-rust-tauri`, con una regla en `.metodo/reglas/backend.md`. Copiarlo a `plantillas/packs/` (carpeta protegida) queda como deuda
- [x] Ajustar el pack `frontend-react-vite` a este proyecto: CSS propio sin Tailwind ni shadcn, npm y `node --test`
- [x] Una skill por componente y su índice de uso → pasa a HU-0013 (en espera)
- [x] Primer borrador de reglas de negocio `RN-n` y de `docs/arquitectura/` → pasa a HU-0013 (en espera)
- [x] Reubicar los `docs/*.document.md`: no conviene, se quedan donde están porque `AGENTS.md` y el README los citan por esa ruta (D-1 de HU-0013)
- [x] Revisar la HU-0005 heredada: cerrada por lo entregado; el icono de Dock pasa a HU-0012 (en espera)
- [x] Adaptadores de Codex (`.codex/`, `.agents/skills/`) al archivo `docs/archivo/previo/`, como pide la v4; Codex lee el `AGENTS.md` generado

## Criterios de aceptación

### AC-01 · Método validado

`metodo.mjs validar`, `hu.mjs check`, `config.mjs probar` y `entorno.mjs probar` pasan.

### AC-02 · Sesión nueva carga el método

Una sesión nueva de Claude Code en el repo carga los agentes `architect`, `backend` y `frontend`, los comandos y las guardas.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables
- [x] Reglas de negocio afectadas nombradas (ninguna: la historia solo toca gobierno)

## Definición de Terminado

- [x] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [x] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [x] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas: no hay código de producto; la única línea de código cambiada (`scripts/graphify.mjs`) no cambia comportamiento
- [x] Revisión técnica pasada (`revision-tecnica.md`)
- [x] La persona aprobó; su veredicto está en `verificacion.md`
- [x] Delta de reglas de negocio: no aplica (no toca reglas; las `RN-n` nacen en HU-0013)
- [x] Commits con `HU: HU-0011`. **Sin push, sin publicar, sin desplegar**
- [x] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

2026-10-27, cerrada por el orquestador sobre el veredicto «cerra todo con lo recomendado» de Braiyan Rodriguez.

SHA por repositorio, con una línea de qué hace cada uno: ver la bitácora (commit de cierre de HU-0011 en `adopcion-v4`).

★ aceptadas tal como estaban: D-1 a D-4 de `verificacion.md`.

Pendientes humanos (nadie los vio; no se dan por hechos): AC-02, que una sesión nueva carga agentes, comandos y skills.

Deuda declarada:
- Pack `rust-tauri` fuera de `.metodo/metodologia/plantillas/packs/`: hay que copiarlo a mano (carpeta protegida) y, cuando haya servido, llevarlo a `metodologia4`.
- `lib.rs`: cuatro URLs escritas en el código y un `User-Agent` fijo en `0.1`. El gate de configuración no revisa `.rs`.
- `save_registry` usa `fs::write`, no `atomic_replace_file`.
- `.gitignore:19` (`.codex/hooks.json`) ya no tiene objeto.
