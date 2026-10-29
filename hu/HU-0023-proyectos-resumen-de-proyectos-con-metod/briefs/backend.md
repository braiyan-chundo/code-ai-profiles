<!-- Copiado de arquitectura.md (sección «Brief · HU-0023 · backend»), 2026-10-29. -->
### Brief · HU-0023 · backend

Criterios: AC-02, AC-03, AC-04, AC-05, AC-06. Modelo: **opus**, por TCC, contención de rutas y privacidad.
Contrato: § A-1, A-2, A-3 y A-6 de este archivo. Espera a que HU-0022 haya commiteado sus cambios en `lib.rs`.

| Archivo | Qué cambia |
| --- | --- |
| `src/types.ts` | Los tipos de A-3, literales, al final (B-1) |
| `src/lib/bridge.ts` | Las 6 funciones con mock (B-1) |
| `src-tauri/src/projects.rs` (nuevo) | Registro (A-2), `ReadContext`, `read_capped`, `deny`, `*_sync`, pruebas |
| `src-tauri/src/projects/{method,tech,git}.rs` (nuevos) | A-1.1-A-1.6 |
| `src-tauri/src/lib.rs` | `mod projects;`, 6 comandos finos, `generate_handler!`, plugin del diálogo en el builder, `open_in_file_manager` extraído de `open_instance_folder` (L5100) |
| `src-tauri/Cargo.toml`, `Cargo.lock` | `tauri-plugin-dialog = "2"` (pregunta 1) |
| `src-tauri/Info.plist` (nuevo) | Tres `NS*FolderUsageDescription` (pregunta 2) |

Pasos:

1. B-1: tipos y `bridge.ts` con mocks; `pnpm build`; commit `HU: HU-0023`; avisa a frontend.
2. Añade el plugin y comprueba `cargo tree -i rfd` y `-i tauri-plugin-fs`: si aparece algo fuera de lo previsto en la
   pregunta 1, para y avisa. **No** toques `capabilities/default.json` ni añadas `@tauri-apps/plugin-dialog`.
3. `pick_project_folder`: `blocking_pick_folder()` dentro de `spawn_blocking`, con la ventana `main` de padre.
4. Lectura (A-1) con `ReadContext` inyectable; `deny` = `home/.claude`, `app_data_dir`, `detect_original_profile()`.
5. Registro (A-2) con `write_json_atomic` y `projects_mutex`; no uses `save_registry` ni `fs::write` directo.
6. `open_project_folder`: la ruta sale del registro; reutiliza `open_in_file_manager`.
7. Mensajes en español en `message` y en `Err`; ningún `unwrap`/`expect` nuevo; ningún `Command::new` en `projects/*`.

Si la pregunta 1 es «no»: `pick_project_folder` no existe; añade `inspect_project_folder(path) -> ProjectCandidate` y
avisa a architect para rehacer A-4. Si la 2 es «no»: sin `Info.plist`.

Variables de entorno nuevas: ninguna.

Pruebas: las 16 de «Pruebas proporcionales». Corre `cargo test --manifest-path src-tauri/Cargo.toml -q projects`, luego
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>` y `pnpm build`.

Si dudas: `graphify explain "open_instance_folder"`, `graphify explain "detect_original_profile"`,
`node .metodo/scripts/grafo.mjs impacto "atomic_replace_file"`; formato del método en
`METODOLOGIAS/metodologia4/plantillas/scripts/hu.mjs` (L35-81) y `metricas-y-actividad.md` §2; este repo como fixture
de referencia (no en las pruebas).

No toques: `ManagedPaths` ni `test_managed_paths`, `save_registry`, `atomic_replace_file`, `capabilities/`,
`tauri.conf.json` (CSP y `assetProtocol`), `config.rs`/`build.rs`, nada de `hu/HU-0022-*`, `~/.claude`, procesos de Claude.

Skills: `code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.

