# Arquitectura · HU-0017 · Descargar e instalar la original en macOS

## Análisis

Confianza: **media-alta**. El pipeline (feed → descarga → verificación → intercambio → sincronización) es viable
sin privilegios y reutiliza piezas que ya existen. Lo único que no se puede probar hoy es una actualización real:
el feed ofrece la misma versión que hay instalada (pendiente humano de la historia).

Leído: `hu.md`, `seguimiento.md`, `docs/actualizaciones.document.md`, `docs/arquitectura/frontend.md`,
`src-tauri/src/lib.rs` (feed, caché, topología, sincronización, swap/rollback, handoff, inventario de procesos,
identidad de firma), `src/types.ts`, `src/lib/bridge.ts`, `src/features/updates/*`, `src/app/routes/original/`,
`src/app/providers/DashboardRuntime.tsx`, las revisiones técnicas de HU-0015 (R-1) y HU-0016, las skills
`code-ai-profiles-rust-tauri` y `code-ai-profiles-configuracion`, y `graphify query` del área.

Comprobado el 2026-10-28 (solo metadatos, UUID nulo):

- El feed `darwin/universal` devuelve `{currentRelease, releases:[{version, updateTo:{version, url, sha256, size, …}}]}`.
  Hoy `url` = `https://downloads.claude.ai/releases/darwin/universal/3.6556.2/Claude-<hash>.zip`, `size` = 378 072 300.
- `HEAD` sobre esa URL: `200` directo, sin redirección ni `set-cookie`, `content-type: application/zip`.
- El índice central del zip (leído con un `Range` sobre la cola, sin bajar el paquete): 5 202 entradas, **una sola
  raíz `Claude.app/`**, 14 symlinks internos (frameworks: `Versions/Current`, …), sin `__MACOSX`, sin `..` ni rutas
  absolutas, 946 MB descomprimido (2,5× el zip). `/Applications/Claude.app` ocupa 913 MB.
- `/Applications` es `root:admin drwxrwxr-x`; la persona es admin, así que puede renombrar dentro sin `sudo`.
  `Claude.app` es suya. Un usuario no admin no podrá: error claro (D-3/AC-03).
- `libc 0.2.186` expone `renamex_np` y `RENAME_SWAP` en macOS. `sha2 0.10.9` ya está en `Cargo.lock` (transitiva).
- `/usr/bin/ditto`, `/usr/bin/zipinfo`, `/usr/bin/codesign`, `/usr/sbin/spctl` y `/usr/bin/plutil` existen.

### Supuestos

- **S-1** · El feed sigue publicando `updateTo.{version,url,sha256,size}` en la entrada cuya `version` es
  `currentRelease`. Si cambia, el comando falla con «El feed oficial no incluye el paquete…» y no toca nada.
- **S-2** · La original detectada es `/Applications/Claude.app` o `~/Applications/Claude.app` (lo que ya detecta
  `detect_provider_source`), en APFS. Si el volumen no soporta `RENAME_SWAP`, se usa el swap de dos `rename`.
- **S-3** · El paquete nuevo satisface el *designated requirement* de la instalada (mismo bundle id y mismo equipo).
  Si Anthropic cambiara de equipo de firma, la instalación se rechaza y queda el canal oficial (D-6).

### Preguntas para el mantenedor (los briefs asumen la recomendación)

1. **`sha2` como dependencia directa.** Ya se compila hoy como transitiva (no baja código nuevo). Recomiendo sí:
   hash en el mismo paso que la descarga. Si no: `/usr/bin/shasum -a 256` tras descargar (una lectura más).
2. **Configuración en compilación** (A-8): las URLs salen de `.env.example` vía `build.rs`, no del entorno en
   ejecución, para que nadie pueda redirigir la descarga con una variable. Esta historia **salda la deuda de
   HU-0011** entera: el feed, las tres URLs del handoff de Windows/Linux y el `User-Agent` fijo en `0.1`.
   Recomiendo sí; el comportamiento en Windows y Linux no cambia (mismos valores).
