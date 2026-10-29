---
name: code-ai-profiles-rust-tauri
description: Cómo se escribe la capa Rust de Code AI Profiles con Tauri 2 - comandos IPC, contrato con el frontend, sistema de archivos, procesos, rutas por plataforma, capacidades, red y pruebas con cargo. Cárgala antes de editar src-tauri/, añadir un comando IPC o tocar src/types.ts o src/lib/bridge.ts.
---

# Rust + Tauri 2 · Code AI Profiles

<!-- Pack rust-tauri, forjado el 2026-10-27 desde la documentación de Tauri 2 y src-tauri/ (edition 2021,
     reqwest 0.13 blocking + rustls, sysinfo 0.37). Revisado por architect el 2026-10-27 (HU-0011). -->
## La regla de oro

**Lo que tocas son datos reales del usuario.** Antes de copiar, mover, reemplazar o borrar compruebas
que el id es un UUID (`ManagedPaths::root_for`) o `ORIGINAL_INSTANCE_ID`, que la ruta sale de
`resolve_transfer_profile`, del registro o de `ManagedPaths`, y que el perfil está **detenido**. La
operación tiene vuelta atrás: copia de respaldo o `atomic_replace_file`. Un `remove_dir_all` sobre
una ruta mal calculada borra el perfil de alguien.

## La estructura

```text
src-tauri/
  src/main.rs            solo llama a code_ai_profiles_lib::run(); windows_subsystem en release
  src/lib.rs             tipos serde, comandos, lógica, rutas por plataforma y #[cfg(test)] mod tests al final
  src/config.rs          URLs y hosts fijados al compilar desde .env.example (ADR-0002); validate() en setup
  src/original_update.rs descargar, verificar e instalar la original en macOS (HU-0017); MacosTools inyectable
  build.rs               pasa las claves CAP_* (entorno > .env.local > .env.example) a cargo:rustc-env
  capabilities/*.json    permisos de la ventana "main" (mínimos)
  tauri.conf.json        CSP, assetProtocol con scope estrecho, ventana base (Windows: sin decoraciones)
  tauri.<os>.conf.json   ventana de macOS (Overlay) y de Linux (decoraciones nativas), bundles
src/types.ts             el contrato en TypeScript: refleja los structs serde
src/lib/bridge.ts        el único sitio que llama a invoke() y crea Channel; con mock para el modo navegador
```

`lib.rs` es el archivo principal: lo nuevo va junto a sus vecinos. Un flujo largo y autocontenido puede vivir en
un módulo hijo (`mod x;` en `lib.rs`, `use super::*`), con sus comandos como envoltorios finos en `lib.rs`
(ADR-0002, `docs/arquitectura/backend.md`). Partir el resto lo decide un ADR del architect.

## Añadir un comando IPC

1. El tipo: `#[derive(Serialize, Deserialize)]` con `#[serde(rename_all = "camelCase")]`. Los enums
   simples usan `"lowercase"`. El mismo tipo va a `src/types.ts`, campo por campo.
2. La lógica, en una función síncrona `<nombre>_sync(app: &AppHandle, …) -> Result<T, String>`.
3. El comando es un envoltorio fino:
   ```rust
   #[tauri::command]
   async fn stop_instance(app: AppHandle, id: String) -> Result<DashboardState, String> {
       let worker_app = app.clone();
       tauri::async_runtime::spawn_blocking(move || stop_instance_sync(&worker_app, &id))
           .await
           .map_err(|error| format!("El cierre terminó inesperadamente: {error}"))??;
       dashboard_from_scope_async(app, RefreshScope::LIGHT, "La actualización del panel").await
   }
   ```
   La E/S bloqueante (fs, `Command`, reqwest blocking) va en `spawn_blocking`, nunca en el hilo async.
4. Si el comando muta el registro, lo envuelves en `with_registry_operation(|| …)`, que serializa
   las operaciones con un mutex.
5. Lo registras en `tauri::generate_handler![…]` dentro de `run()`.
6. En `bridge.ts`: una función tipada que llama a `invoke` y su rama mock para cuando
   `window.__TAURI_INTERNALS__` no existe (Vite en el navegador).
7. Si el comando cambia el panel, devuelve `DashboardState` con el `RefreshScope` más estrecho que
   sirva. Así el frontend no tiene que volver a pedirlo.

## Errores

- Por IPC cruza `Result<T, String>`. El `String` es un **mensaje para la persona, en español**, que
  dice qué falló y qué hacer («Detén la instancia antes de eliminarla.»). El código, los nombres y los
  logs van en inglés.
- `map_err(|error| format!("No se pudo <acción>: {error}"))` en cada `?` que cruza una frontera
  (fs, proceso, red, serde).
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
- Los enlaces de sesión, la caché del feed y los índices de sesión se reemplazan con
  `atomic_replace_file`: escribe a un `.tmp`, aparta el anterior y lo restaura si falla. El registro
  (`save_registry`) todavía usa `fs::write`: es deuda conocida. Lo nuevo usa `atomic_replace_file`.
- `canonicalize` antes de comparar rutas o de decidir que algo está «dentro» de una raíz.
- Al persistir el registro no se guardan las sesiones (`code_sessions.clear()`). Solo se guardan
  metadatos: nunca prompts, respuestas, transcripts, cookies ni tokens de un perfil.

## Procesos

- La identidad de un proceso administrado es `ManagedProcessIdentity`: `root_pid`,
  `process_group_id`, `start_time`, `fingerprint` y `profile_argument`. Un PID solo no basta, porque
  el sistema los reutiliza.
- Las señales se envían solo con `signal_instance_processes`. Antes de señalizar comprueba la huella
  y la hora de inicio, y en unix señala al grupo de procesos (`process_group(0)`). Nunca escribas un
  `libc::kill` ni un `taskkill` nuevo, y nunca mates por nombre de proceso.
- Para detener: primero la señal ordenada, luego `wait_until_instance_stops` con plazo y solo después
  la forzada.
- `launch_generation` solo sirve para descartar eventos viejos del reaper. `spawn_process_reaper`
  emite `instance-process-exited` con la generación, aunque hoy ningún código de `src/` lo escucha.
  Los eventos de ventana se envían con `emit` (`scan-progress`). El progreso de una llamada larga va por
  `tauri::ipc::Channel<T>`, argumento del comando (`install_original_update`).

## Tres plataformas

- Cubres las tres plataformas, con `#[cfg(target_os = …)]` o con `#[cfg(unix)]` + `#[cfg(target_os =
  "windows")]`, y una rama `#[cfg(not(any(…)))]` que devuelve un error explícito. Si falta una rama,
  compila en tu máquina y se rompe en CI.
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

- Viven en `#[cfg(test)] mod tests`, al final de `lib.rs`. Usan `test_managed_paths(root)` y
  `test_instance(root)` sobre una raíz temporal única
  (`env::temp_dir().join(format!("code-ai-<caso>-{}", Uuid::new_v4()))`) que se borra al terminar.
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
- `anyhow`/`thiserror` en la frontera IPC (solo cruza `String`) o `tokio::fs` (aquí, `std::fs` en `spawn_blocking`).

## Verificación

`cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` y `cargo test --manifest-path
src-tauri/Cargo.toml -q`. Si cambió `src/types.ts` o `src/lib/bridge.ts`, también `pnpm build`.
La suite completa la corre el orquestador (`node .metodo/scripts/pruebas.mjs suite`).

## Skills relacionadas

`code-ai-profiles-configuracion` · `code-ai-profiles-pruebas` · `code-ai-profiles-frontend-react-vite` (el lado del contrato).
