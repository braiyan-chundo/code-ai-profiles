---
name: code-ai-profiles-rust-tauri
description: Cómo se escribe la capa Rust de Code AI Profiles con Tauri 2 - comandos IPC, contrato con el frontend, sistema de archivos, procesos, rutas por plataforma, capacidades, red y pruebas con cargo. Cárgala antes de editar src-tauri/, añadir un comando IPC o tocar src/types.ts o src/lib/bridge.ts.
---

# Rust + Tauri 2 · Code AI Profiles

<!-- Pack rust-tauri, forjado el 2026-10-27 desde la documentación de Tauri 2 y src-tauri/ (edition 2021,
     reqwest 0.13 blocking + rustls, sysinfo 0.37). Revisado por architect el 2026-10-27 (HU-0011) y el
     2026-10-30 (ADR-0003: módulos, AppState y AppError). Mantenimiento manual. -->

## La regla de oro

**Lo que tocas son datos reales del usuario.** Antes de copiar, mover, reemplazar o borrar compruebas
que el id es un UUID (`ManagedPaths::root_for`) o `ORIGINAL_INSTANCE_ID`, que la ruta sale de
`resolve_transfer_profile`, del registro o de `ManagedPaths`, y que el perfil está **detenido**. La
operación tiene vuelta atrás: copia de respaldo o `atomic_replace_file`. Un `remove_dir_all` sobre
una ruta mal calculada borra el perfil de alguien.

## La estructura

```text
src-tauri/
  src/main.rs              solo llama a code_ai_profiles_lib::run(); windows_subsystem en release
  src/lib.rs               solo los `mod`, los `use <módulo>::*` que reexportan cada dominio en la raíz y run()
                           (.manage(AppState::default()) y generate_handler![commands::…]). Sin lógica ni pruebas
  src/commands.rs          los #[tauri::command]: envoltorios finos (spawn_blocking, cerrojo, RefreshScope)
  src/contract.rs          tipos serde del IPC y eventos de ventana (espejo de src/types.ts); formato de instances.json
  src/error.rs             AppError y AppErrorKind
  src/storage.rs           ManagedPaths, load/save_registry, write_file_atomic, atomic_replace_file,
                           AppState (RegistryLock + RuntimeCache) y el memo application_cache()
  src/processes.rs         ProcessInventory, identidad verificada, estado, señales, esperas y reaper
  src/scan.rs              RefreshScope, refresco del registro, estado del sistema, panel y escaneo
  src/instances/           mod.rs crear/editar/borrar/abrir carpeta · launch.rs lanzar/detener · icons.rs icono
  src/sessions/            mod.rs lectura y contexto · links.rs session-links.json · transfer.rs copiar/mover/devolver
  src/versions/            mod.rs versiones y huella · topology.rs · synchronize.rs · feed.rs · original.rs
  src/platform/            fachada: macos.rs, windows.rs, linux.rs, unix.rs (señales), unsupported.rs; mod.rs lo portable
  src/project_picker.rs    el selector nativo de carpetas
  src/projects.rs (+ projects/) proyectos anclados (HU-0023)
  src/macos_icon.rs        icono personalizado y verificación de copias en macOS
  src/original_update.rs   descargar, verificar e instalar la original en macOS (HU-0017); MacosTools inyectable
  src/official_release.rs  versión objetivo de la original (HU-0024)
  src/config.rs            URLs y hosts fijados al compilar desde .env.example (ADR-0002); validate() en setup
  src/test_support.rs      #[cfg(test)]: test_managed_paths, test_instance y los bundles firmados de macOS
  build.rs                 pasa las claves CAP_* (entorno > .env.local > .env.example) a cargo:rustc-env
  capabilities/*.json      permisos de la ventana "main" (mínimos)
  tauri.conf.json          CSP, assetProtocol con scope estrecho, ventana base (Windows: sin decoraciones)
  tauri.<os>.conf.json     ventana de macOS (Overlay) y de Linux (decoraciones nativas), bundles
src/types.ts               el contrato en TypeScript: refleja los structs serde
src/lib/bridge.ts          el único sitio que llama a invoke() y crea Channel; con mock para el modo navegador
```

