# Brief · HU-0017 · backend

Criterios: AC-01..AC-06 (lado Rust y contrato). Modelo: **opus**, porque reemplaza la instalación real del
usuario, abre una segunda salida de red y coordina concurrencia con escaneo e instancias.
Contrato: `arquitectura.md` § A-1, A-2 y A-3; no lo cambies sin avisar. Flujo: § A-5 a A-9. Literal:

```ts
// IPC: install_original_update { request, onProgress: Channel<OriginalInstallProgress> } · cancel_original_update -> boolean
export interface InstallOriginalUpdateRequest { expectedVersion: string }
export type OriginalInstallPhase = "preparing" | "downloading" | "verifying" | "installing" | "synchronizing";
export interface OriginalInstallProgress { phase: OriginalInstallPhase; targetVersion: string | null;
  receivedBytes: number; totalBytes: number; cancellable: boolean }
export type OriginalInstallStatus = "installed" | "cancelled";
export interface OriginalInstallResult { status: OriginalInstallStatus; previousVersion: string | null;
  installedVersion: string | null; synchronization: SynchronizationItemResult[];
  pendingInstanceIds: string[]; dashboard: DashboardState }
// bridge: installOriginalUpdate(request, onProgress): Promise<OriginalInstallResult>; cancelOriginalUpdate(): Promise<boolean>
```

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/types.ts` | Los tipos de A-2, tal cual |
| `src/lib/bridge.ts` | `installOriginalUpdate` (crea el `Channel` aquí) y `cancelOriginalUpdate`, con mock (A-3) |
| `src-tauri/build.rs` | Lee `CAP_*` de entorno > `../.env.local` > `../.env.example`; `cargo:rustc-env` y `rerun-if-*`; falla diciendo cuál falta; tolera `\r\n` y comillas |
| `src-tauri/src/config.rs` (nuevo) | `env!` de las 5 variables, `download_hosts()`, `feed_url(platform, arch)`, `validate()`; único sitio con URLs |
| `src-tauri/src/original_update.rs` (nuevo) | Todo A-5..A-9; `use super::*`. ADR-0002 |
| `src-tauri/src/lib.rs` | `mod config; mod original_update;`, los 2 comandos (envoltorios finos), `generate_handler!`, `ManagedPaths.original_update`, `fetch_official_feed` (parte `check_official_update_feed`), URLs y UA desde `config`, `ProcessInventory::any_executable_within`, guard de vuelo en `update_original_application`, `setup` llama a `config::validate()` y a la recuperación |
| `src-tauri/Cargo.toml` | `sha2 = "0.10"` (ya está en el lock; pregunta 1 de arquitectura) |
| `.env.example` | Las 5 fichas `[PUBLICO]` con su valor actual (fuera de tu territorio: si la guarda lo frena, lo escribe el orquestador) |

## Pasos

1. **B-1 contrato**: `types.ts` + `bridge.ts` (mock: `mockSourceVersion` mutable, fases con espera, cancelable,
   `demo-work` pendiente) y comandos Rust que devuelven «no soportado». `pnpm build` verde. Avisa: arranca frontend.
2. `config.rs` + `build.rs` + `.env.example`; sustituye las 4 URLs y el UA de `lib.rs` (pruebas contra `config`).
3. Funciones puras de `original_update.rs`: `parse_feed_package`, `validate_download_url`, `redirect_allowed`,
   `validate_zip_listing` (+ totales de `zipinfo -t`), `stream_to_file(reader, dest, size, cancel, progress)
   -> sha256`, `check_symlinks_within`.
4. Capa inyectable `trait MacosTools` (extraer, listar zip, DR, verify con requisito, team id, `spctl`, valor de
   plist) con su impl real `#[cfg(target_os = "macos")]` por rutas absolutas y una falsa en pruebas.
5. `verify_staged_app`, `swap_bundles` (`libc::renamex_np(..., RENAME_SWAP)`, fallback dos `rename`),
   `install_staged_app` (comprobación de proceso inyectada, validación posterior, vuelta atrás) y
   `recover_original_update_leftovers`.
6. `install_original_update_sync`: A-5 completo, vuelo único con `Arc<AtomicBool>`, `with_registry_operation` solo en
   installing + synchronizing, limpieza en un `Drop`/`finally` que corre siempre, caché `current` tras instalar.
7. Ramas `#[cfg(not(target_os = "macos"))]` explícitas. `cargo fmt`, `cargo test`, `pnpm build`. Reglas: E/S en `spawn_blocking`; sin `unwrap` en el camino del comando; mensajes en español que digan si la
original cambió; `remove_dir_all` solo sobre `<op>` y `<app_data>/original-update/<uuid>` calculados por ti;
el directorio `<op>` se crea con `0700`; argumentos de `Command` como lista.

## Variables de entorno nuevas

`[PUBLICO]`, desktop (Rust), detalle en `arquitectura.md` § Variables: `CAP_UPDATE_FEED_URL`, `CAP_UPDATE_DOWNLOAD_HOSTS`,
`CAP_WINDOWS_X64_DOWNLOAD_URL`, `CAP_WINDOWS_ARM64_DOWNLOAD_URL`, `CAP_LINUX_INSTALL_GUIDE_URL`. Solo compilación, solo `config.rs`.

## Pruebas

En `original_update.rs` (`#[cfg(test)]`), raíz temporal única, y en `lib.rs` las que ya existen:
feed válido y cada rechazo (sin `updateTo`, versión ≠ `currentRelease`, sha corto, size 0 o > 2 GiB, `http`,
`downloads.claude.ai.evil.com`, `https://downloads.claude.ai@evil.com/`, puerto, no `.zip`); redirecciones
(otro host, `http`, > 3); `stream_to_file` (ok, corto, largo cortado en `size+1`, hash malo, cancelado a mitad
borra el parcial, progreso monótono); listado de zip (`../`, absoluto, dos raíces, demasiadas entradas, bomba);
symlinks (interno ok, absoluto y `../..` rechazados); `verify_staged_app` con herramientas falsas (firma, team,
team ausente en la instalada, Gatekeeper, versión, bundle id, no posterior); instalación en temporal (éxito
limpia `<op>`; fallo posterior restaura; original en marcha no toca nada; padre `0555` → error de permiso antes de
descargar); recuperación (restaura `previous/`, ignora nombres ajenos y symlinks); vuelo único y `cancel` sin
vuelo → `false`; caché `current` tras instalar; `config::validate()`. En macOS además un zip real con
`ditto -c -k --keepParent` de un bundle mínimo. Relacionadas: `pruebas.mjs relacionadas code-ai-profiles <archivos>`.

## Si dudas

`graphify explain "synchronize_managed_applications_sync"`, `graphify explain "swap_application_directory"`,
`grafo.mjs impacto "check_official_update_feed"`; timeouts de `reqwest::blocking` 0.13 y `Channel` de Tauri 2 en su doc.
Skills `code-ai-profiles-rust-tauri` y `code-ai-profiles-configuracion`.

## No toques

`src/features/**`, `src/app/**` (frontend), `capabilities/default.json`, `tauri*.conf.json`, el formato de
`instances.json`, `validate_provider_identity*` (úsalas, no las cambies), el handoff salvo el guard de vuelo.
