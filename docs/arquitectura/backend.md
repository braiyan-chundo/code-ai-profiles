# Arquitectura del backend (Rust + Tauri)

Las reglas generales están en la skill `code-ai-profiles-rust-tauri`. Este documento recoge lo que cambia desde la
HU-0017 y manda sobre la skill hasta que esta se regenere.

## Módulos (ADR-0002)

| Archivo | Qué contiene |
| --- | --- |
| `src-tauri/src/lib.rs` | Tipos serde, comandos IPC, lógica general y `run()` |
| `src-tauri/src/config.rs` | El único sitio con URLs y hosts. Se fija al compilar desde `.env.example` (A-8 de HU-0017) |
| `src-tauri/src/original_update.rs` | Descargar, verificar e instalar la original en macOS. La capa `MacosTools` es inyectable en las pruebas |
| `src-tauri/src/official_release.rs` | Versión objetivo de la original (HU-0024): lee `RELEASES.json`, confirma su paquete con el feed (misma versión y misma URL) y resuelve cuál de las dos fuentes manda. Funciones puras más un GET |
| `src-tauri/src/projects.rs` (+ `projects/{method,tech,git,tests}.rs`) | Proyectos anclados con la metodología v4 (HU-0023): registro `projects.json`, `ReadContext`, lectura del método, manifiestos y `.git`. Ver § Proyectos anclados |
| `src-tauri/Info.plist` | Textos de los avisos de TCC (`NS*FolderUsageDescription`). Tauri lo fusiona al empaquetar en macOS. No pide permisos |
| `src-tauri/build.rs` | Pasa las claves `CAP_*` (del entorno, `.env.local` o `.env.example`) a `cargo:rustc-env` |

Un comando nuevo sigue yendo en `lib.rs` como envoltorio fino. Su lógica puede vivir en un módulo hijo si es un
flujo autocontenido.

## Configuración

- Ninguna URL, host ni identificador de servicio en `.rs` fuera de `config.rs`. Las pruebas pueden usar URLs de
  ejemplo.
- En ejecución no se lee ninguna variable propia (`std::env::var`). Solo se leen las de ubicación del sistema
  operativo (`APPDATA`, `LOCALAPPDATA`, `XDG_CONFIG_HOME`).
- `config::validate()` corre en `setup`: si un valor no tiene el formato esperado, la app no arranca y dice cuál.
- Hay dos clases de enlace (HU-0022). Las URLs de red son `https` y se validan con `validate_https_url`. Los enlaces
  de Ajustes del Sistema (`CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL` y `CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL`, de
  tipo `[PUBLICO]`) se validan con `validate_settings_url`: prefijo exacto `x-apple.systempreferences:` y, después,
  solo `[A-Za-z0-9._?=&-]`. Se compilan en las tres plataformas, pero solo macOS las usa. Si macOS renombra un
  ancla, se corrige en `.env.example` sin tocar el código.
- El `User-Agent` es `Code-AI-Profiles/<CARGO_PKG_VERSION>`.

## Red

Hay tres salidas, y ninguna lleva cookies, credenciales ni identificadores (el `device_id` es el UUID nulo):

| Destino | Cuándo | Límites |
| --- | --- | --- |
| Feed oficial (`CAP_UPDATE_FEED_URL`) | Comprobación de versión (caché de 6 h) y antes de instalar | 5 s, sin redirecciones, 256 KiB |
| Publicación oficial (`CAP_UPDATE_RELEASES_URL`, solo macOS · HU-0024) | Comprobación de versión (misma caché) y antes de instalar | Igual que el feed; sin query. El feed se pregunta entonces también con la versión publicada para confirmar su paquete |
| Host del paquete (`CAP_UPDATE_DOWNLOAD_HOSTS`) | Solo cuando la persona pulsa «Instalar» (antes «Descargar e instalar») | `https_only`, host exacto, sin `Referer`, hasta 3 redirecciones a hosts permitidos, `size` del feed como tope (lee `size + 1` como mucho), 15 s de conexión, 60 s sin bytes, 30 min en total, cancelable |

La versión objetivo en macOS (HU-0024) sale de `official_release::resolve_official_target`: si `RELEASES.json`
anuncia una versión mayor que la instalada y que el feed, el feed se pregunta por ella y su paquete solo vale con la
**misma versión y la misma URL** (comparadas ya parseadas). Si no se confirma, manda el feed con un aviso
(`warning`). Como mucho 3 GET por comprobación y otros 3 al pulsar «Instalar», que vuelve a resolver y rechaza si la
versión ya no es la mostrada. La URL de `RELEASES.json` sale de la configuración (https) y no se contrasta con
`CAP_UPDATE_DOWNLOAD_HOSTS`; la del paquete, sí.

`source-update-cache.json` lleva `schema: 2`; una caché con otro valor no se usa ni para pintar. Un resultado con
`warning` solo cuenta como fresco 30 min para volver a consultar (6 h sin aviso); para pintar el panel vale como
siempre. No hay reintentos automáticos: el siguiente arranque, el sondeo de 6 h o la vuelta del canal oficial.

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

