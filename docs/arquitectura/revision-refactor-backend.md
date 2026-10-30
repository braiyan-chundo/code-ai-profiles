# Revisión técnica · Refactor del backend (rama `refactor-backend`)

Fecha: 2026-10-30 · Revisa: architect · HEAD revisado: `c9ffe82`, con el diff desde `develop` (`1e81123`) · Decisión
que lo recoge: ADR-0003

Commits revisados:

- **Arreglo y rendimiento**
  - `6486a25` `atomic_replace_file` reemplaza en un paso.
  - `07b0723` el inventario de procesos se captura una vez por operación.
- **Corte de `lib.rs`** (de 7 353 a 93 líneas): `bcc864e`, `78b3a9f`, `e5cd9b4`, `50e9c00`, `d3eed4a`, `fbacf46`,
  `56e553c`, `29c7303`, `27c319f`, `c6e9e36`, `8ea1ff0` y `733a72f` (documentación).
- **Estado y errores**
  - `4d1a01e` `AppState` en `tauri::State`.
  - `9cd0ae6`, `c1496b0` y `5887db3` `AppError` en `storage`, `processes` y `versions/feed`.
  - `c9ffe82` documentación.

## Veredicto: **PASS**, con tres condiciones antes de fusionar

No hay nada observable que cambie fuera de lo declarado. Se mantienen los 29 comandos (firma, `async` y nombres de
argumentos idénticos), los tipos serde, los eventos y el orden de las operaciones. Los errores llevan el mismo texto,
salvo el de `atomic_replace_file`, que se declaró. El corte es casi todo movimiento literal. El único cambio de forma
está en la fachada de plataforma, y lo comparé rama por rama con el código anterior.

Nada bloquea. Antes de fusionar hay que resolver R-1 a R-3: la PR saldría en rojo por el grafo, Windows no se ha
compilado de forma nativa y falta la entrada del arreglo en el CHANGELOG. Lo demás es deuda.

**Pruebas.**

- `pruebas.mjs estado` da «HEAD c9ffe82 sin suite en verde».
- Corrí `cargo test` una vez sobre `c9ffe82`: 198 pasan y 2 están ignoradas, igual que lo que dieron quienes
  implementaron.
- Corrí el chequeo cruzado (`flip.sh`) sobre Linux y Windows en `c9ffe82` y en `1e81123`. Salen los mismos avisos,
  todos anteriores al refactor, y ningún error.
- La compilación cruzada real a `x86_64-pc-windows-msvc` no se puede hacer en esta máquina: `aws-lc-sys` necesita
  `windows.h`.
- La suite completa la corre el orquestador.

## Lo que se comprobó, por foco

1. **Contrato IPC.**
   - Normalicé las 29 firmas `#[tauri::command]` de antes (en `lib.rs` de `07b0723`) y las de ahora (en
     `commands.rs`): son idénticas, incluido `update_original_application`, que sigue siendo síncrono.
   - Los atributos `#[serde]` y `#[derive]` de todo el crate coinciden con `develop`. Los únicos `derive` nuevos son
     de tipos internos (`AppError`, `AppErrorKind`, `ApplicationCache`, `RegistryLock` y `AppState`).
   - `src/`, `capabilities/`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`, `build.rs` y `.env.example` no
     cambian.
   - El frontend no compara textos de error, así que el mensaje unificado de `atomic_replace_file` no rompe nada.
2. **Movimiento literal.** Comparé, como multiconjunto de líneas, el código de `07b0723` con el de `733a72f`, sin
   contar visibilidad, `use` ni espacios. Las únicas diferencias son:
   - la fachada de plataforma;
   - `crate::tests::` → `crate::test_support::`;
   - la lista de `generate_handler!`;
   - la rama macOS de `apply_external_icon_best_effort`, que se quitó porque estaba dentro de una función
     `cfg(not(macos))` y nunca se compilaba.
3. **Plataforma.** Comparé cada función de `windows.rs`, `linux.rs` y `unsupported.rs` con su rama `#[cfg]` anterior:
   - `source_display_name`, `detect_provider_source`, `detect_original_profile`, `validate_source`,
     `source_version`, `fingerprint_metadata_paths`, `validate_provider_identity_uncached` y `copy_provider_bundle`;
   - las señales, `isolate_process_group` y `launched_process_group`;
   - `file_manager_program`, `open_update_url`, `apply_external_icon_best_effort`, Ajustes del Sistema y la cuenta.

   Las rutas, los argumentos, los textos y los códigos de salida son iguales. `SHARED_INSTALLATION` sustituye a
   `cfg!(target_os = "linux")` en los cinco sitios donde estaba (`topology.rs` ×4 y `synchronize.rs`). El
   `unreachable!()` de `open_update_url` fuera de las tres plataformas no se alcanza, igual que antes, porque
   `original_application_update_target("unknown")` devuelve `None` antes.
