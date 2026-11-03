# Arquitectura · HU-0028 · Distintivo de la app original en el icono de instancia

## Análisis

Confianza: **media-alta**. La composición del Dock (`dock_icon_png`), su caché en memoria (`cached_dock_icon_png`), la
aplicación con su reversión (`apply_icon_to_registered`, `restore_after_failure`), el asset protocol y
`localFileSource` ya existen. Lo nuevo es leer el icono de la original en tres formatos distintos sin dependencias ni
subprocesos, y que una copia que **ya tiene** el icono puesto lo reciba de nuevo al abrirla.

Leído: `hu.md`, `diseno/vista.md`, la maqueta (CSS de `.di`, `.av`, `.a64`, `.a32`, `.a96`), `src-tauri/src/
{macos_icon.rs (767-1440 y pruebas 2909-2963), platform/{mod,macos,windows,linux,unsupported}.rs, versions/{mod,
synchronize}.rs, scan.rs (RefreshScope, system_info_scoped, system_info_seed), contract.rs (CustomIcon, SystemInfo),
storage.rs (ManagedPaths, write_file_atomic, application_cache), instances/icons.rs, lib.rs}`, `Cargo.toml`,
`tauri.conf.json`, `src/{types.ts, lib/bridge.ts (mockState), lib/local-asset.ts, features/instances/{InstanceAvatar,
instance-icon, InstanceDetail, InstanceEditor}.tsx, features/dashboard/dashboard-store.ts, app/routes/dashboard/
UsageRanking.tsx, components/ui/item.tsx}`, `tests/ui-isolation.test.ts` (prueba 15), `graphify query` del área y
`grafo.mjs impacto` de `set_workspace_icon` e `InstanceAvatar`.

Hechos que deciden el diseño:

- **El `electron.icns` de Claude (solo lectura, `/Applications/Claude.app`) trae PNG dentro:** `ic07` 128, `ic08` 256,
  `ic10` 1024 e `ic09` 512, más `ic04`/`ic05` heredados. Se lee en Rust sin `sips`: un recorrido de trozos de 30 líneas.
- **Ese PNG ya es una plantilla de macOS:** a 256 px el cuerpo opaco va de 25 a 230 (alfa ≥ 128) y la sombra baja
  hasta 237. «Recortar el margen» es recortar al rectángulo de alfa ≥ 128; la sombra la pone la composición.
- **`launch_preflight` no reaplica nada a una copia ya iconizada con procedencia firmada** (verifica y sale). Sin un
  testigo de qué distintivo lleva el icono puesto, una instancia existente no lo recibiría al abrirla (AC-03).
- **`setIcon` solo escribe `Icon\r` y el FinderInfo de la raíz:** A-2 (`check_root_shape`, `check_sideband`) no mira
  los bytes de la imagen. Cambiar la imagen compuesta no toca la firma ni la comprobación equivalente (HU-0020).
- **No hay `windows-sys` directo** ni característica `ico`/`bmp` en `image`: el icono de `Claude.exe` se saca leyendo
  sus recursos PE en Rust. `ExtractAssociatedIcon` de PowerShell solo da 32 px.
- `SystemInfo` se rellena en `system_info_scoped` solo con `scope.versions || scope.topology` (FULL y VERSIONS); el
  refresco LIGHT clona el anterior (`system_info_seed`). Ahí va el distintivo, sin coste en el refresco ligero.
- `CustomIcon` es a la vez registro (`instances.json`) e IPC; no tiene `deny_unknown_fields`.

### Impacto

`set_workspace_icon` (39 usos, todos en `macos_icon.rs`, más 2 pruebas en `instances/icons.rs`), `dock_icon_png` y
`cached_dock_icon_png` (solo `macos_icon.rs`), `apply_icon_to_registered`, `restore_after_failure` y
`apply_branding_after_update` (este también desde `versions/synchronize.rs`). `SystemInfo`: `scan.rs` (semilla, prueba
de la línea 594), `src/types.ts`, `bridge.ts` (`mockState`), `dashboard-store.ts` (estado inicial) y
`tests/source-update-controller.test.ts`. `CustomIcon`: todos sus literales (Rust y pruebas). `InstanceAvatar`: 6
archivos; solo `InstanceDetail` (64) y `UsageRanking` (32) pasan el distintivo. Nada de sesiones, perfiles ni red.