3. **Un clic, sin diálogo de confirmación.** «Descargar e instalar» empieza en el acto (lo pediste así); nada se
   toca hasta verificar y la descarga se cancela. Alternativa: confirmar antes en el diálogo actual.
4. **«Pendiente» vive en memoria** mientras la app está abierta (A-6). Si cierras Code AI Profiles antes de detener
   la instancia, deja de estar pendiente y la ofrece el aviso «Sincronizar instancias» de siempre. Alternativa:
   persistirlo en disco (un archivo más y su limpieza).
5. **Carpeta temporal oculta junto a la original** (`/Applications/.code-ai-profiles-original-<uuid>/`) durante la
   verificación y el intercambio. Es la forma de garantizar el mismo volumen; se borra siempre y se recupera al
   arrancar si la app se cerró a mitad.

Reglas escritas que chocan con la historia (decide el mantenedor si cambian; este análisis propone el cambio):

- `docs/actualizaciones.document.md` · «el handoff manual no descarga, instala ni reemplaza…» y «“Actualizar
  original” no encadena una sincronización de instancias». Ya confirmado; el orquestador lo reescribe al cerrar.
- Skill `code-ai-profiles-rust-tauri` · «La única salida a la red es el feed oficial… timeout de 5 s, sin
  redirecciones» y «`lib.rs` es un solo archivo; partirlo lo decide un ADR». Propuesto en
  `docs/arquitectura/backend.md` y `ADR-0002`; la skill hay que regenerarla para que lo diga.
- `docs/arquitectura/frontend.md` · «`invoke` solo en `lib/bridge.ts`» se amplía a `Channel` (mismo archivo).
- Se mantiene: la original nunca recibe una copia de una instancia; solo el paquete oficial.

### Impacto

| Símbolo que cambia | Consumidores (grafo y `rg`) | Qué se rompe |
| --- | --- | --- |
| `check_official_update_feed` | `check_source_update_sync` | Nada: se parte en `fetch_official_feed` + mapeo; misma salida |
| `original_application_update_target` | `update_original_application`, prueba de destinos | Nada: las URLs salen de `config` con los mismos valores |
| `ManagedPaths` (+ `original_update`) | `resolve`, `test_managed_paths`, prueba de enlaces (L6906) | Hay que añadir el campo en los tres sitios |
| `update_original_application` | `bridge.updateOriginalApplication` | Rechaza si hay una instalación en curso |
| `synchronize_managed_applications_sync` | su comando; ahora también la instalación | Nada: se llama igual, dentro del mutex |
| `DashboardStore` (+2 campos) | `DashboardProvider`, `dashboard-context`, pruebas | Estado inicial y reducer |
| `SourceUpdateBanner`, `OriginalDetail`, `DialogHost`, `FeedbackArea`, `DashboardRuntime` | rutas `#/` y `#/original` | Acción principal en macOS; un efecto nuevo al final |

- Contrato: **sí**, aditivo (A-1…A-4). Proyecto 0.x: sin major. `update_original_application` sigue igual.
- Datos guardados: no hay migración. Se escribe la caché del feed existente para la versión nueva. Temporales en
  `<app_data>/original-update/` y junto a la original; se borran siempre.
- Permisos: **sí, de producto**: la app reemplaza `Claude.app` (autorizado en la historia). Sin `sudo`, sin
  capabilities nuevas de Tauri, sin plugins. Red: un host nuevo (`downloads.claude.ai`), solo con el clic.
- Privacidad: no se lee nada del perfil. Lo que cruza IPC: versiones, bytes, fase y mensajes.
- Plataformas: macOS cambia; Windows y Linux solo cambian de dónde salen sus URLs y devuelven «no soportado» al
  comando nuevo. Se compilan en CI (`build-desktop.yml`); en esta máquina solo macOS.
- **Riesgosa: sí** — escribe sobre la instalación del usuario, red, concurrencia con escaneo e instancias.

## Solución

Contrato **IPC HU-0017** (aditivo; el proyecto es 0.x, sin major). Detalle de reglas permanentes en `docs/arquitectura/backend.md` y `ADR-0002`.