4. **Concurrencia.**
   - Las 18 llamadas a `with_registry_operation` de antes siguen, una a una, sobre el mismo `AppState` (el único
     `.manage`). `run_install` usa `&app_state(app).registry`.
   - En el código de la app no hay ningún `RegistryLock::default()` ni `AppState::default()`: solo en las pruebas.
   - La caché única se parte en dos mutex: `runtime` (panel y bytes) y `application_cache` (versiones e identidades).
     Ningún camino toma uno dentro del otro: los dos se piden y se sueltan en la misma expresión. El orden es siempre
     registro → caché, como antes.
   - La invalidación de los bytes tras `set` y `clear_instance_icon` en macOS pasa al llamador, después del `?`,
     todavía dentro del cerrojo. Las 9 invalidaciones de antes siguen.
5. **Errores.**
   - `Display` y `From<AppError> for String` dan el mensaje sin tocar.
   - Ningún error se formatea con `{:?}`.
   - `RegistryLock::run` conserva «El coordinador local de instancias quedó bloqueado.».
   - Solo `Network` es reintentable. Un 5xx o un 429 es `Network`; un 4xx, un tamaño excedido o un JSON inválido es
     `Remote`. Nadie lee la clase en producción. `check_source_update_sync` sigue cayendo a la caché ante cualquier
     error.
6. **Arreglo y rendimiento.**
   - `atomic_replace_file` delega en `write_file_atomic`: temporal en la misma carpeta, `sync_all` y `rename`. Mantiene
     el prefijo `.session-transfer` y la creación de la carpeta. Std hace el `rename` con reemplazo en las tres
     plataformas.
   - `process_start_time` refresca un solo PID. Revisé sysinfo 0.37.2: en Linux y Windows, `start_time` se calcula al
     crear la entrada del proceso, sea cual sea el `ProcessRefreshKind`, así que coincide con el de
     `ProcessInventory::capture`. En Windows el refresco parcial sigue haciendo `CreateToolhelp32Snapshot`, así que
     allí se gana menos.
7. **Pruebas.**
   - Las 184 funciones `#[test]` de `develop` siguen, con el mismo nombre. Hay 16 nuevas y ningún duplicado.
   - Las tres de `feed.rs` solo abren `127.0.0.1`: un servidor de un solo uso o un puerto recién cerrado.
   - `check_official_update_feed("linux", …)` devuelve `Unsupported` antes de tocar la red.

## Hallazgos

