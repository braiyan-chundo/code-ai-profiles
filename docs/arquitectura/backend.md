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
| Host del paquete (`CAP_UPDATE_DOWNLOAD_HOSTS`) | Solo cuando la persona pulsa «Descargar e instalar» | `https_only`, host exacto, sin `Referer`, hasta 3 redirecciones a hosts permitidos, `size` del feed como tope (lee `size + 1` como mucho), 15 s de conexión, 60 s sin bytes, 30 min en total, cancelable |

En `reqwest::blocking` 0.13, `ClientBuilder::timeout` se aplica a la espera de la respuesta y a **cada lectura**
por separado (`blocking/response.rs`, `impl Read`). Por eso funciona como plazo «sin bytes». El plazo total lo
vigila el bucle de `stream_to_file`.

Una salida nueva necesita una historia y el sí del mantenedor.

## Escribir sobre la aplicación original (macOS)

Es la única excepción a «la original no se toca», y solo por la acción explícita de la persona:

- Antes de tocar nada se verifica la instalada y el paquete:
  - La instalada: `codesign --verify --deep --strict`, TeamIdentifier presente y *designated requirement*
    explícito. Una firma ad hoc (`# designated => cdhash …`) se rechaza.
  - El paquete: tamaño, `sha256`, `zipinfo -1`/`-t` (una raíz `<X>.app/`, sin `..` ni rutas absolutas, ≤ 100 000
    entradas, descomprimido ≤ min(8·size, 4 GiB)), `ditto -x -k`, symlinks relativos e internos, sin archivos
    especiales, `-R=<requisito de la instalada>` con `--deep`, mismo TeamIdentifier, Gatekeeper, bundle id y versión.
- El preparado se hace en `<padre>/.code-ai-profiles-original-<uuid>/` (modo `0700`, en el mismo volumen), con un
  cerrojo `.lock` (`fs2`). El paquete se descarga en `<app_data>/original-update/<uuid>/`, también con su cerrojo.
- El intercambio usa `renamex_np(RENAME_SWAP)`. Si el volumen no lo admite (`ENOTSUP`/`EINVAL`), se hacen dos
  `rename` con la anterior en `previous/`, y lo rechazado va a `failed/`. La nueva se valida en su sitio con
  `codesign --verify --strict -R=<requisito>`, versión y bundle id; si falla, se vuelve a la anterior.
- Si también falla la vuelta atrás, se escribe la marca `rollback-failed` y la carpeta se conserva entera: ni la
  limpieza ni la recuperación la tocan. El mensaje dice dónde está la anterior.
- Nunca se pide privilegio. Una original de otro usuario o del sistema se rechaza.
- Con un proceso cuyo ejecutable está dentro del bundle no se instala. Se comprueba de nuevo justo antes del
  intercambio, dentro de `with_registry_operation`.
- Los temporales se borran siempre (`Drop`). `recover_original_update_leftovers` corre en `setup` y al empezar cada
  instalación. Solo toca directorios del usuario actual, que no sean symlinks, con el nombre exacto
  (`.code-ai-profiles-original-<uuid en minúsculas>` o `<uuid>` en las descargas) y cuyo cerrojo nadie tenga.
  Devuelve `previous/` si falta la original. Si no puede devolverla, no borra nada.
- Una sola operación a la vez. Mientras dura, el handoff «Actualizar original» la rechaza.

## Copias administradas con icono personalizado (macOS · HU-0020)

`--strict` sigue siendo la regla para la original, la descarga de la HU-0017, el handoff y toda copia sin icono. La
única excepción son las copias administradas con el icono de Finder puesto (`Icon\r` y `com.apple.FinderInfo` en la
raíz). Se validan con `verify_managed_bundle` (`src-tauri/src/macos_icon.rs`):

- `codesign --verify --deep --strict=symlinks -R =<DR de la original>`. Deja fuera solo la comprobación de
  *sideband*, que es la que rompe el icono.
- El CDHash, el bundle id y el Team ID registrados en `ProviderProvenance`.
- Un barrido sin seguir symlinks: ningún FinderInfo ni ResourceFork fuera de la raíz y de `Icon\r`.
- La raíz contiene solo `Contents` e `Icon\r`, y este es un archivo regular, de 0 bytes y sin bits de ejecución.

`managed_fingerprint` ya no es puerta: depende de la ruta y de un hash que no es estable entre versiones de Rust.

El CDHash se registra solo en `register_clean_provenance`, que exige forma limpia, `--strict -R =<DR de la
original>` y el mismo bundle id y Team ID que la original. Una copia con icono conserva la provenance que tenía y
nunca registra. La provenance de la donante tampoco se hereda al sincronizar: se registra de nuevo sobre el bundle
nuevo, también en la sincronización encadenada de la HU-0017.

La raíz de confianza es la original instalada (`--strict`, con caché por fingerprint). El DR implícito
(`cdhash H"…"`) se admite por paridad y para los fixtures ad hoc de las pruebas.

- **Al copiar** (crear o sincronizar), el icono heredado se quita en la copia nueva (`strip_inherited_icon`, sin
  NSWorkspace). En la sincronización, la copia de *staging* pasa `--strict -R =<DR>`, bundle id y Team ID antes
  del swap. La original se localiza antes de copiar; sin ella, macOS no sincroniza.
- **Al lanzar** una copia con `customIcon` (`launch_preflight`, con la instancia detenida y dentro de
  `with_registry_operation`):
  - con icono: la comprobación equivalente, o no se lanza;
  - limpia: se registra y se reaplica el icono;
  - sin la original, una copia con icono no se lanza.
  Las copias sin `customIcon` se lanzan como antes, sin comprobación.
- **En la topología**, las copias limpias sin provenance siguen con la identidad en caché. Las donantes y toda
  escritura usan la comprobación sin caché.
- **`setIcon`** solo acepta rutas dentro de `ManagedPaths.instances`, va en serie con un mutex del proceso y repite
  hasta tres veces, con 150 ms entre intentos, cuando devuelve `false`. Después de un `setIcon` correcto siempre se
  ejecuta la comprobación equivalente.
- **«Gestión de apps»:** un `EPERM` al escribir en el bundle (sonda sobre `Icon\r` con `O_NOFOLLOW` tras un
  `setIcon` rechazado, o al quitarlo a mano) se clasifica así (`CustomIcon.systemIssue`). El permiso nunca se
  consulta ni se pide de antemano. Mientras siga ese estado, ni el lanzamiento ni la sincronización reintentan: solo
  el comando `reapply_instance_icon`.
- **Copias heredadas re-firmadas ad hoc** (`provider_signature_preserved=false`): no admiten icono. Ver la revisión
  técnica de la HU-0020 (R-3) sobre su sincronización.

## Progreso hacia la interfaz

- El progreso de una operación larga ligada a una llamada va por `tauri::ipc::Channel<T>`, argumento del comando.
  En TypeScript el `Channel` se crea solo en `src/lib/bridge.ts`.
- `emit` se reserva para eventos de ventana que no pertenecen a una llamada (`scan-progress`,
  `instance-process-exited`).
