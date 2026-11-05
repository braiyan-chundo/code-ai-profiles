# Brief · HU-0029 · backend

Criterios: AC-02, AC-03, AC-05, AC-06 (y los datos de AC-01, AC-04). Modelo: **opus**, porque cambia el estado de la
original (máquina de estados y topología), escribe en datos reales de la persona (transferencias) y cambia el contrato.
Contrato: `arquitectura.md` § A-1 a A-4. Mensajes literales M-1..M-7 en § A-3.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src-tauri/src/original_profile.rs` (nuevo) | `OriginalProfile`, `resolve_original_profile(_with)`, `validate_original_profile_folder`, leer/guardar/olvidar `original-profile.json`, `original_profile_deny`, el selector, pruebas |
| `src-tauri/src/lib.rs` | `mod original_profile; use original_profile::*;` y los 2 comandos en `generate_handler!` |
| `src-tauri/src/contract.rs` | `OriginalProfileOrigin` y los 3 campos de `SystemInfo` (A-1) |
| `src-tauri/src/storage.rs` | `ManagedPaths.original_profile` (`original-profile.json`) |
| `src-tauri/src/test_support.rs`, `src-tauri/src/sessions/links.rs:267` | El campo nuevo en los literales de `ManagedPaths` |
| `src-tauri/src/processes.rs` | `original_instance_status_with_inventory(paths, inventory)` |
| `src-tauri/src/versions/topology.rs` | Pasa `paths` a esa función |
| `src-tauri/src/scan.rs` | `RefreshScope::ORIGINAL_PROFILE`; semilla; bloques `sessions` y `processes`; literal de la prueba (≈615) |
| `src-tauri/src/sessions/transfer.rs` | `resolve_transfer_profile(paths, registry, id, inventory)` y sus 3 llamadas |
| `src-tauri/src/projects.rs` | `environment`: deny con `original_profile_deny(&resolve_original_profile(&paths))` |
| `src-tauri/src/commands.rs` | `choose_original_profile_folder`, `forget_original_profile_folder` (A-4) |
| `src/types.ts` | `OriginalProfileOrigin` y los 3 campos (A-1) |
| `src/lib/bridge.ts` | `chooseOriginalProfileFolder`, `forgetOriginalProfileFolder` y los mocks (A-4) |
| `src/features/dashboard/dashboard-store.ts` | `EMPTY_DASHBOARD`: `"none"`, `false`, `false` |
| `tests/source-update-controller.test.ts` | El literal de `SystemInfo` (≈292) con los 3 campos |

## Pasos

1. **Contrato TS primero** (`types.ts`, `bridge.ts`, `dashboard-store.ts`, fixture): `pnpm build` en verde y commit;
   así frontend arranca sin pisarte. Mocks: `?original=sin-sesiones` (`window.location.search`), alternancia M-3 /
   `"/Users/demo/Datos de Claude"`, `forget` vuelve al arranque; `originalCodeSessions` vacío si no hay sesiones.
2. `original_profile.rs` según A-2/A-3. `original_profile_deny(p) -> Vec<PathBuf>`: `path`, `detected`, `chosen`
   sin repetir. La resolución nunca devuelve error; el archivo dañado cuenta como «sin elegida».
3. Cambia los llamadores de la tabla de A-2. Al terminar, `rg -n "detect_original_profile\(" src-tauri/src` solo
   muestra `platform/*.rs` y `original_profile.rs`.
4. `system_info_scoped`: en `scope.sessions` una sola `resolve_original_profile(paths)` rellena sesiones, ruta y los 3
   campos. `processes.rs` resuelve por su cuenta (lo usan topología y transferencias).
5. Selector en `original_profile.rs`, mismo patrón que `pick_project_folder_sync` (`DialogExt`, padre `main`) más
   `set_directory`. Comandos: selector **fuera** del candado; validar + guardar **dentro** de
   `with_registry_operation`; el refresco **después**, fuera (no anides: `dashboard_from_scope` toma el candado).
6. `cargo fmt`, `cargo clippy` si está en el proyecto, `cargo test`.

## Variables de entorno nuevas

Ninguna. Ni rutas fijas nuevas: la detectada sigue saliendo de `platform/*.rs`, sin tocarlo.

## Pruebas

En `original_profile.rs` (`env::temp_dir()` + `Uuid`, como `scan.rs`/`processes.rs`):

- resolución: sin elegida + detectada con/sin `claude-code-sessions` + sin detectada; elegida válida gana; elegida
  borrada → detectada y `chosen_missing`; elegida sin `claude-code-sessions` → igual;
- validación: carpeta con `claude-code-sessions` (devuelve ella); la propia `claude-code-sessions` (devuelve el
  padre); sin ella → M-3; no existe → M-1; un archivo → M-1; dentro de `app_data` y `app_data` dentro → M-4;
  enlace simbólico (`#[cfg(unix)]`, `std::os::unix::fs::symlink`) → M-2;
- persistencia: guardar → leer la misma ruta; olvidar sin archivo es `Ok`; archivo dañado → `None`;
- `original_profile_deny` incluye efectiva, detectada y elegida guardada aunque falte.

Que la validación no abre archivos se comprueba leyendo el código en la revisión (solo `symlink_metadata`,
`is_dir`, `canonicalize`), no con una prueba.

Corre solo las relacionadas: `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`, y
`cargo test --manifest-path src-tauri/Cargo.toml original_profile`. `pnpm build` por el contrato TS.

## Si dudas

`graphify explain "original_instance_status_with_inventory"`, `graphify explain "resolve_transfer_profile"`,
`node .metodo/scripts/grafo.mjs impacto "ManagedPaths"`; `rg -n "ManagedPaths \{"` para los literales. Skill
`code-ai-profiles-rust-tauri` (comandos, contrato, rutas por plataforma).

## No toques

`platform/*.rs` (la detección no cambia), `read_code_sessions`, la lógica interna de transferencias, capacidades de
Tauri, `Cargo.toml` (sin dependencias), `docs/producto/reglas/instancias.md`. La interfaz (`src/features/original-app`,
`src/app/routes`) es de frontend.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