Excepción (autoactualización de Claude): si en una copia con icono solo difiere el CDHash (el paso 4) y la versión
es estrictamente mayor que `provider_version` (numérica, con el sello y el requisito de la original ya
verificados), `check_iconized` devuelve `IconizedSelfUpdated { version }`. `launch_preflight` re-registra la
provenance (`refresh_provenance_after_self_update`) y guarda el registro sin reaplicar el icono; la misma versión
con otro CDHash o una menor sigue rechazada (CodeHash). La topología solo lee: la copia vale como donante sin
escribir nada.

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

## Ajustes del Sistema y cuenta (macOS · HU-0022)

- `open_system_settings(panel)` recibe solo el enum `SystemSettingsPanel` (`appManagement` o `filesAndFolders`),
  nunca una URL. Abre la URL que `config` validó con `/usr/bin/open <url>`: argumentos en lista, sin shell y dentro
  de `spawn_blocking`. Si `open` sale mal, devuelve un error. En Windows y Linux devuelve
  `Err("Esta plataforma no tiene ese panel de ajustes.")`. La interfaz no enseña el mensaje de Rust, sino la ruta
  del panel de su catálogo.
- `get_account_facts()` devuelve siempre `Ok(AccountFacts { admin })`. En macOS, `admin` es `Some` según si
  `/usr/bin/id -Gn` incluye exactamente `admin`, o `None` si `id` falla. Fuera de macOS es siempre `None`. La salida
  de `id` no se guarda, no se registra y no cruza el IPC.
- **Ningún comando consulta un permiso de TCC.** «Gestión de apps» sale de `CustomIcon.systemIssue` y «Archivos y
  carpetas» nunca se comprueba: comprobarlo dispararía el aviso. Abrir Ajustes del Sistema e `id` no disparan avisos.
- Las pruebas solo cubren las funciones puras (`system_settings_url`, `groups_include_admin`, el enum y la
  serialización). **Ninguna llama a `open_system_settings_sync` ni a `account_facts_sync`**, porque abrirían Ajustes
  en la máquina de quien las corre.

## Proyectos anclados (HU-0023)

Reglas de negocio: RN-02 a RN-04 (`docs/producto/reglas/proyectos.md`). El detalle está en
`hu/HU-0023-…/arquitectura.md` (A-1 a A-6) y en su `revision-tecnica.md`.

**Contrato IPC (aditivo, 0.x).** Los envoltorios están en `lib.rs`, con `spawn_blocking`. El espejo literal está en
`src/types.ts` y `src/lib/bridge.ts`.

| Comando | Argumentos | Devuelve |
| --- | --- | --- |
| `list_projects` | — | `ProjectsState` (todos los anclados, en el orden en que se guardaron) |
| `read_project` | `id` | `ProjectSummary`, o `Err("El proyecto ya no está anclado.")` |
| `pick_project_folder` | — | `ProjectCandidate \| null`: el selector nativo con `main` de padre; inspecciona sin anclar |
| `pin_project` | `path` | `ProjectSummary`: vuelve a validar en Rust y es idempotente por ruta canónica |
| `unpin_project` | `id` | `null`: borra solo la entrada; es idempotente |
| `open_project_folder` | `id` | `null`: la ruta sale del registro, nunca del frontend |

Un proyecto roto es un **estado** (`notFound`, `notDirectory`, `noConfig`, `notV4`, `configBroken`,
`permissionDenied`, `forbidden`), con un `message` en español que la UI enseña tal cual. `Err(String)` queda para
fallos reales: el registro dañado, un id desconocido, el selector o el gestor de archivos. `info` existe solo con
`status === "v4"`.

**Lectura (solo lectura, sin ejecutar nada y sin red).**

- Toda lectura de la carpeta pasa por `ReadContext::{entry, list_dir, read}`. Cada una canonicaliza, exige que la ruta
  quede dentro de la raíz canónica y fuera de la lista de exclusión, y se niega con un `Skip` (que se convierte en un
  aviso con la ruta relativa, nunca con el contenido).
  - `read` exige además un archivo regular, salta los de la nube y lee con tope (`Whole`, `Head` o `Tail`).
  - Las rutas del método se unen con `join_relative`, que rechaza `..`, las rutas absolutas y los componentes con `:`.
- **Una ruta que ya es léxicamente de fuera no se toca en disco**: ni `canonicalize`, ni `stat`. Así se evita la red
  encubierta (SMB/UNC en Windows, volúmenes montados) y el aviso de TCC de una carpeta que la persona no eligió.
  `lexical_repo_path` decide la `ruta` de cada repo sin tocar el disco (R-1 de la revisión de la HU-0023), y
  `ReadContext::resolve` recorre los componentes con `symlink_metadata` sin seguir un enlace que salga de la carpeta.
- **Lista de exclusión**: `<home>/.claude`, `app_data_dir` y `detect_original_profile()`. Se compara de forma léxica
  antes de tocar nada y otra vez sobre la ruta canónica. Ni la raíz ni un repo ni un archivo pueden caer dentro. Si se
  ancla una carpeta que contiene una de ellas (p. ej. `home`), se leen solo las rutas del método.
