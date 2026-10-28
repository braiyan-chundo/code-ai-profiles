# Verificación · HU-0011 · Adopción v4

Preparada por el orquestador el 2026-10-27. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre`: `revision-tecnica.md`.

## Qué se entregó

| Repo | Commit | Qué |
| --- | --- | --- |
| code-ai-profiles | (este cierre) | Skills `rust-tauri` (nueva, con su pack en borrador) y `frontend-react-vite` (adaptada); Codex archivado; HU-0005 cerrada; HU-0012 y HU-0013 en espera; excepción declarada en `scripts/graphify.mjs`; `cargo test` en `relacionadas`; grafo al día |

## Comprobaciones

| Comprobación (2026-10-27) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite`), una vez | en verde (tipos, build y suite: 6 s); se repite sobre el SHA final |
| Configuración fuera del código y guarda de producción | `config.mjs check --todo` y `entorno.mjs check` en orden |
| Método | `metodo.mjs validar`, `hu.mjs check`, `config.mjs probar` y `entorno.mjs probar` en verde (AC-01) |
| Revisión técnica | FAIL con R-1 y R-2; corregidos; re-revisión en `revision-tecnica.md` |

## Decisiones tomadas por defecto (★, revisables al probar)

1. D-1 · El pack `rust-tauri` se instala como skill del proyecto (`.claude/skills/code-ai-profiles-rust-tauri/`) más una regla en `.metodo/reglas/backend.md`, porque `.metodo/metodologia/**` está protegida (alternativa: copiar `pack-rust-tauri/` a `plantillas/packs/rust-tauri/`, añadirlo a `stack.packs` y correr `generar`).
2. D-2 · Las lecturas de entorno de `scripts/graphify.mjs` quedan como excepción `metodo:permitir`, porque es herramienta de desarrollo (alternativa: un módulo de configuración para scripts).
3. D-3 · Los `docs/*.document.md` no se reubican (alternativa: moverlos a `docs/producto/`).
4. D-4 · Reglas `RN-n`, `docs/arquitectura/` y las skills por componente pasan a HU-0013, en espera.

## Guía de prueba

1. **AC-01 · Método validado.** `node .metodo/scripts/metodo.mjs validar`, `node .metodo/scripts/hu.mjs check`, `node .metodo/scripts/config.mjs probar` y `node .metodo/scripts/entorno.mjs probar` terminan sin errores.
2. **AC-02 · Una sesión nueva carga el método.** Abre una sesión nueva de Claude Code en el repo: aparecen los agentes `architect`, `backend` y `frontend`, los comandos `/hu-new`, `/hu-work`, `/hu-close` y `/fix`, y las skills `code-ai-profiles-rust-tauri` y `code-ai-profiles-frontend-react-vite`.

**Solo tú puedes comprobar:** que una sesión nueva carga los agentes y las skills (AC-02).

## Veredicto

«cerra todo con lo recomendado» — Braiyan Rodriguez (mantenedor), 2026-10-27, en la conversación. Aprueba cerrar con las recomendaciones D-1 a D-4. AC-02 queda como pendiente humano: nadie abrió todavía una sesión nueva.
