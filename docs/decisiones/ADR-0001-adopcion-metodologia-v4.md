# ADR-0001 · Adopción de la metodología v4

Fecha: 2026-10-27 · Historia: HU-0011 · Decide: Braiyan Rodriguez (mantenedor)

## Contexto

El proyecto trabajaba con un contrato de agentes propio: `AGENTS.md`, roles en `.agents/roles/`, adaptadores de Codex en `.codex/agents/`, HU sueltas en `docs/hu/` y Graphify obligatorio. Funcionaba, pero no tenía configuración central, ni guardas automáticas de configuración o producción, ni comandos de flujo, y el rol `document` añadía un salto entre analizar y documentar.

## Decisión

Se adopta la metodología v4 con perfil **S** y estos ajustes: agentes `architect`, `backend` y `frontend`; `alcance: off`; `propuesta: no`; `enfoque: tecnico`; `diseno: off` con el sistema heredado de `DESIGN.md`; `revisionTecnica: siempre`; `grafo: graphify`; tiempo máximo de pruebas de 15 min.

- Un solo repo en la raíz (`tipo: otro`) con `territorios` por rol, porque Tauri junta Rust y React.
- Los comandos de pruebas son los propios (npm, `node --test` y `cargo test`).
- `npm run graph:check` y `npm run release:check` funcionan como gates propios en modo aviso.
- El rol `document` desaparece. El orquestador mantiene la documentación funcional y `hu.mjs` lleva las historias.
- Lo anterior se archiva en `docs/archivo/previo/` sin reescribirse. La numeración sigue desde la HU-0010 (`primerNumero: 10`).

## Alternativas

| Opción | A favor | En contra |
| --- | --- | --- |
| Perfil M completo | QA, seguridad, devops y PO disponibles | Demasiado peso para un mantenedor y una app local |
| Perfil S puro (fullstack y ux) | Lo más ligero | Pierde la separación entre architect, backend y frontend, que ya funcionaba |
| Quedarse con el contrato propio | Cero cambio | Sin guardas, sin config central, sin comandos |

## Consecuencias

- Se gana: guardas de configuración y de producción (hook y pre-commit), territorios por rol, una carpeta por historia, comandos `/hu-new`, `/hu-work`, `/hu-close` y `/fix`, y suite única por SHA.
- Se paga: no hay pack de Rust/Tauri (queda por forjar) y el pack `frontend-react-vite` asume Tailwind, shadcn y pnpm, lo que hay que matizar con las reglas de frontend. Los adaptadores de Codex quedan archivados.
- **Lo que la v4 no previó** (va a las decisiones abiertas de la metodología):
  - `inventario.mjs` no detecta Rust/Tauri (`src-tauri/Cargo.toml`) ni pruebas `node --test`/`cargo test`.
  - `iniciar` añade `graphify-out/` al `.gitignore` aunque el proyecto versione su grafo con negaciones.
  - `iniciar` sobrescribe `AGENTS.md` sin aviso.
  - No hay un tipo de repo para apps de escritorio con dos capas en la misma raíz.
