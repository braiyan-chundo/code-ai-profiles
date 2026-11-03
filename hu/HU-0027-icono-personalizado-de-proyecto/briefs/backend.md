# Brief · HU-0027 · backend

Criterios: AC-01..AC-05 (datos y persistencia). Modelo: **opus**, porque añade un campo al `projects.json` real del
mantenedor, borra archivos en `app_data`, cambia un contrato IPC y amplía el scope del asset protocol.
Contrato: `arquitectura.md` § A-1 (aditivo, 0.x), A-2, A-3, A-4 y A-5.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/types.ts` | `ProjectIcon` y `icon: ProjectIcon \| null` en `ProjectSummary` (A-1, literal) |
| `src/lib/bridge.ts` | `setProjectIcon`, `clearProjectIcon` y sus mocks; `icon` en los 4 `mockProjects` y en `pinProject` |
| `src-tauri/src/icon_image.rs` (nuevo) | `normalized_icon_png`, `ICON_MAX_BYTES`, `ICON_MAX_DIMENSION` y su prueba, movidos tal cual |
| `src-tauri/src/instances/icons.rs` | Quita lo movido; sigue usándolo por el glob de la raíz |
| `src-tauri/src/lib.rs` | `mod icon_image; use icon_image::*;`; los 2 comandos en `generate_handler!` |
| `src-tauri/src/contract.rs` | `SetProjectIconRequest` (junto a `SetInstanceIconRequest`) |
| `src-tauri/src/projects.rs` | `PinnedProjectIcon`, `icon` en `PinnedProject`; `ProjectIcon`, `icon` en `ProjectSummary`; ruta, operaciones y `_sync` (A-2, A-3) |
| `src-tauri/src/commands.rs` | `set_project_icon`, `clear_project_icon`: `spawn_blocking`, como `unpin_project` |
| `src-tauri/tauri.conf.json` | Scope: añade `"$APPDATA/project-icons/*.png"`. Nada más |
| `src-tauri/src/projects/tests.rs` | Casos nuevos (abajo) |

## Pasos

1. **Primero, y en su commit:** `types.ts` + `bridge.ts`. Mocks: happy-office y Panel Finanzas (roto) con
   `icon: { path: "data:image/png;base64,…", revision: 1 }` (un PNG mínimo de color sólido; genéralo en el scratchpad;
   sin `http` en el literal); el resto `icon: null`. `setProjectIcon` mock: `URL.createObjectURL(new Blob([bytes],
   { type: "image/png" }))`, `revision: Date.now()`, revoca el `blob:` anterior, `readAt` nuevo y devuelve el proyecto;
   `clearProjectIcon` y `unpinProject` revocan y ponen `null`. Avisa al orquestador: desbloquea al frontend.
2. `icon_image.rs`: mover sin cambiar textos. La prueba de `macos_icon.rs:1604` sigue compilando.
3. `projects.rs`: helper `project_icon_file(app_data, id) -> Result<PathBuf, AppError>` con
   `Uuid::parse_str(id)?.hyphenated().to_string()` + `.png` bajo `project-icons/`. `project_icon(app_data, entry) ->
   Option<ProjectIcon>`: `Some` solo si `entry.icon` y `symlink_metadata` es archivo regular de 1 B a `ICON_MAX_BYTES`.
4. `summary_for` recibe `app_data` y rellena `icon`. En `read_entries`, dentro del candado, el `icon` de **cada**
   resumen sale de la entrada releída (también los rotos).
5. `set_project_icon_at(app_data, env, id, bytes)` y `clear_project_icon_at(app_data, env, id)` según A-3, con
   `AppError` (ADR-0003). **`read_project_at` fuera del candado** (el `Mutex` no es reentrante). `revision =
   max(Utc::now().timestamp_millis() as u64, anterior + 1)`. Escritura con `write_file_atomic(…, ".project-icon")`;
   si `save_projects` falla, `restore_optional_file`.
6. `unpin_project_at`: tras guardar, `let _ = fs::remove_file(project_icon_file(..))` (también si no había `icon`).
7. `_sync` con `environment(app)`, comandos y `generate_handler!`. Errores: A-3, en español.

## Variables de entorno nuevas

Ninguna.

## Pruebas

En `projects/tests.rs` (con `Fixture`, `write_reference_project`, `pin_project_at`): poner (512×512 en
`app-data/project-icons/<uuid>.png`, `summary.icon.path` igual, `revision` crece en un segundo poner, árbol del proyecto
igual byte a byte antes y después); bytes no válidos (error, sin archivo, `projects.json` igual); quitar dos veces;
desanclar borra el PNG y reanclar da `icon: None` con otro id; registro con `icon` y PNG ausente → `icon: None` y el
registro no cambia; PNG sustituido por un enlace → `None`; `projects.json` antiguo sin `icon` carga y al reescribir no
aparece `"icon"`; carpeta borrada con icono → `status: notFound` e `icon: Some`; id no UUID → «El proyecto ya no está
anclado.». Corre: `cargo test --manifest-path src-tauri/Cargo.toml` (relacionadas con `pruebas.mjs relacionadas
code-ai-profiles <archivos>`), y `pnpm build` tras el paso 1.

## Si dudas

`graphify explain "read_entries"`, `graphify explain "set_instance_icon_sync"`, `node .metodo/scripts/grafo.mjs impacto
"ProjectSummary"`; `src-tauri/src/instances/icons.rs` (patrón de escritura y restauración) y `storage.rs`
(`write_file_atomic`, `restore_optional_file`). Skill `code-ai-profiles-rust-tauri`.

## No toques

`src/features/**`, `src/app/**`, `tests/*.ts` (frontend). Los tres `tauri.<plataforma>.conf.json`, la CSP y
`capabilities/default.json`. `PROJECTS_VERSION` (sigue en 1). `ReadContext` y la lista de exclusión: el icono no se lee
de la carpeta del proyecto. `macos_icon.rs` salvo que no compile. No registres bytes ni rutas del archivo elegido.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