- **Archivos en la nube**: los *dataless* de iCloud (`SF_DATALESS`) y los de OneDrive (`OFFLINE`, `RECALL_ON_OPEN`,
  `RECALL_ON_DATA_ACCESS`) dan `Skip::Cloud` y no se leen. Lo mismo vale para listar una carpeta *placeholder* (R-2 de
  la revisión).
- **Topes**: config y JSON 1 MiB; frontmatter 64 KiB; métricas 2 MiB; bitácora, los últimos 1 MiB; manifiestos
  512 KiB; `packed-refs` 8 MiB; reflog, los últimos 64 KiB; 2000 historias, 32 repos y 100 anclados. Los textos que
  llegan a la UI van sin caracteres de control y con 200, 1000 o 120 caracteres como máximo.
- **Git**: solo `HEAD`, la ref suelta o `packed-refs` y la última línea del reflog. No se leen objetos y no se ejecuta
  `git`. Del reflog se toman el SHA nuevo y la fecha; **el nombre, el correo y el mensaje se descartan al parsear**.
  Si `.git` es un archivo (worktree o submódulo), es `unsupported` y no se sigue.
- **Métricas**: se suman `agentes[].tokens` y `orquestador.porFase[].tokens` (igual que `totales.tokens`), más
  `minutosTotales`. Solo suman las historias **terminadas** con métricas válidas (`countsInTotals`). Las descartadas
  conservan sus cifras en su fila. No se leen transcripciones.
- **En `projects/*` está prohibido**: `Command::new`, `fs::write`, `OpenOptions`, `println!`, `unwrap` y `expect`.
  La única escritura es `write_json_atomic` sobre `app_data`.

**Registro `<app_data>/projects.json`** (`{ version: 1, projects: [{ id, path, lastName, pinnedAt, lastReadAt }] }`):

- `path` es la ruta canónica sin `\\?\`. La misma carpeta (sin distinguir mayúsculas en macOS y Windows) conserva su
  UUID.
- `write_json_atomic` escribe un temporal `.projects-<uuid>.tmp` en la misma carpeta, hace `sync_all` y `rename`, y
  borra el temporal si algo falla. No se usan `save_registry` ni `atomic_replace_file`.
- `projects_mutex` es propio (no es `with_registry_operation`). Las lecturas de carpetas van fuera del cerrojo; dentro
  se relee, se aplica y se guarda, y solo si algo cambió.
- Un archivo dañado, un `version ≠ 1` o un id que no es UUID dan `Err` y **no se sobrescriben**. Si falta, la lista
  está vacía.
- No se guardan cifras, historias ni personas.

**Permisos y plataformas.**

- No hay sandbox ni *entitlements*. En macOS manda TCC: leer en Escritorio, Documentos, Descargas, iCloud Drive o
  `/Volumes/*` puede mostrar el aviso del sistema.
  - `protectedLocation` se calcula por prefijo, sin listar.
  - Un `EPERM` en la raíz o en la config da `permissionDenied`. **Nunca se consulta ni se pide el permiso de
    antemano.**
  - La lista se lee al arrancar (pregunta 3, confirmada por el mantenedor al cerrar). Con la firma ad hoc, los avisos
    vuelven tras cada actualización (R-6 de la revisión, deuda declarada).
- En Windows, `canonicalize` añade `\\?\`: `comparable` lo quita para comparar y `stored_path` para guardar. En Linux,
  las rutas distinguen mayúsculas.
- `open_project_folder` usa `open_in_file_manager`, extraído de `open_instance_folder`: `/usr/bin/open`,
  `explorer.exe` o `xdg-open`.

**`tauri-plugin-dialog` (2.7.3, fijado por `Cargo.lock`).**

- Solo se usa desde Rust: `app.dialog().file().blocking_pick_folder()` dentro de `spawn_blocking`.
- No hay paquete npm ni permiso en `capabilities/`. Sus comandos `open`, `save` y `message` existen, pero el webview
  no los puede llamar.
- Arrastra `rfd` (GTK3 en Linux, sin portal ni `zbus`) y `tauri-plugin-fs` como crate sin registrar.
- **Efecto lateral:** su `init-iife.js` reemplaza `window.alert` y `window.confirm` en cada página. Ver la regla del
  frontend.
- No se sube de versión sin comprobar `cargo tree -i tauri`, porque 2.8 arrastra tauri 2.12.

**Pruebas.** `#[cfg(test)] mod tests` en `projects/tests.rs`, con fixtures en `env::temp_dir()` y `ProjectEnv`
inyectable (`home`, exclusión y topes). Ninguna prueba abre el selector ni lee carpetas reales de la persona.

## Progreso hacia la interfaz

- El progreso de una operación larga ligada a una llamada va por `tauri::ipc::Channel<T>`, argumento del comando.
  En TypeScript el `Channel` se crea solo en `src/lib/bridge.ts`.
- `emit` se reserva para eventos de ventana que no pertenecen a una llamada (`scan-progress`,
  `instance-process-exited`).
