---
id: HU-0011
titulo: "Adopción v4"
estado: en-proceso
fase: implementacion
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

- [ ] Configuración fuera del código: atender los hallazgos de `node .metodo/scripts/config.mjs check --todo` (ver la bitácora)
- [ ] Pack por forjar: **rust-tauri** (Tauri 2, comandos IPC, `cargo fmt` y `cargo test`, plataformas). Hoy las reglas de backend viven en `.metodo/reglas/backend.md`
- [ ] Ajustar el pack `frontend-react-vite` a este proyecto: CSS propio sin Tailwind ni shadcn, npm y `node --test`
- [ ] Una skill por componente y su índice de uso, desde `DESIGN.md` y `src/components/`
- [ ] Primer borrador de reglas de negocio `RN-n` (aislamiento de perfiles, privacidad, transferencias solo entre perfiles detenidos) y de `docs/arquitectura/` (stack, IPC, almacenamiento local) desde lo construido
- [ ] Reubicar los `docs/*.document.md` funcionales en `docs/producto/` si conviene, actualizando los enlaces del README
- [ ] Revisar la HU-0005 heredada, que sigue en «In Progress» desde 2026-10-17: ¿se cierra o se abre como historia v4?
- [ ] Decidir si se conservan adaptadores de Codex (`.codex/`), ahora que `AGENTS.md` es generado

## Criterios de aceptación

### AC-01 · Método validado

`metodo.mjs validar`, `hu.mjs check`, `config.mjs probar` y `entorno.mjs probar` pasan.

### AC-02 · Sesión nueva carga el método

Una sesión nueva de Claude Code en el repo carga los agentes `architect`, `backend` y `frontend`, los comandos y las guardas.