### A-1 · Comandos IPC

```rust
#[tauri::command]
async fn install_original_update(
    app: AppHandle,
    request: InstallOriginalUpdateRequest,
    on_progress: tauri::ipc::Channel<OriginalInstallProgress>,
) -> Result<OriginalInstallResult, String>;

#[tauri::command]
fn cancel_original_update() -> bool; // true si había una descarga o verificación cancelable
```

Desde TS: `invoke("install_original_update", { request, onProgress: channel })` y `invoke("cancel_original_update")`.
Fuera de macOS `install_original_update` devuelve `Err("La instalación directa solo está disponible en macOS.")`
sin tocar la red; `cancel_original_update` devuelve `false`.

### A-2 · Tipos (Rust con `#[serde(rename_all = "camelCase")]`, enums en `lowercase`)

```ts
export interface InstallOriginalUpdateRequest {
  expectedVersion: string;            // la que vio la persona; si el feed ya anuncia otra, error y no se toca nada
}
export type OriginalInstallPhase = "preparing" | "downloading" | "verifying" | "installing" | "synchronizing";
export interface OriginalInstallProgress {
  phase: OriginalInstallPhase;
  targetVersion: string | null;       // null solo en "preparing" antes de leer el feed
  receivedBytes: number;              // 0 fuera de "downloading"
  totalBytes: number;                 // el size del feed; 0 hasta conocerlo
  cancellable: boolean;               // true en preparing, downloading y verifying; false desde installing
}
export type OriginalInstallStatus = "installed" | "cancelled";
export interface OriginalInstallResult {
  status: OriginalInstallStatus;
  previousVersion: string | null;
  installedVersion: string | null;    // null si cancelled
  synchronization: SynchronizationItemResult[];  // las detenidas que estaban por detrás (puede ir vacío)
  pendingInstanceIds: string[];       // por detrás y en marcha al terminar: quedan pendientes (A-6)
  dashboard: DashboardState;          // RefreshScope::VERSIONS tras terminar (también al cancelar)
}
```

Cualquier fallo es `Err(String)` en español, terminado en «La original no cambió.» cuando no se llegó a
intercambiar, o «Se restauró la versión anterior.» cuando hubo vuelta atrás.

### A-3 · `bridge.ts`

```ts
installOriginalUpdate(request: InstallOriginalUpdateRequest,
  onProgress: (progress: OriginalInstallProgress) => void): Promise<OriginalInstallResult>;
cancelOriginalUpdate(): Promise<boolean>;
```

`Channel` de `@tauri-apps/api/core` se crea **dentro** de `bridge.ts` (`channel.onmessage = onProgress`). El mock:
fases con esperas cortas, cancelable, sube la original a `mockAvailableVersion`, actualiza las detenidas y deja
`demo-work` (en marcha) como pendiente.

### A-4 · Por qué `Channel` y no `emit`

El progreso pertenece a una llamada, no a la ventana. `Channel` llega solo a quien invocó, se cierra con la
llamada, no necesita `listen` ni el ciclo de vida que protege `scan-progress`, y mantiene la regla «Tauri solo en
`bridge.ts`». No requiere permisos nuevos en `capabilities/default.json`.

### A-5 · Flujo y estados (backend, `src-tauri/src/original_update.rs`)

Un solo vuelo: `static ACTIVE: Mutex<Option<Arc<AtomicBool>>>`. Si ya hay uno → «Ya hay una actualización de la
original en curso.». El handoff `update_original_application` también lo rechaza mientras dure.