## Solución

### A-1 · Contrato IPC (aditivo, 0.x: sin major)

```rust
// contract.rs
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProviderBadge { pub(crate) path: String }
// SystemInfo gana (siempre serializado, null si no hay):
pub(crate) provider_badge: Option<ProviderBadge>,
// CustomIcon gana (registro e IPC; solo macOS lo rellena):
/// Clave del distintivo compuesto en el icono que macOS tiene puesto; `None` = sin distintivo.
#[serde(default, skip_serializing_if = "Option::is_none")]
pub(crate) dock_badge: Option<String>,
```

```ts
export interface ProviderBadge { path: string }
// SystemInfo gana: providerBadge: ProviderBadge | null;
// CustomIcon gana: /** Solo macOS, interno: qué distintivo lleva el icono del Dock. */ dockBadge?: string | null;
```

Sin `revision`: el nombre del archivo es la clave de contenido (A-2), así que un distintivo nuevo es otra ruta y el
`<img>` se recarga solo. Ningún comando nuevo. `bridge.ts`: `mockState().system.providerBadge = { path: <data:image/png
neutro> }` (un PNG pequeño de un color de la paleta, generado en el scratchpad, nunca la marca de nadie).

### A-2 · De dónde sale y dónde se guarda

- **Plataforma** (misma firma en los cuatro archivos): `provider_icon_file(source: &Path) -> Option<PathBuf>`.
  - macOS: `macos_bundle_value(source, "CFBundleIconFile")`; nombre sin `/` ni `..`, `.icns` si no trae extensión;
    `source/Contents/Resources/<nombre>`, archivo regular (`symlink_metadata`).
  - Windows: `source` (el `Claude.exe` clásico o del MSIX) si es archivo.
  - Linux: `Icon=` del `.desktop` (los tres de `source_display_name`, con un `linux_desktop_icon(contents)` portable en
    `platform/mod.rs`, probado como `linux_desktop_name`). Nombre `[A-Za-z0-9._-]{1,128}` → el primer
    `<datos>/icons/hicolor/{512x512,256x256,128x128}/apps/<nombre>.png` en `$XDG_DATA_HOME` (o `~/.local/share`),
    `/usr/local/share`, `/usr/share`, y luego `/usr/share/pixmaps/<nombre>.png`. Ruta absoluta: solo `.png` bajo
    `/usr/share/`, `/usr/local/share/`, `/opt/` o `<datos>/icons/`. SVG: no hay distintivo (D-7).
  - unsupported: `None`.
- **Lectura portable** en `src-tauri/src/provider_badge.rs` (nuevo): `provider_icon_image(file) -> Option<Vec<u8>>`
  por la firma del archivo: `icns` → el trozo PNG de mayor ancho (IHDR); `MZ` → recursos PE (A-3); PNG → tal cual.
  Topes: 16 MiB para icns y PNG, 64 MiB para la sección de recursos; ≤ 2048 px por lado al decodificar. Todo con
  límites comprobados (`checked_add`, `get(..)`): un archivo raro da `None`, nunca un pánico. **Sin `sips` ni
  PowerShell.**
- **Normalización** `badge_png(raw) -> Result<Vec<u8>, ()>`: RGBA, rectángulo de alfa ≥ 128 (vacío → error),
  cuadrado centrado (relleno transparente), lado `min(512, lado recortado)` con Lanczos3, PNG.
