# Stack de Code AI Profiles

Lo decide Braiyan Rodriguez (mantenedor). Cada decisión de base tiene su ADR.

| Capa | Pieza | Versión | Pack | Por qué |
| --- | --- | --- | --- | --- |
| Servidor | | | | |
| Base de datos | | | | |
| Apps | | | | |
| Librería de UI | | | | |
| Pruebas | | | | |
| Observabilidad | | | | |
| Despliegue | | | | |

Gestor de paquetes: `pnpm`, siempre.

## Repos

| Nombre | Ruta | Tipo | Puertos |
| --- | --- | --- | --- |
| `code-ai-profiles` | `.` | otro | — |

## Módulo de configuración de cada app

| App | Archivo | Valida con |
| --- | --- | --- |
| desktop (Rust) | `src-tauri/src/config.rs` (valores fijados al compilar por `src-tauri/build.rs` desde `.env.example`; ADR-0002, HU-0017) | `build.rs` falla si falta una clave `CAP_*`; `config::validate()` en `setup` comprueba el formato |
| interfaz (React) | Sin variables propias. Las URLs fijas irían a `src/lib/links.ts` | — |

## Las reglas que impone cada pieza

Lo que el stack obliga (y no se toma prestado de otros stacks). El detalle está en su pack.