| Id | Tipo | Responsable | Hallazgo |
| --- | --- | --- | --- |
| R-1 | Corregir antes de fusionar | orquestador | **El grafo está desactualizado.** `pnpm graph:check` falla en `c9ffe82` («El grafo está desactualizado»), y `validate.yml` lo ejecuta en la PR, así que saldría en rojo. Hay que correr `pnpm graph:update` y versionar `graphify-out/`. Dejé el árbol limpio después de la comprobación |
| R-2 | Corregir antes de fusionar | orquestador, con el permiso del mantenedor para subir la rama | **Windows no se ha compilado de forma nativa.** El chequeo cruzado no cubre `std::os::windows` (`projects.rs`), el enlazado ni las dependencias en C. Linux sí queda cubierto por `cargo test` en `validate.yml`. Hay que lanzar `build-desktop.yml` por `workflow_dispatch` sobre la rama y ver en verde al menos «Windows x64» (las cuatro, mejor). Lo que vigilar: `platform/windows.rs` (señales con `taskkill`, `robocopy`, `powershell.exe`) y `#[cfg(not(unix))]` en `original_update.rs` y `unsupported.rs` |
| R-3 | Corregir antes de fusionar | orquestador | **Falta la entrada en el CHANGELOG.** `[Unreleased]` no tiene la del arreglo `6486a25`. Va en «Fixed»: reemplazar un índice de sesión, un icono o la caché ya no puede dejar el destino sin archivo si la app cae a mitad, y el error de ese reemplazo tiene un solo texto. El refactor no se anota, porque no cambia nada visible |
| R-4 | Deuda | backend | **Comentarios y avisos.** El comentario de `SHARED_INSTALLATION` dice «es una instalación compartida» también en `macos.rs`, `windows.rs` y `unsupported.rs`, donde vale `false`. Lo mismo pasa con los comentarios de `signal_verified_processes`, `isolate_process_group` y `copy_provider_bundle`, que hablan de todas las plataformas. Además, `instance_bundle_name` da un aviso `dead_code` en Windows y Linux, que ya existía antes |
| R-5 | Deuda | backend | **Las fronteras se cumplen por convención.** Los módulos nuevos tienen unos 550 `pub(crate)`, campos incluidos, `use super::*` en cada módulo y globs en `lib.rs`, así que cada módulo ve todo. Si dos módulos exportan el mismo nombre, es un error de ambigüedad al usarlo, y puede salir solo en una plataforma. Lo que no sale de su módulo se estrecha a privado o `pub(super)` al tocar cada módulo (reglas del ADR-0003) |
| R-6 | Deuda | backend | **El reemplazo en un paso tiene dos límites.** En Windows, `rename` sobre un destino con el atributo de solo lectura falla (`MoveFileExW` / renombrado POSIX sin `IGNORE_READONLY`). Antes, apartar el destino a `.previous` sí lo permitía. Ningún archivo propio es de solo lectura, y los índices de sesión de Claude tampoco deberían serlo, pero no está comprobado en Windows. Además, no se hace `fsync` de la carpeta tras el `rename`: en Linux, un apagón justo después podría dejar el archivo anterior, completo. Solo se corrige si se observa |
| R-7 | Deuda | backend | **Las pruebas de `feed.rs` dependen del proxy del sistema.** Usan el cliente real, que lee el proxy del sistema (las variables de entorno y, en macOS y Windows, la configuración del sistema). En un equipo con proxy y sin excepción para `127.0.0.1` fallarían sin que el producto tenga nada mal. La CI no tiene proxy |
| R-8 | Deuda | backend | **La clase de `AppError` todavía no se usa.** Solo la leen las pruebas: `kind` e `is_retryable` llevan `allow(dead_code)`. En macOS se pierde al pasar por `official_release` (`String`). Se migra cada módulo cuando se toque. Ningún reintento automático sin historia |
| R-9 | Aceptado | backend | **La espera tras la señal ordenada es algo mayor.** Detener reutiliza, para la señal ordenada, el inventario capturado dentro del cerrojo. El hueco entre comprobar la identidad y enviar la señal pasa de casi nada a lo que tardan en soltarse el cerrojo y clonarse la instancia (milisegundos). La identidad (huella y `start_time`) se sigue comprobando, y la señal forzada usa una captura nueva. Se acepta |
| R-10 | Deuda previa (fuera de alcance) | backend | **Un comando síncrono hace E/S en el hilo principal.** `update_original_application` no es `async`, así que en Tauri 2 corre en el hilo principal y hace `Command::status()`, que dura poco: `open`, `rundll32` o `xdg-open`. Ya era así antes del refactor. La skill ya prohíbe un comando síncrono nuevo con E/S |

## Documentación

- `docs/decisiones/ADR-0003-modulos-backend-estado-y-errores.md` (nuevo): la estructura, el estado, los errores y las
  reglas para lo nuevo.
- `ADR-0002`: queda marcado como sustituido en lo de dónde viven los comandos y en la regla de no partir `lib.rs`.
- `docs/arquitectura/backend.md`: apunta al ADR-0003 y corrige el cerrojo de `original_update`.
- `.claude/skills/code-ai-profiles-rust-tauri/SKILL.md`: describe la estructura nueva, el reemplazo en un paso,
  `AppState` y `AppError`.