1. **preparing** (sin mutex del registro). Recupera restos (A-7). `detect_provider_source` → canónica, no symlink,
   fuera de `paths.instances`, `validate_source`, propietario = uid actual (si no: «…pertenece a otro usuario o al
   sistema; actualízala con «Abrir Claude».»), `codesign --verify --deep --strict` de la instalada, su
   TeamIdentifier **presente** y su *designated requirement* (`codesign -d -r-`). Si está en marcha (A-9) →
   «Cierra Claude para actualizarla.». Feed **fresco** (sin caché) → `FeedPackage` validado (A-8);
   `expectedVersion` debe coincidir y ser posterior a la instalada. Crea `<padre>/.code-ai-profiles-original-<uuid>/`
   con modo `0700` (si falla por permisos → «No hay permiso para escribir en <carpeta>. Code AI Profiles no pide
   privilegios: usa «Abrir Claude».»). Espacio: `available(app_data) ≥ size + 64 MiB` y
   `available(padre) ≥ 3·size + 256 MiB` (si es el mismo volumen, la suma).
2. **downloading**. `GET` a la URL validada → `<app_data>/original-update/<uuid>/package.zip` con hash `sha256`
   incremental. Conexión ≤ 15 s; sin bytes durante 60 s → error; total ≤ 30 min. Se corta en `size + 1` bytes.
   Progreso como mucho cada 200 ms o 1 MiB, y uno final. Cancelación comprobada en cada bloque.
3. **verifying**. Tamaño exacto y `sha256` (comparación sin distinguir mayúsculas). `zipinfo -1` y `-t`: una sola
   raíz `<X>.app/`, sin entradas absolutas ni `..`, ≤ 100 000 entradas, descomprimido ≤ min(8·size, 4 GiB) y con
   espacio en el padre. `ditto -x -k` a `<op>/staged/`. Recorrido del árbol: todo symlink relativo y dentro del
   bundle. Luego, sobre `<op>/staged/<X>.app`: `codesign --verify --deep --strict -R=<DR de la instalada>`, mismo
   TeamIdentifier que la instalada, `spctl --assess --type execute`, `CFBundleIdentifier` igual,
   `CFBundleShortVersionString` == versión del feed. Cancelación comprobada entre pasos.
4. **installing** (`cancellable=false`, dentro de `with_registry_operation`). Inventario de procesos justo antes:
   si hay un proceso cuyo ejecutable está dentro del bundle → aborta sin tocar. `renamex_np(staged, destino,
   RENAME_SWAP)` (si `ENOTSUP`/`EINVAL`: el patrón `swap_application_directory` con `previous/` dentro de `<op>`).
   Valida el destino: `validate_source`, versión, bundle id y `codesign --verify --strict` (sin `--deep`). Si
   falla → swap inverso (o `rollback_application_directory`) y error «…Se restauró la versión anterior.».
   Si va bien: `invalidate_application_cache()` y guarda la caché del feed para la versión nueva como `current`
   (`checked_at` = hora de la consulta del paso 1).
5. **synchronizing** (mismo mutex). Recarga registro, estados y topología. Objetivos = `stale_instance_ids` que
   estén `Stopped`; fuente = `topology.latest_source`. Llama a `synchronize_managed_applications_sync`. Pendientes =
   `stale_instance_ids` en `Running`. Un fallo aquí **no** deshace la instalación: va en `synchronization`.
6. **Siempre** (éxito, error o cancelación): borra `<op>` y `<app_data>/original-update/<uuid>`, libera `ACTIVE`.
   Devuelve el `DashboardState` con `RefreshScope::VERSIONS`.

### A-6 · «Pendiente» y su disparo (frontend)

- Vive en el store: `pendingSyncIds: string[]` (no persistente). Lo llena `pendingInstanceIds` del resultado.
- `usePendingSynchronization()` (features/updates), **paso 7** de `DashboardRuntime`, después de
  `useBackgroundRefresh`. No registra listeners de ventana (R-1 intacta). Reacciona a cambios del store: con
  `!loading`, `busy === null`, `originalInstall === null` y un vuelo propio libre, calcula con una función pura
  `pendingSyncPlan(pendingSyncIds, dashboard)` → `{ ready, drop }`:
  `ready` = pendientes `stopped` que siguen en `staleInstanceIds`; `drop` = las que ya no existen o ya no están
  por detrás. Quita `drop`. Si hay `ready`, `latestSource` y `canSynchronizeManaged`: `busy =
  "update-applications"`, `bridge.synchronizeApplications`, `replaceDashboard`, aviso con
  `summarizeSynchronization` («Sincronización pendiente: …») y quita `ready` del pendiente **pase lo que pase**
  (una que falla no reintenta en bucle; queda en «Sincronizar instancias»).