- **Caché en disco** `<app_data>/provider-badge/<clave>.png`, con `<clave>` = 16 hex de SHA-256 de
  `"provider-badge-v1\0" + ruta canónica del archivo de icono + "\0" + tamaño + "\0" + mtime_ns`. Si la original
  cambia (actualización, otro MSIX), cambia la clave. Tras escribir (`write_file_atomic(…, ".provider-badge")`) se
  borran los demás archivos regulares de esa carpeta (sin recursión ni seguir enlaces): copias viejas y temporales.
  Un `<clave>.png` que no es archivo regular de 1 B a 16 MiB se regenera.
- **Memoria** en el proceso: un solo par `(ApplicationFingerprint de la original, Option<ProviderBadge>)` bajo un
  `static BADGE_LOCK: Mutex`, que serializa también la extracción y la limpieza. Con la misma huella se devuelve lo
  recordado (si `Some`, tras comprobar que el archivo sigue ahí); un fallo se recuerda hasta que cambie la huella o
  se reinicie la app (D-7, sin reintentos en cada refresco). `provider_badge` nunca toma el candado del registro.
- **Entrada única**: `provider_badge(app_data: &Path, source: &Path) -> Option<ProviderBadge>`, y para pruebas
  `resolve_badge(app_data, icon_file, read: impl Fn(&Path) -> Option<Vec<u8>>)`.
- **Dónde se llama**: `system_info_scoped`, junto a `source_name`: `info.provider_badge = source.as_deref()
  .and_then(|s| provider_badge(&paths.app_data, s))`; y en macOS al aplicar el icono (A-4).

### A-3 · Recursos PE de `Claude.exe` (Windows, código portable y probado en todas)

Se abre el archivo y se lee solo lo necesario con `seek`: `MZ`, `e_lfanew` (≤ 1 MiB), `PE\0\0`, ≤ 96 secciones,
cabecera opcional PE32 (`0x10b`) o PE32+ (`0x20b`), directorio de datos 2 (recursos) → la sección que contiene esa
RVA. Del árbol de recursos: el primer `RT_GROUP_ICON` (14, el icono de la app), su entrada de mayor ancho (`0` = 256)
→ `RT_ICON` (3) con ese id. Datos PNG → tal cual; `BITMAPINFOHEADER` de 32 bits sin compresión → BGRA de abajo arriba,
alto `biHeight / 2` → RGBA → PNG. Otro formato → la siguiente entrada por tamaño; ninguna → `None`. Límites: ≤ 4096
entradas por directorio, 3 niveles, cada offset dentro de la sección.

### A-4 · Dock (macOS)

```rust
pub(crate) struct DockBadge { pub(crate) key: String, pub(crate) png: Vec<u8> }
pub(crate) fn dock_badge(app_data: &Path, original: &Path) -> Option<DockBadge>   // provider_badge + fs::read
pub(crate) fn dock_icon_png(source: &[u8], badge: Option<&[u8]>) -> Result<Vec<u8>, String>
fn cached_dock_icon_png(source: &[u8], badge: Option<&[u8]>) -> Result<Vec<u8>, String>
pub(crate) fn set_workspace_icon(instances_root, bundle, icon_path: Option<&Path>, badge: Option<&DockBadge>)
apply_icon_to_registered(.., icon_path, badge: Option<&DockBadge>, original, ..)   // IconOutcome gana dock_badge
restore_after_failure(.., badge: Option<&DockBadge>)
apply_branding_after_update(.., badge: Option<&DockBadge>)
```

- **Composición** (★ D-3, medidas de la maqueta aprobada): sobre el lienzo actual (cuerpo y sombra sin cambios), el
  distintivo a **368 px** (36 % del lienzo de 1024) con su esquina inferior derecha a **36 px** (≈3,5 %) del borde:
  ocupa 620..988 y monta sobre la esquina redondeada del cuerpo (que acaba en 924). Antes, su sombra: la máscara
  alfa del distintivo desplazada 10 px hacia abajo, `fast_blur` σ 8, opacidad 0,35. Constantes `DOCK_BADGE_*` junto a
  las de la plantilla. Un distintivo que no se decodifica se ignora: el icono sale como hoy (D-7).