La estructura la fija el ADR-0003, y el detalle está en `docs/arquitectura/backend.md`. Cada módulo empieza con un
`//!` que dice qué contiene, usa `use super::*` y lleva sus pruebas en su propio `#[cfg(test)] mod tests`.

- **Lo nuevo va en el módulo de su dominio.** Un dominio nuevo es un módulo nuevo: su `mod` y su `use x::*` en
  `lib.rs`. En `lib.rs` no se añade nada más.
- **Nombres únicos en todo el crate.** Con los globs de `lib.rs`, dos `pub(crate)` con el mismo nombre en módulos
  distintos son un error de ambigüedad, y a veces solo en una plataforma.
- **Visibilidad.** Lo que no sale del módulo es privado. `pub(crate)` solo para lo que usa otro módulo.

## Añadir un comando IPC

1. El tipo va en `contract.rs`: `#[derive(Serialize, Deserialize)]` con `#[serde(rename_all = "camelCase")]`.
   Los enums simples usan `"lowercase"`. El mismo tipo va a `src/types.ts`, campo por campo.
2. La lógica va en el módulo de su dominio, en una función síncrona
   `<nombre>_sync(app: &AppHandle, …) -> Result<T, String>`. Por dentro, las funciones del dominio devuelven
   `AppError` (§ Errores).
3. El comando va en `commands.rs`, como envoltorio fino:
   ```rust
   #[tauri::command]
   pub(crate) async fn delete_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
       let worker_app = app.clone();
       tauri::async_runtime::spawn_blocking(move || {
           app_state(&worker_app).with_registry_operation(|| delete_instance_sync(&worker_app, id))
       })
       .await
       .map_err(|error| format!("La eliminación terminó inesperadamente: {error}"))??;
       dashboard_from_scope_async(app, RefreshScope::VERSIONS, "La actualización del panel").await
   }
   ```
   La E/S bloqueante (fs, `Command`, reqwest blocking) va en `spawn_blocking`, nunca en el hilo async.
   Un comando síncrono (`fn` sin `async`) corre en el hilo principal: no lo uses para E/S nueva.
4. Si el comando muta el registro, lo envuelves en `app_state(&app).with_registry_operation(|| …)`
   (§ Estado compartido).
5. Lo registras en `tauri::generate_handler![commands::…]` dentro de `run()`, en `lib.rs`.
6. En `bridge.ts`: una función tipada que llama a `invoke` y su rama mock para cuando
   `window.__TAURI_INTERNALS__` no existe (Vite en el navegador).
7. Si el comando cambia el panel, devuelve `DashboardState` con el `RefreshScope` más estrecho que
   sirva. Así el frontend no tiene que volver a pedirlo.

## Errores

- Por IPC cruza `Result<T, String>`. El `String` es un **mensaje para la persona, en español**, que
  dice qué falló y qué hacer («Detén la instancia antes de eliminarla.»). El código, los nombres y los
  logs van en inglés.
- Dentro de Rust, el error es `AppError` (`error.rs`): el mensaje para la persona, ya redactado, más su
  clase (`AppErrorKind`: `LocalIo`, `DamagedData`, `Process`, `Network`, `Remote`, `InvalidInput`,
  `Unsupported`, `Internal`; `Other` es lo que llega de un `String`). Una función nueva del dominio
  devuelve `Result<T, AppError>`:
  `map_err(|error| AppError::local_io(format!("No se pudo <acción>: {error}")))` en cada `?` que cruza una
  frontera (fs, proceso, red, serde).
- `Display` y `From<AppError> for String` dan el mensaje tal cual, así que `?` o `String::from` lo
  convierten al `String` del IPC sin cambiar el texto. `String` solo aparece en `commands.rs` y en los
  `*_sync` que llaman los comandos. Nunca `format!("{error:?}")`.
- Solo `Network` es reintentable (`is_retryable`): sin conexión, plazo, lectura cortada, 5xx o 429. Un 4xx
  o un documento inválido es `Remote`, definitivo. Ningún camino reintenta solo: un reintento o una decisión
  según la clase necesita historia.
