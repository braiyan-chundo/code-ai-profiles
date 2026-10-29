# Brief · HU-0022 · backend

Criterios: AC-04 y AC-05 (y el estado de D-3). Modelo: **sonnet**. Son dos comandos aditivos, sin estado, que no
tocan el registro, los perfiles ni los procesos; lo delicado (no disparar avisos de macOS) está acotado y probado.
Contrato: `arquitectura.md` § A-3.5 y § A-4 (aditivo, 0.x).

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `.env.example` | Dos claves `[PUBLICO]` con su ficha, en el bloque «Escritorio (Rust)» |
| `src-tauri/build.rs` | `KEYS` pasa de 5 a 7 |
| `src-tauri/src/config.rs` | `macos_app_management_settings_url()`, `macos_files_and_folders_settings_url()`, `validate_settings_url` en `ConfigValues`/`validate_values`, pruebas |
| `src-tauri/src/lib.rs` | Tipos, funciones y comandos de A-4, `generate_handler!` y pruebas en `mod tests` |
| `src/types.ts` | `SystemSettingsPanel` y `AccountFacts`, literales de A-4 |
| `src/lib/bridge.ts` | `openSystemSettings(panel)` y `accountFacts()`, con su rama mock |

## Pasos

1. `.env.example`: ficha `# [PUBLICO] Panel «Gestión de apps» de Ajustes del Sistema (macOS) · requerida · apps:
   desktop (Rust)`, con los valores de A-3.5 y sin comillas.
2. `config.rs`: `validate_settings_url` exige el prefijo exacto `x-apple.systempreferences:` y, después, un resto no
   vacío con solo `[A-Za-z0-9._?=&-]`. El error nombra la clave, como los demás.
3. `lib.rs`, junto a `open_instance_folder`:
   - Tipos de A-4 con `serde(rename_all = "camelCase")`. `system_settings_url` y `groups_include_admin` son puras
     y compilan en las tres plataformas.
   - `open_system_settings_sync`: en macOS, `Command::new("/usr/bin/open").arg(url).status()`, y `Err` en español
     si no hay éxito. Con `cfg(not(macos))`: `Err("Esta plataforma no tiene ese panel de ajustes.")`.
   - `account_facts_sync`: en macOS, `Command::new("/usr/bin/id").arg("-Gn").output()`; con éxito,
     `Some(groups_include_admin(..))`, y si no, `None`. Con `cfg(not(macos))`: `None`.
   - Los dos comandos son `async` con `spawn_blocking`. `get_account_facts` devuelve siempre `Ok`: si
     `spawn_blocking` falla, `Ok(AccountFacts { admin: None })`.
4. `types.ts` y `bridge.ts`: espejo literal de A-4. Mock de `accountFacts`: `{ admin: true }`. Mock de
   `openSystemSettings`: no hace nada.

## Variables de entorno nuevas

| Nombre | [SECRET]/[PUBLICO] | Apps | Para qué |
| --- | --- | --- | --- |
| `CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL` | [PUBLICO] | desktop (Rust), al compilar | Abrir «Gestión de apps» |
| `CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL` | [PUBLICO] | desktop (Rust), al compilar | Abrir «Archivos y carpetas» (HU-0023) |

Se leen solo desde `config.rs` (`env!`), nunca con `std::env::var`.

## Pruebas

- **`config.rs`**: las dos claves válidas; rechazo de `https://…`, de otro esquema, de un valor vacío, de un espacio
  y de una comilla; `validation_names_the_broken_key` con dos casos más.
- **`lib.rs`**: `system_settings_url` para cada panel; el enum acepta los dos valores y rechaza `"fullDisk"`;
  `{"admin":null}`; `groups_include_admin` con `"staff admin everyone"` → `true`, y `"staff everyone"`,
  `"administrators"` y `""` → `false`.
- **Ninguna prueba llama a `open_system_settings_sync` ni a `account_facts_sync`**: abriría Ajustes del Sistema en la
  máquina del mantenedor.
- Para comprobar: `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`, `cargo test --manifest-path
  src-tauri/Cargo.toml -q config`, el mismo con `-q settings`, y `pnpm build`.

## Si dudas

- `graphify explain "open_instance_folder"` (el patrón de `Command` por plataforma) y `graphify explain
  "validate_values"`.
- La skill `code-ai-profiles-rust-tauri`, secciones «Añadir un comando IPC» y «Red y configuración». ADR-0002.

## No toques

- `macos_icon.rs` ni `MESSAGE_APP_MANAGEMENT`, el registro ni `CustomIcon`.
- `capabilities/default.json`, la CSP y `Cargo.toml`: sin plugins ni dependencias.
- Nada de `src/` fuera de `types.ts` y `bridge.ts`.
- No ejecutes `open x-apple.systempreferences:`. No toques procesos de Claude,
  `~/Library/Application Support/com.braiyan.claudeprofiles/` ni `/Applications`.

## Skills

`code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion` y `code-ai-profiles-pruebas`.