- **Caché de plantillas**: la clave pasa a SHA-256 incremental de `source`, un byte de presencia y, si hay, `badge`.
- **Quién resuelve el distintivo**: los que tienen `paths` (`set_instance_icon`, `reapply_instance_icon`,
  `clear_instance_icon` para su reversión, `launch_preflight` y `versions/synchronize.rs`) llaman una vez a
  `dock_badge(&paths.app_data, original)` y lo pasan. `clear_workspace_icon` pasa `None, None`.
- **Testigo**: `IconOutcome.dock_badge` = la clave si `system_applied` y había distintivo, si no `None`;
  `write_to` lo copia a `CustomIcon.dock_badge`. `set_instance_icon` lo pone en el `CustomIcon` nuevo.
- **Instancias existentes (AC-03)**: en `launch_preflight`, rama iconizada con procedencia firmada, tras verificar y
  si no hubo autoactualización: si `system_issue` no es «Gestión de apps», el `branding/icon.png` es válido y
  `dock_badge(..).map(key) != custom_icon.dock_badge`, se reaplica con `apply_icon_to_registered` (el mismo bloque y
  la misma salida de error que la rama limpia) y devuelve `Ok(true)` para guardar. Con la clave igual, nada cambia
  (cero `setIcon`). «Reintentar» y la sincronización ya reaplican y lo ponen.
- **Sin distintivo (D-7)**: `badge = None` → la imagen de hoy, `dock_badge = None`. Una copia que lo llevaba y ahora
  no tiene original legible se reaplica sin él en la siguiente apertura.
- La firma: solo cambia la imagen que recibe `setIcon`; `branding/icon.png` no cambia (D-2) y A-2 sigue igual.

### A-5 · Asset protocol

`tauri.conf.json` → `scope` añade **solo** `"$APPDATA/provider-badge/*.png"`. CSP y `tauri.<plataforma>.conf.json`
sin cambios.

### A-6 · Interfaz

- `providerBadgeSource(system)` en `features/instances/instance-icon.ts` (`providerBadge` → `localFileSource(path)`,
  sin `?v=`) y la regla pura `showsProviderBadge(iconSrc, badgeSrc, failedSrc)` en
  `features/instances/avatar-badge.ts` (nuevo, sin Tauri, probada en `test:dashboard`).
- `InstanceAvatar` gana `badgeSrc?: string | null` y `badgeClassName?`. Hay distintivo solo si `iconSrc && badgeSrc`
  y no falló (`onError` lo oculta, AC-05). Con él, raíz `data-badged` y el punto sube arriba a la derecha (D-4).
- Pasan `badgeSrc`: `InstanceDetail` (64) y `UsageRanking` (32). No: sidebar y `ApplicationUpdateDialog` (16, D-5)
  ni `OriginalDetail` (`iconSrc={null}`). `InstanceEditor` recibe `badgeSrc` de `DialogHost` y lo pinta en la vista
  previa de 72 px cuando hay imagen; «Quitar» lo quita (AC-04). Detalle en `briefs/frontend.md`.

### Variables de entorno nuevas

Ninguna. Rutas de sistema y constantes de composición no son configuración (no cambian entre entornos).

### Delta de reglas (lo aplica el orquestador al cerrar, en `docs/producto/reglas/instancias.md`)

- **RN-01 cambia:** «En macOS el icono del Dock de una instancia es su imagen con el distintivo de la original.»
- **RN-02 nace:** «Una instancia con icono propio lleva el icono de la aplicación original en la esquina inferior
  derecha, en el Dock y en la app. La imagen que eligió la persona no cambia.»

### Plataformas

- **macOS:** `~/Library/Application Support/com.braiyan.claudeprofiles/provider-badge/`. Dock y app. Solo lectura
  del `.icns` del bundle de la original.