- Ya usan `AppError` `storage`, `processes` (y `signal_verified_processes`) y `versions/feed.rs`. El resto
  se migra cuando se toca, sin cambiar el texto.
- Nada de `unwrap()`/`expect()` nuevos en el camino de un comando: un pánico cierra la app. Solo
  existen el de `run()` y los de invariantes de `refresh_registry_scoped` y `system_info_scoped`.

## Sistema de archivos y persistencia

- Las rutas administradas salen de `ManagedPaths::resolve(app)` (`app_data_dir`). La instalación y
  el perfil de la aplicación original se localizan solo con `detect_provider_source` y
  `detect_original_profile`, que usan `dirs::home_dir()` y las variables del sistema operativo
  (`APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`). Esas variables son convenciones de la plataforma,
  no configuración: no van a `config.rs` ni a `.env.example`. No se arma `~` a mano.
- La ruta del perfil de una instancia administrada sale de `instance.profile_path` en el registro.
  Los dos lados de una transferencia salen de `resolve_transfer_profile`.
- Un archivo se reemplaza en un solo paso. `write_file_atomic(destino, bytes, prefijo)` escribe un temporal
  `<prefijo>-<uuid>.tmp` en la misma carpeta, hace `sync_all` y un `rename` que reemplaza el destino. Si
  algo falla, borra el temporal y el destino anterior sigue intacto: nunca queda sin archivo.
  - Lo usan el registro (`save_registry`) y `projects.json`.
  - `atomic_replace_file(destino, bytes)` es lo mismo, pero además crea la carpeta y devuelve `AppError`
    («No se pudo reemplazar el archivo; se conservó el anterior: …»). Lo usan los enlaces de sesión, la caché
    del feed, los índices de sesión, los iconos y el lanzador de Linux.
  - Ya no hay copia `.previous`. Un archivo propio nuevo usa una de las dos, nunca `fs::write` sobre el
    destino.
- `canonicalize` antes de comparar rutas o de decidir que algo está «dentro» de una raíz.
- Al persistir el registro no se guardan las sesiones (`code_sessions.clear()`). Solo se guardan
  metadatos: nunca prompts, respuestas, transcripts, cookies ni tokens de un perfil.

## Estado compartido

- `AppState` (`storage.rs`) se registra con `.manage(AppState::default())` en `run()` y tiene dos partes:
  - `registry: RegistryLock`: el mutex que serializa leer, modificar y guardar `instances.json`;
  - `runtime: Mutex<RuntimeCache>`: el último panel y los bytes administrados (`previous_dashboard`,
    `remember_dashboard`, `invalidate_managed_bytes`).
- Los comandos ya mueven el `AppHandle` a `spawn_blocking`, así que lo leen dentro con `app_state(&app)`, no
  como `tauri::State<'_, _>` en la firma (no es `'static`).
- Una función de dominio recibe solo la parte que usa: `&RegistryLock` (`run_install`),
  `&Mutex<RuntimeCache>` (`system_info_scoped`) o `&AppState` (`scan_system_sync`). Así una prueba crea su
  `AppState::default()` y no comparte nada con otra.
- El mutex no es reentrante. Lo que ya corre dentro de `with_registry_operation` no lo vuelve a pedir: se
  quedaría bloqueado para siempre. El orden es siempre registro → caché. Nunca se toma un cerrojo dentro de otro
  fuera de ese orden.
- Siguen estáticos, a propósito:
  - `application_cache()`: versiones e identidades de bundles, por `ApplicationFingerprint`; se vacía con
    `invalidate_application_cache()`;
  - `projects_mutex`, el vuelo de `original_update.rs` y los cerrojos de `macos_icon.rs`.

  Un `static` nuevo para algo que dependa de la sesión de la app no se acepta: va en `AppState`.

## Procesos

- La identidad de un proceso administrado es `ManagedProcessIdentity`: `root_pid`,
  `process_group_id`, `start_time`, `fingerprint` y `profile_argument`. Un PID solo no basta, porque
  el sistema los reutiliza.
