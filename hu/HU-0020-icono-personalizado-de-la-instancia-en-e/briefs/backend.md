# Brief · HU-0020 · backend

Criterios: AC-01..AC-04 (lado Rust y contrato). Modelo: **opus**, porque relaja una verificación de firma,
toca bundles reales de la persona y clasifica un permiso del sistema (TCC «Gestión de apps»).
Contrato: `arquitectura.md` § A-1 (literal, no lo cambies sin avisar). Reglas: § A-2 a A-5.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/types.ts` | `CustomIconSystemIssue` y `systemIssue?` en `CustomIcon` (A-1) |
| `src/lib/bridge.ts` | `reapplyInstanceIcon(id)` → `call("reapply_instance_icon", { id })`; mock: `systemApplied=true`, `systemIssue=null`, mensaje de demo |
| `src-tauri/src/macos_icon.rs` (nuevo, `#[cfg(target_os = "macos")] mod macos_icon;`) | `verify_managed_bundle` (A-2), `strip_inherited_icon`, `set_workspace_icon` (se mueve `set_macos_workspace_icon`), clasificación `EPERM` (A-5), preflight de lanzamiento (A-4.5) y las funciones de icono de L4974-5135, reescritas. Flujo autocontenido según ADR-0002; `use super::*`; pruebas en su `mod tests` |
| `src-tauri/src/lib.rs` | `CustomIcon.system_issue` + enum; `validate_managed_provenance` sustituida por `verify_managed_bundle` en `validate_managed_application[_source]`; strip y `--strict` en *staging* antes de `swap_application_directory` (L4092-4123); strip en `create_instance_sync` (L4456); preflight en `launch_instance_sync` antes de `Command::new`; `set/clear_instance_icon_sync` según A-4; comando `reapply_instance_icon` (envoltorio fino) en `generate_handler!`; borrar `MACOS_WORKSPACE_ICON_STRICT_INCOMPATIBLE` y su rama |

## Pasos

1. **B-1 contrato:** `types.ts`, `bridge.ts` (con mock), campo serde con `#[serde(default)]`, y comando que en no-macOS
   devuelve el error literal de A-1. `pnpm build` y `cargo test` en verde. **Avisa: arranca frontend.**
2. `verify_managed_bundle` con los 6 pasos de A-2. DR de la original con `codesign -d -r-` (stdout; acepta
   `designated => …` y `# designated => …`). `-R` y `=<DR>` como dos argumentos, `--strict=symlinks`, `LC_ALL=C`.
   El barrido usa `libc::listxattr`/`getxattr` con `XATTR_NOFOLLOW` y `fs::symlink_metadata`; nunca sigue symlinks.
3. Registro del CDHash solo tras `--strict` en verde de la copia limpia (A-2, último párrafo). `managed_fingerprint`
   se sigue escribiendo pero ya no se compara (★ D-E).
4. `strip_inherited_icon` + `--deep --strict -R=<DR>` + versión + bundle id sobre la copia de *staging*, **antes
   del swap**. Si falla, se borra el *staging* y no se toca la instalada.
5. `apply_macos_branding_after_update`, `set/clear/reapply` y los rollbacks según A-4.1, A-4.2 y A-4.4. Un fallo de
   `setIcon` no es fatal (salvo al quitar). Un fallo de A-2 tras un `setIcon` correcto sí lo es.
6. Preflight A-4.5 en `launch_instance_sync`, solo si la instancia tiene `custom_icon`. Las copias sin icono se lanzan
   como hoy (★ D-B). Re-registro D-3 con versión ≥ registrada y migración perezosa (★ D-C). La reaplicación se salta
   con `systemIssue == AppManagement`.
7. Guarda en `set_workspace_icon`: rechaza cualquier ruta que no esté dentro de `ManagedPaths.instances`
   (canonicalizada). La original nunca recibe icono.
8. Mensajes literales de A-2 y A-5, en español, sin rutas ni diagnósticos de `codesign`. Las ramas
   `#[cfg(not(target_os = "macos"))]` quedan explícitas. `cargo fmt`, `cargo test` y `pnpm build`.

Reglas: E/S en `spawn_blocking`; sin `unwrap` en el camino del comando; `remove_*` solo en rutas del registro o
`ManagedPaths`; nunca tocar `profile/`. Variables de entorno y URLs nuevas: ninguna.
## Pruebas

En `macos_icon.rs`, con `#[cfg(target_os = "macos")]` y una raíz temporal única. Reutiliza `write_signed_fixture_bundle`
(hazla `pub(crate)` en `lib.rs::tests`) y añade una variante con requisito explícito
(`--sign - -r "=designated => identifier \"com.codeaiprofiles.fixture\""`). **Nunca Claude.** Las dos variantes:

- **Inversión de L6061:** la copia con icono pasa A-2 y conserva CDHash e `Info.plist`; `--strict` falla (el icono
  está) y el `--smoke` lanza. Sustituye también L6084 (ahora `system_applied == Some(true)`) y L6127.
- **Matriz con icono puesto, cada caso falla A-2:** archivo extra en la raíz y en `Contents/Resources`; `Info.plist`
  y un recurso alterados; FinderInfo y ResourceFork en un archivo interno; `Icon\r` con bytes, con `+x` o symlink;
  symlink en la raíz; copia re-firmada ad hoc (con requisito explícito pasa `-R` y falla solo por el CDHash);
  original con otro identificador (DR distinto).
- Copia limpia con provenance: pasa. D-3: copia re-firmada con versión 1.0.1 y sin icono → `Clean`, se re-registra;
  con versión 0.9 → rechazo.
- Clonar o sincronizar desde una donante con icono: tras el strip, `--strict` en verde. El destino con icono acaba
  `Iconized`; sin icono, limpio y `provenance=None`.
- Quitar: `--strict` en verde, `custom_icon` y `provenance` a `None`.
- `EPERM` → `AppManagement`: raíz con `chflags uchg` (vuelve a `nouchg` al terminar, también si falla). `setIcon`
  devuelve `false` y la clasificación da `AppManagement`. Más la prueba pura con `io::Error::from_raw_os_error(libc::EPERM)`.
- Guarda: `set_workspace_icon` sobre una ruta fuera de las instancias → `Err`.
- Serde: un registro sin `systemIssue` se lee con `None`.
- El preflight de lanzamiento, como función sin `spawn`: copia manipulada → `Err`; sin icono → no verifica.

Corre: `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src-tauri/src/lib.rs src-tauri/src/macos_icon.rs src/types.ts src/lib/bridge.ts`.
Windows y Linux: «solo verificado en CI» (`build-desktop.yml`).

## Si dudas

`graphify explain "apply_macos_custom_icon"`, `grafo.mjs impacto "validate_managed_provenance"` (devuelve
`graphify-out/` a HEAD si cambia), skill `code-ai-profiles-rust-tauri`, mediciones en `arquitectura.md` § Análisis.

## No toques

- `original_update.rs`: su `--strict` y `MacosTools`. La encadenada pasa sola por `update_instance_application_from_source_sync`.
- `validate_provider_identity_uncached` (sigue con `--strict`; lo usan la original y el handoff, L5604).
- Las capabilities, la CSP, `config.rs` y `.env.example`.
- La detención (`stop_instance_sync`): no reaplica (★ D-A).
- El spike `macos_provider_clone_dock_visual_spike` (`#[ignore]`): solo ajusta la ruta de la función.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
