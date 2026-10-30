# Brief · HU-0025 · backend

Criterios: AC-02, AC-03 (datos), AC-04 y AC-05 (lectura). Modelo: **opus**, porque abre una lectura de archivos con
una entrada del frontend (`folder`), toca la privacidad de RN-02 y añade un comando que entrega una URL al sistema.
Contrato: `arquitectura.md` § A-1 (aditivo, 0.3.0, sin major), A-2, A-3 y A-4. A-4 depende de la Pregunta 1.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src-tauri/src/projects.rs` | `ProjectDataGap`, `data_gaps` en `ProjectHistory`, `timed_histories` en `ProjectTotals`; tipos del lector (A-1); `mod reader;` |
| `src-tauri/src/projects/method.rs` | `Metrics.minutes: Option<u64>`; `read_history` y `summarize` (A-2); `is_history_folder` pasa a `pub(super)` |
| `src-tauri/src/projects/reader.rs` (nuevo) | `read_project_history_at`/`_sync`, `DOCUMENT_LIMIT`, `external_link`, `open_external_link_sync` |
| `src-tauri/src/platform/{macos,windows,linux,unsupported}.rs` | `open_external_url(url: &str) -> Result<(), AppError>` (A-4) |
| `src-tauri/src/commands.rs` | `read_project_history(app, id, folder)` y `open_external_link(url)`, envoltorios con `spawn_blocking` |
| `src-tauri/src/lib.rs` | Los dos en `generate_handler!` |
| `src-tauri/src/projects/tests.rs` | Casos nuevos y el caso 5 adaptado |
| `src/types.ts` | Espejo de A-1 |
| `src/lib/bridge.ts` | `readProjectHistory`, `openExternalLink` (mock: `window.open` **no**; registra y resuelve) y mocks con `dataGaps`/`timedHistories`; un proyecto mock tipo `happy-office` con «Sin tiempo», «Sin métricas» y 2 avisos; documentos mock con tabla, código, cita, casillas, un enlace externo, una imagen y HTML crudo (para probar que no se pintan) y uno `unreadable` |

## Pasos

1. A-2 en `method.rs`. `minutosTotales` ausente o `null` → `None` sin contar como cifra que falta; no numérico →
   `None` + cifra que falta. Gaps solo en terminadas, excluyentes. Quita los dos avisos; el de tokens dice «Faltan N
   cifras de tokens en metricas.json; cuentan como 0.».
2. `summarize`: suma minutos solo con `Some`; `timed_histories`.
3. `reader.rs` (A-3). La ruta del proyecto sale de `find_entry` + `open_root`; `folder` se valida léxicamente antes de
   tocar el disco; 4 nombres fijos en orden; `ReadMode::Whole(512 KiB)`; `\0` → ilegible; `Skip::Missing` → se omite.
   Función de dominio con `AppError` (ADR-0003); `String` solo en el `_sync` y el comando.
4. A-4: `external_link` puro con `reqwest::Url` (ya es dependencia) y `open_external_url` en los cuatro archivos de
   plataforma, misma firma; se le pasa `url.as_str()`. Sin `#[cfg(target_os)]` en el dominio.
5. Comandos, `generate_handler!`, `types.ts` y `bridge.ts`. `pnpm build` para comprobar el espejo.

## Variables de entorno nuevas

Ninguna. Ninguna URL en el código: el lector abre la que trae el Markdown, validada.

## Pruebas

Las seis de `arquitectura.md` § Pruebas (Rust). Usa `Fixture`, `read_v4`, `warnings_for` y `fingerprint` de
`projects/tests.rs`; para el symlink fuera, el patrón de `projects_does_not_follow_symlinks_outside_the_folder`; para
`deny`, el de `projects_forbids_claude_profile_and_app_data_folders`; para la nube, `cloud: |_, _| true`.

```bash
cargo test --manifest-path src-tauri/Cargo.toml projects
node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src-tauri/src/projects/method.rs src-tauri/src/projects/reader.rs src/types.ts src/lib/bridge.ts
```

## Si dudas

`graphify explain "ReadContext"`, `node .metodo/scripts/grafo.mjs impacto "ProjectHistory"`, ADR-0003 § Reglas para
lo nuevo, `docs/arquitectura/backend.md` § Proyectos anclados, `platform/linux.rs` `open_update_url` (modelo de
`xdg-open`).

## No toques

`ReadContext::resolve`, `open_root`, `cap_warnings`, el registro `projects.json` (el lector no actualiza
`lastReadAt`), `open_update_url` (es del canal oficial; no se reutiliza para URLs del proyecto),
`capabilities/default.json`, la CSP, `Cargo.toml` (ninguna dependencia nueva) y `src/features/**`.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
