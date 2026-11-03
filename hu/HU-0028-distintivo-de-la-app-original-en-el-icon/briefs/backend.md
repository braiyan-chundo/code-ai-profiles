# Brief · HU-0028 · backend

Criterios: AC-01, AC-03, AC-04, AC-05 (datos, Dock) y el contrato de AC-02. Modelo: **opus**, porque toca la cadena
de firma de macOS (reaplicar en `launch_preflight`), añade un campo al `instances.json` real, analiza binarios de
terceros y cambia el contrato y el scope del asset protocol. Contrato: `arquitectura.md` § A-1 a A-5 (aditivo, 0.x).

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/types.ts` | `ProviderBadge`, `SystemInfo.providerBadge`, `CustomIcon.dockBadge?` (A-1, literal) |
| `src/lib/bridge.ts` | `mockState().system.providerBadge` con un PNG neutro en `data:` (sin `http` en el literal) |
| `src/features/dashboard/dashboard-store.ts`, `tests/source-update-controller.test.ts` | `providerBadge: null` en sus literales de `SystemInfo` |
| `src-tauri/src/contract.rs` | `ProviderBadge`; `provider_badge` en `SystemInfo`; `dock_badge` en `CustomIcon` |
| `src-tauri/src/provider_badge.rs` (nuevo) | icns, PE, `badge_png`, `resolve_badge`, `provider_badge`, memoria y caché (A-2, A-3) |
| `src-tauri/src/lib.rs` | `mod provider_badge; use provider_badge::*;` (sin `cfg`: se usa en las tres) |
| `src-tauri/src/platform/{macos,windows,linux,unsupported}.rs` | `provider_icon_file(source) -> Option<PathBuf>` |
| `src-tauri/src/platform/mod.rs` | `linux_desktop_icon(contents)` con `#[cfg(any(test, target_os = "linux"))]` y su prueba |
| `src-tauri/src/scan.rs` | `provider_badge` en la semilla, en `system_info_scoped` (junto a `source_name`) y en la prueba de la línea 594 |
| `src-tauri/src/macos_icon.rs` | `DockBadge`, `dock_badge`, composición, caché, firmas nuevas, testigo y `launch_preflight` (A-4) |
| `src-tauri/src/versions/synchronize.rs` | Pasa `dock_badge(&paths.app_data, &original)` a `apply_branding_after_update` |
| `src-tauri/src/instances/icons.rs` | `dock_badge: None` en su `CustomIcon`; sus 2 pruebas pasan `None` como distintivo |
| `src-tauri/tauri.conf.json` | Scope: añade `"$APPDATA/provider-badge/*.png"`. Nada más |

## Pasos

1. **Primero, en su commit:** los cuatro archivos de `src/` y `tests/`. `pnpm build`. Avisa al orquestador: desbloquea
   al frontend.
2. `provider_badge.rs`: `icns_largest_png`, `pe_icon_image` (lee con `seek`, nunca el exe entero), DIB 32 → RGBA,
   `provider_icon_image` por firma de archivo, `badge_png`, `badge_key` (SHA-256, 16 hex), `resolve_badge` y
   `provider_badge` con `BADGE_LOCK` y el par memorizado por `application_fingerprint`. Límites de A-2/A-3; ni un
   `unwrap` sobre datos del archivo; con `#[cfg_attr(not(target_os = "windows"), allow(dead_code))]` donde toque.
3. Plataformas (A-2). macOS reutiliza `macos_bundle_value`; Linux reutiliza la lista de `.desktop` de
   `source_display_name` (sácala a un helper).
4. `scan.rs`: el campo nuevo; `cargo test` del módulo.
5. `macos_icon.rs`: composición en `dock_icon_png` tras el `overlay` del cuerpo (sombra del distintivo, luego el
   distintivo, `DOCK_BADGE_SIDE = 368`, `DOCK_BADGE_INSET = 36`, sombra 10 px, σ 8, 0,35); `cached_dock_icon_png`
   con clave incremental; `set_workspace_icon(.., icon_path, badge)` lee el icono y compone; propaga `badge` por
   `apply_icon_to_registered`, `restore_after_failure` y `apply_branding_after_update`; `IconOutcome.dock_badge` y
   `write_to`. Resuelve el distintivo una vez por operación con `dock_badge(&paths.app_data, original)`.
6. `launch_preflight`: la reaplicación por testigo distinto en la rama iconizada (A-4), reutilizando el bloque de la
   rama limpia; sin cambios en la autoactualización ni en «Gestión de apps».

## Variables de entorno nuevas

Ninguna.

## Pruebas

Las de «Pruebas que no pueden faltar» de `arquitectura.md`. Las sintéticas (icns, PE, plantilla 256) se construyen en
la propia prueba con `image`; nada de iconos reales en el repo. En `macos_icon.rs`, usa `IconFixture`,
`registry_for` y `WORKSPACE_ICON_CALLS`; un `CustomIcon` con `dock_badge: Some("stale")` y la original de la fixture
(sin icono) basta para «testigo distinto». `the_dock_icon_follows_the_macos_template` y
`the_saved_icon_does_not_change_when_the_dock_icon_is_applied` siguen en verde pasando `None`.
Corre: `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>` y
`cargo test --manifest-path src-tauri/Cargo.toml`; `pnpm build` tras el paso 1.

## Si dudas

`graphify explain "launch_preflight"`, `graphify explain "dock_icon_png"`, `node .metodo/scripts/grafo.mjs impacto
"SystemInfo"`, `node .metodo/scripts/grafo.mjs impacto "CustomIcon"`; `macos_icon.rs` 1352-1438 (las dos ramas de
`launch_preflight`) y `storage.rs` (`write_file_atomic`, `application_cache`). Skills abajo.

## No toques

`src/features/**` (salvo `dashboard-store.ts`), `src/app/**`, `tests/` salvo el literal citado (frontend). La CSP, los
`tauri.<plataforma>.conf.json` y `capabilities/`. `REGISTRY_VERSION`. `branding/icon.png` (D-2). El lanzador de Linux y
`apply_external_icon_best_effort` (D-6). `/Applications/Claude.app` y los datos reales de la app: solo pruebas con
fixtures. Ningún subproceso nuevo (`sips`, PowerShell), dependencia ni red. No registres rutas ni bytes de iconos.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