- **Windows:** `%APPDATA%\com.braiyan.claudeprofiles\provider-badge\`. Solo en la app (D-6). Lee la cabecera y la
  sección de recursos de `Claude.exe` (clásico o `WindowsApps`, legible como hoy para `robocopy`).
- **Linux:** `~/.local/share/com.braiyan.claudeprofiles/provider-badge/`. Solo en la app; el lanzador `.desktop` no
  cambia (D-6). PNG del tema hicolor; si el paquete solo trae SVG, sin distintivo.

### Riesgos

- **Firma (macOS, `riesgo: [plataforma]`):** reaplicar en `launch_preflight` a copias iconizadas añade un `setIcon` +
  A-2 una sola vez por instancia (y otra cuando la original cambie de icono). Si falla, sale por el camino conocido
  (icono retirado, copia limpia verificada, abre sin icono del sistema).
- **Datos reales:** `instances.json` gana `dockBadge` opcional; se lee sin migración y sin subir `REGISTRY_VERSION`.
  Bajar de versión lo pierde al guardar: la siguiente apertura con la versión nueva reaplica una vez.
- **Archivo binario de terceros:** los analizadores icns/PE leen un archivo de la instalación; topes de tamaño y
  límites comprobados. Si Anthropic publica un icns sin PNG o un exe sin icono legible: sin distintivo (D-7).
- **Coste:** extracción una vez por versión de la original (decodificar ≤ 1024 px y Lanczos, < 0,5 s) dentro del
  refresco de versiones; luego un `stat` por refresco. Sin subprocesos nuevos.
- **Carreras:** `BADGE_LOCK` evita que dos refrescos escriban o limpien a la vez. Un `<img>` con la ruta de una copia
  recién borrada falla, se oculta y vuelve en el siguiente refresco de versiones. Aceptado.
- **Permiso:** el webview puede leer cualquier `.png` de `provider-badge/`: solo hay distintivos.
- **Pendiente humano:** el Dock real en claro y oscuro; la app en Windows y Linux (sin runner con interfaz).

### Pruebas que no pueden faltar

Cargo: `badge_png` (recorta el margen de una plantilla sintética 256 con cuerpo 25..230 y sombra tenue; vacío y no
imagen → error); icns sintético (elige el PNG mayor, ignora trozos no PNG, longitudes rotas → `None`); PE sintético
(PE32+ con grupo e iconos PNG y DIB 32 → el mayor; solo DIB → decodifica; offsets fuera → `None`; no `MZ` → `None`);
`linux_desktop_icon`; `resolve_badge` (escribe un archivo, segunda llamada sin extraer, archivo de icono cambiado →
clave nueva y una sola copia, extractor `None` → sin archivo, enlace en lugar de `<clave>.png` → no se confía);
`dock_icon_png` con distintivo (centro del distintivo con su color, cuerpo igual que sin él, esquinas del lienzo con
alfa 0, distintivo corrupto = sin distintivo; claves de caché distintas); `launch_preflight` (testigo distinto →
un `setIcon`, `Ok(true)`, testigo nuevo y A-2 en verde; igual → cero `setIcon`); `CustomIcon` sin `dockBadge` se
lee y sin testigo no se escribe; las pruebas de la plantilla y de la imagen guardada siguen en verde.
Frontend: `showsProviderBadge` en `test:dashboard` (sin icono propio, sin distintivo, distintivo fallido → no; los
dos y sin fallo → sí; un fallo de otra ruta no cuenta); `test:ui` en verde; `pnpm build`.

## Orden y paralelismo

1. **Backend, paso 1 (commit propio):** `src/types.ts`, `src/lib/bridge.ts`, el literal de
   `features/dashboard/dashboard-store.ts` y el de `tests/source-update-controller.test.ts`. Desbloquea al frontend.
2. **En paralelo:** backend con `src-tauri/**`; frontend con `src/features/**` (salvo `dashboard-store.ts`),
   `src/app/**` y `tests/dashboard-state.test.ts`. Archivos disjuntos.
3. Revisión técnica antes de la prueba humana.

Modelos: backend **opus** (cadena de firma de macOS y reaplicación en el arranque, campo nuevo en el registro real,
análisis de binarios de terceros, contrato y scope del asset protocol); frontend **sonnet** (interfaz sobre un
contrato cerrado).