- Lo ve un refresco cualquiera: el de 60 s, el de `focus`, o el `DashboardState` que devuelve «Detener». Sin
  carreras con el escaneo: el disparo exige `busy === null`, y mientras sincroniza `busyRef` frena el refresco en
  segundo plano. En Rust todo pasa por `with_registry_operation`.

### A-7 · Recuperación de restos

`recover_original_update_leftovers()` en `setup` y al empezar el paso 1, solo en los padres candidatos
(`/Applications`, `~/Applications`) y `<app_data>/original-update/`. Toca solo directorios (no symlinks) del
usuario actual con nombre exacto `.code-ai-profiles-original-<uuid válido>`. Si falta `<padre>/Claude.app` y existe
`<op>/previous/Claude.app` → lo devuelve con `rename`. Después borra el directorio.

### A-8 · Red y validación del feed

- Feed: plantilla de `config` con `{platform}` y `{arch}`; mismos límites de hoy (5 s, sin redirecciones,
  256 KiB, UUID nulo). `User-Agent: Code-AI-Profiles/<CARGO_PKG_VERSION>`.
- `FeedPackage` desde `releases[]`: la entrada con `updateTo.version == currentRelease`; `version` válida
  (`valid_release_version`); `sha256` = 64 hex; `1 ≤ size ≤ 2 GiB`; URL `https`, sin usuario ni contraseña, puerto
  vacío o 443, host **exactamente** en `config.download_hosts` (minúsculas), ruta acabada en `.zip`.
- Descarga: cliente propio, sin almacén de cookies (reqwest sin la feature `cookies`), sin query ni cabeceras salvo
  `User-Agent`. Redirecciones: `Policy::custom`, como mucho 3, y cada salto `https` a un host permitido; si no, error.
- `codesign` y `spctl` pueden consultar por su cuenta servicios de Apple (revocación, notarización). Es el sistema,
  no la app; se documenta en `actualizaciones.document.md` junto a AC-06.

### A-9 · Original en marcha

`ProcessInventory::any_executable_within(bundle)`: algún proceso cuyo ejecutable canónico empieza por el bundle
canónico (cubre `Claude`, sus *Helpers* y `ShipIt`). Se usa en el paso 1 y justo antes del intercambio. La
interfaz deshabilita con `system.originalStatus === "running"`; el backend es quien manda.

### A-10 · Interfaz

- `SourceUpdateBanner`, tipo `available`, en macOS: título «Actualización oficial disponible para {app}», detalle
  «Instalada {sourceVersion} · disponible {latestVersion}», acción principal «Descargar e instalar» (`Button`) y
  secundaria «Abrir {app}» (`variant="outline"`, abre el diálogo de handoff actual). Con la original en marcha: la
  principal deshabilitada y el detalle dice «Cierra {app} para actualizarla.». Windows, Linux y los otros tipos:
  como hoy.
- `OriginalDetail`: con versión disponible en macOS, «Descargar e instalar» es el botón principal y «Actualizar
  original» pasa a `outline` y abre el handoff. Mismo texto de bloqueo visible (no solo `title`).
- `OriginalInstallPanel` en `FeedbackArea` (se ve en cualquier página): `NoticeAlert` + `Progress`, etiqueta por
  fase («Descargando {app} {v} · 120 MB de 378 MB», «Verificando paquete, firma y versión…», «Instalando y
  comprobando…», «Sincronizando instancias detenidas…») y «Cancelar» mientras `cancellable`.
- `busy = "install-original"` durante todo el flujo: deshabilita lo que ya deshabilita `busy` y frena el refresco
  en segundo plano. Store: `originalInstall: OriginalInstallProgress | null`.
- Al terminar: aviso «{app} se actualizó de X a Y.» + resumen de instancias («N actualizadas, M pendientes: se
  sincronizarán al detenerlas»); errores de sincronización por `setError`. Cancelado: aviso «Descarga cancelada. La
  original no cambió.». Error: `setError(mensaje)`.