- Las señales se envían solo con `signal_instance_processes(instance, identity, force, &inventory)`
  (`processes.rs`). Comprueba la huella y la hora de inicio contra el inventario y delega en
  `platform::signal_verified_processes`. En unix señala al grupo de procesos, creado con
  `isolate_process_group`; en Windows usa `taskkill`. Nunca escribas un `libc::kill` ni un `taskkill` nuevo, y
  nunca mates por nombre de proceso.
- `ProcessInventory::capture()` enumera todo el sistema. Pasa el inventario que ya tengas y recaptura solo
  cuando el tiempo lo exige (esperar el cierre, la señal forzada, la vuelta atrás tras lanzar), con un
  comentario que lo diga. La hora de inicio de un solo PID se lee con `process_start_time`, que no enumera.
- Para detener: primero la señal ordenada, luego `wait_until_instance_stops` con plazo y solo después
  la forzada.
- `launch_generation` solo sirve para descartar eventos viejos del reaper. `spawn_process_reaper`
  emite `instance-process-exited` con la generación, aunque hoy ningún código de `src/` lo escucha.
  Los eventos de ventana se envían con `emit` (`scan-progress`). El progreso de una llamada larga va por
  `tauri::ipc::Channel<T>`, argumento del comando (`install_original_update`).

## Tres plataformas

- Lo específico de un sistema va en la fachada `src-tauri/src/platform/`:
  - `macos.rs`, `windows.rs`, `linux.rs` y `unsupported.rs` definen **las mismas funciones y constantes con la
    misma firma** (`PLATFORM_NAME`, `SHARED_INSTALLATION`, `detect_provider_source`, `copy_provider_bundle`…);
  - las señales y los grupos de procesos van en `unix.rs` y `windows.rs` (`unsupported.rs` solo fuera de unix);
  - `mod.rs` reexporta las del sistema que se compila y guarda lo portable. Por ejemplo, el parseo de Linux que se
    prueba en todas las plataformas va con `#[cfg(any(test, target_os = "linux"))]`.
- Una función de plataforma nueva va en los cuatro archivos. La de `unsupported.rs` devuelve un error explícito o
  el valor neutro. Si falta en un archivo, compila en tu máquina y se rompe en CI.
- En el dominio no se añade `#[cfg(target_os)]`, salvo para un paso que solo existe en macOS (el icono y la
  verificación de copias de `macos_icon.rs`, el nombre del bundle, el handoff de `versions/original.rs`).
- La CI comprueba Linux (`cargo test` en `validate.yml`, en cada PR). Windows solo se compila en
  `build-desktop.yml` (por tag o `workflow_dispatch`). Un cambio en `platform/windows.rs` o en un `cfg` se compila
  allí antes de fusionar.
- En macOS, los ejecutables del sistema van con ruta absoluta: `/usr/bin/plutil`, `/usr/bin/codesign`,
  `/usr/bin/ditto`, `/bin/cp` y `/usr/bin/open`. En Windows se usan `powershell.exe`, `robocopy`,
  `taskkill`, `tasklist` y `explorer.exe`; en Linux, `dpkg-query`, `apt-cache` y `xdg-open`. Los
  argumentos van como lista, nunca en una cadena de shell.
- `robocopy` sale con un código menor que 8 cuando todo va bien; no lo trates como error.
- Los instaladores se compilan en los runners nativos de `build-desktop.yml`. Lo que no puedas
  probar en tu máquina va en la entrega como «solo verificado en CI».

## Seguridad de la ventana

- `capabilities/default.json` concede solo `core:default` y los cuatro permisos de ventana. Un
  permiso o un plugin nuevo (`tauri-plugin-fs`, `-shell`…) necesita una historia que lo justifique
  y el sí del mantenedor.
- La CSP de `tauri.conf.json` y el `scope` de `assetProtocol` (solo
  `$APPDATA/managed-instances/*/branding/icon.png`) solo se amplían con una historia.
- Lo que llega del frontend no es de fiar: los ids (UUID u `ORIGINAL_INSTANCE_ID`), los nombres
  (`validate_name`) y las rutas se validan en Rust, aunque la interfaz ya lo haya hecho.

## Red y configuración

