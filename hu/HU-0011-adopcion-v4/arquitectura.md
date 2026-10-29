# Arquitectura · HU-0011 · Adopción v4

## Análisis

Confianza: alta. La adopción solo toca el gobierno (`.metodo/`, `.claude/`, `hu/`, `docs/`, `AGENTS.md`); el código de producto no cambia.

### Decisiones

- Un solo repo en la raíz con tipo `otro` y `territorios` por rol, porque Tauri junta las dos capas. backend escribe `src-tauri/**`, `scripts/**` y el contrato TypeScript (`src/types.ts`, `src/lib/bridge.ts`). frontend escribe `src/**`, `tests/**` y la configuración de Vite y TypeScript.
- Los comandos de pruebas son los del proyecto (npm, `node --test` y `cargo test`), no los del pack (pnpm y vitest).
- El grafo sigue con el envoltorio propio (`npm run graph:update` y `npm run graph:check`, versión fijada). `graphify-out/` se sigue versionando, y `.metodo/` y `.claude/` no se indexan.
- `graph:check` y `release:check` funcionan como gates propios en modo aviso.

### Impacto

- Contrato: no.
- Datos guardados: no.