- Pendientes: `SynchronizeBanner` nombra las pendientes («se sincronizará al detenerla») e `InstanceDetail`
  muestra un `Badge` «Sincronización pendiente». Sin pantallas ni diálogos nuevos.

### Datos

Sin cambios en `instances.json`. `ManagedPaths.original_update = app_data/original-update`. Caché del feed: mismo
formato, nueva entrada tras instalar.

### Variables de entorno nuevas

Se leen **en compilación** (`build.rs` → `cargo:rustc-env`) y solo desde `src-tauri/src/config.rs`. Precedencia:
entorno del proceso de compilación > `.env.local` > `.env.example`. Solo claves `CAP_*`. Si falta una, no compila
y dice cuál; `config::validate()` en `setup` comprueba el formato y la app no arranca si no cuadra.

| Nombre | [SECRET]/[PUBLICO] | Apps | Para qué |
| --- | --- | --- | --- |
| `CAP_UPDATE_FEED_URL` | [PUBLICO] | desktop (Rust) | Plantilla del feed con `{platform}` y `{arch}` |
| `CAP_UPDATE_DOWNLOAD_HOSTS` | [PUBLICO] | desktop (Rust) | Hosts permitidos para el paquete, separados por comas |
| `CAP_WINDOWS_X64_DOWNLOAD_URL` | [PUBLICO] | desktop (Rust) | Handoff oficial de Windows x64 (deuda HU-0011) |
| `CAP_WINDOWS_ARM64_DOWNLOAD_URL` | [PUBLICO] | desktop (Rust) | Handoff oficial de Windows ARM64 (deuda HU-0011) |
| `CAP_LINUX_INSTALL_GUIDE_URL` | [PUBLICO] | desktop (Rust) | Guía oficial de Linux (deuda HU-0011) |

Valores: los de hoy en `lib.rs` y `downloads.claude.ai`.

### Señales

No hay observabilidad (app local, sin telemetría). Nada se registra.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La app se cierra a mitad del intercambio | `RENAME_SWAP` no deja hueco; el fallback deja `previous/` y A-7 lo devuelve al arrancar |
| La original se abre durante la descarga | Comprobación dentro del mutex justo antes del swap |
| Paquete malicioso o alterado | Host permitido, `size`, `sha256`, zip sin `..`, symlinks internos, DR de la instalada, Gatekeeper, versión, bundle id |
| Zip bomb o disco lleno | Límite de entradas y bytes por `zipinfo -t` y espacio comprobado antes de extraer |
| `blocking::ClientBuilder::timeout` es total, no por lectura | El backend lo comprueba en la doc de reqwest 0.13 y aplica el plazo de 60 s sin bytes en su propio bucle |
| Instalación gestionada por MDM o de otro usuario | Propietario ≠ uid → se rechaza; queda el canal oficial |
| Regresión de R-1 | Ningún listener nuevo; el efecto 7 va al final y `test:ui` lo sigue vigilando |
| Windows/Linux no compilan | Ramas `cfg` explícitas; CI de `build-desktop.yml`; `build.rs` tolera `\r\n` |
| Prueba real imposible hoy | Pendiente humano: original más antigua instalada a propósito o la próxima versión |

## Briefs y orden

1. `briefs/backend.md` — **opus** (reemplaza la instalación del usuario, red, concurrencia). Paso B-1 primero:
   contrato en `src/types.ts` y `src/lib/bridge.ts` con el mock.
2. `briefs/frontend.md` — **sonnet** (pantallas y efecto acotado). Empieza cuando B-1 está en el árbol; en paralelo
   con el resto del backend. No toca `types.ts` ni `bridge.ts`.

Verificación de cierre: `pnpm build`, `cargo test --manifest-path src-tauri/Cargo.toml`, `cargo fmt --check`,
`node .metodo/scripts/config.mjs check`, suite una vez y la prueba humana en macOS.

## Revisión técnica

Pendiente (después de implementar, antes de la prueba humana).
