# Arquitectura del backend (Rust + Tauri)

Las reglas generales están en la skill `code-ai-profiles-rust-tauri`. Este documento recoge lo que cambia desde la
HU-0017 y manda sobre la skill hasta que esta se regenere.

## Módulos (ADR-0002)

| Archivo | Qué contiene |
| --- | --- |
| `src-tauri/src/lib.rs` | Tipos serde, comandos IPC, lógica general y `run()` |
| `src-tauri/src/config.rs` | El único sitio con URLs y hosts. Se fija al compilar desde `.env.example` (A-8 de HU-0017) |
| `src-tauri/src/original_update.rs` | Descargar, verificar e instalar la original en macOS. La capa `MacosTools` es inyectable en las pruebas |
| `src-tauri/build.rs` | Pasa las claves `CAP_*` (del entorno, `.env.local` o `.env.example`) a `cargo:rustc-env` |

Un comando nuevo sigue yendo en `lib.rs` como envoltorio fino. Su lógica puede vivir en un módulo hijo si es un
flujo autocontenido.

## Configuración

- Ninguna URL, host ni identificador de servicio en `.rs` fuera de `config.rs`. Las pruebas pueden usar URLs de
  ejemplo.
- En ejecución no se lee ninguna variable propia (`std::env::var`). Solo se leen las de ubicación del sistema
  operativo (`APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`).
- `config::validate()` corre en `setup`: si un valor no tiene el formato esperado, la app no arranca y dice cuál.
- El `User-Agent` es `Code-AI-Profiles/<CARGO_PKG_VERSION>`.

## Red

Hay dos salidas, y ninguna lleva cookies, credenciales ni identificadores (el `device_id` es el UUID nulo):

| Destino | Cuándo | Límites |
| --- | --- | --- |
| Feed oficial (`CAP_UPDATE_FEED_URL`) | Comprobación de versión (caché de 6 h) y antes de instalar | 5 s, sin redirecciones, 256 KiB |
| Host del paquete (`CAP_UPDATE_DOWNLOAD_HOSTS`) | Solo cuando la persona pulsa «Descargar e instalar» | `https`, host exacto, hasta 3 redirecciones a hosts permitidos, `size` del feed como tope, 15 s de conexión, 60 s sin bytes, 30 min en total, cancelable |

Una salida nueva necesita una historia y el sí del mantenedor.

## Escribir sobre la aplicación original (macOS)

Es la única excepción a «la original no se toca», y solo por la acción explícita de la persona:

- Antes de tocar nada se verifica el paquete: tamaño, `sha256`, zip sin rutas que escapen, symlinks internos,
  *designated requirement* y TeamIdentifier de la instalada, Gatekeeper, bundle id y versión.
- El preparado se hace en `<padre>/.code-ai-profiles-original-<uuid>/` (modo `0700`, en el mismo volumen). El
  intercambio usa `renamex_np(RENAME_SWAP)`; si el volumen no lo admite, dos `rename` con `previous/`. La nueva se
  valida después y, si falla, se vuelve a la anterior.
- Nunca se pide privilegio. Una original de otro usuario o del sistema se rechaza.
- Con un proceso cuyo ejecutable está dentro del bundle no se instala. Se comprueba de nuevo justo antes del
  intercambio, dentro de `with_registry_operation`.
- Los temporales se borran siempre. `recover_original_update_leftovers` corre en `setup`: devuelve `previous/` si
  falta la original y solo toca directorios propios con ese prefijo exacto.
- Una sola operación a la vez. Mientras dura, el handoff «Actualizar original» la rechaza.

## Progreso hacia la interfaz

- El progreso de una operación larga ligada a una llamada va por `tauri::ipc::Channel<T>`, argumento del comando.
  En TypeScript el `Channel` se crea solo en `src/lib/bridge.ts`.
- `emit` se reserva para eventos de ventana que no pertenecen a una llamada (`scan-progress`,
  `instance-process-exited`).