- Hay dos salidas a la red, las dos con `reqwest::blocking` y rustls, sin cookies y sin identificadores
  (`device_id` nulo en el feed): el feed oficial (5 s, sin redirecciones, 256 KiB) y, solo cuando la persona
  pulsa «Descargar e instalar» en macOS, el host del paquete (`https_only`, host exacto de
  `config::download_hosts()`, hasta 3 redirecciones a hosts permitidos, `size` del feed como tope, 60 s sin
  bytes, 30 min en total, cancelable). En `blocking`, `timeout` es por lectura. No se añade otra conexión ni
  telemetría sin una historia y la autorización del mantenedor.
- Ninguna URL, host ni identificador de servicio en `.rs` fuera de `src-tauri/src/config.rs`, que los recibe al
  compilar desde `.env.example` vía `build.rs` (`env!`). Una clave nueva: su ficha `[PUBLICO]` en `.env.example`,
  su nombre en `KEYS` de `build.rs` y su validación en `config::validate()`. Nada de `std::env::var` en
  ejecución; se exceptúan las variables de ubicación del sistema operativo de la sección de sistema de archivos.
- **El gate de configuración no revisa `.rs`**: la regla la cumples tú. El `User-Agent` es
  `config::user_agent()`.

## Pruebas

- Viven en el `#[cfg(test)] mod tests` de cada módulo, con `use super::*;` y `use crate::test_support::*;`.
  Usan `test_managed_paths(root)` y `test_instance(root)` sobre una raíz temporal única
  (`env::temp_dir().join(format!("code-ai-<caso>-{}", Uuid::new_v4()))`) que se borra al terminar.
  Un ayudante que comparten varios módulos va a `test_support.rs`.
- Lo que usa estado construye el suyo (`AppState::default()`, `RegistryLock::default()`). Nunca
  dependen de un estado global.
- Una prueba de red solo abre `127.0.0.1` (un servidor de un solo uso o un puerto cerrado). Nunca un
  host real.
- Se prueban la lógica pura (parsing, versiones, alcance del refresco) y toda operación destructiva o
  sobre el sistema de archivos, incluido el caso de que falle a mitad de camino.
- Lo que depende de la plataforma se prueba con `#[cfg(target_os = …)]` en la propia prueba.
- Para iterar, filtra por nombre: `cargo test --manifest-path src-tauri/Cargo.toml -q <filtro>`. Al entregar, todas.

## Lo que nunca

- `remove_dir_all` o `rename` sobre una ruta que no salió de `ManagedPaths`, del registro o de
  `detect_original_profile`, porque son los datos reales del perfil. La única excepción es `original_update.rs`:
  renombra la original que devuelven `detect_provider_source` y `prepare_destination`, y solo borra sus carpetas
  `.code-ai-profiles-original-<uuid>` y `<app_data>/original-update/<uuid>` cuando la original está en su sitio.
- Copiar, mover o devolver sesiones con un perfil en marcha: la aplicación las tiene abiertas y la
  copia sale corrupta.
- Leer, registrar o devolver por IPC contenido de un perfil (credenciales, cookies, prompts,
  transcripts). Es la promesa central del producto.
- Bloquear el runtime async con E/S síncrona.

## Lo que no se toma prestado

- **No es un servidor**: nada de axum, actix, REST ni Swagger. El «endpoint» es un `#[tauri::command]`.
- **No es Tauri 1**: no hay `allowlist` (son capabilities), ni `tauri::api::*`, ni
  `@tauri-apps/api/tauri` (ahora es `@tauri-apps/api/core`).
- **No es Electron**: no hay `ipcMain` ni Node en el renderer.
- `anyhow`/`thiserror` (el error interno es `AppError`, escrito a mano y sin dependencias; por el IPC solo cruza
  `String`) o `tokio::fs` (aquí, `std::fs` en `spawn_blocking`).

## Verificación

`cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` y `cargo test --manifest-path
src-tauri/Cargo.toml -q`. Si cambió `src/types.ts` o `src/lib/bridge.ts`, también `pnpm build`.
La suite completa la corre el orquestador (`node .metodo/scripts/pruebas.mjs suite`).

## Skills relacionadas

`code-ai-profiles-configuracion` · `code-ai-profiles-pruebas` · `code-ai-profiles-frontend-react-vite` (el lado del contrato).
