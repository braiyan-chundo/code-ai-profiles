# Arquitectura · HU-0027 · Icono personalizado de proyecto

## Análisis

Confianza: **alta**. Todo lo difícil ya existe en las instancias: la normalización (`normalized_icon_png`), la
escritura atómica (`write_file_atomic`), el envío de bytes por IPC (`set_instance_icon`, `Vec<u8>`) y el pintado por el
asset protocol (`convertFileSrc`). Los proyectos tienen su propio registro (`<app_data>/projects.json`, con
`with_projects_lock` y `write_json_atomic`) y su propio estado en el frontend (`ProjectsProvider`, reducer puro).

Leído: `hu.md`, `diseno/vista.md`, la maqueta (CSS de `.pa`, `.pbtn`, `.velo`, `.icsec`, `.dlg`), `src-tauri/src/
{projects.rs, projects/tests.rs, instances/icons.rs, commands.rs, lib.rs, storage.rs, error.rs}`, `tauri.conf.json` y
los tres `tauri.<plataforma>.conf.json`, el handler del asset protocol de Tauri 2.11.5 (`protocol/asset.rs`),
`src/{types.ts, lib/bridge.ts}`, `src/features/instances/{InstanceEditor, InstanceAvatar, instance-icon, icon-validation}`,
`src/features/projects/{ProjectInitial, ProjectHero, ProjectCard, ProjectPage, ProjectsProvider, projects-store,
projects-context, index}`, `src/app/{layout/ProjectsSidebarGroup, layout/DialogHost, providers/dialogs-context,
routes/project/ProjectRoute}.tsx`, `tests/ui-isolation.test.ts` (prueba 17) y `graphify query` del área.

Hechos que deciden el diseño:

- **La prueba 17 de `test:ui` prohíbe que `features/projects` importe `features/instances`.** La validación del
  archivo (`icon-validation.ts`) y el `convertFileSrc` tienen que salir a `src/lib/`, que es neutral.
- **El asset protocol ignora la query** (`request.uri().path()`): `convertFileSrc(path) + "?v=<revision>"` sirve el
  mismo archivo y rompe la caché del `<img>`. Las instancias tienen `revision` pero no la usan; aquí sí.
- **Los `tauri.<plataforma>.conf.json` se funden con JSON Merge Patch (RFC 7396):** reemplazan `app.windows` (un array)
  y conservan `app.security`, que no declaran. Es la vía por la que ya se pinta el icono de instancia fuera de macOS.
- `PinnedProject` no tiene `deny_unknown_fields`: un campo nuevo con `#[serde(default)]` lee un `projects.json` antiguo
  sin migración y sin subir `PROJECTS_VERSION`.
- `with_projects_lock` es un `Mutex` no reentrante: `read_project_at` (que llama a `find_entry`, que bloquea) no se
  puede llamar con el candado tomado.
- `Uuid::parse_str` acepta formas `urn:uuid:` y `{…}`: el nombre del archivo sale del UUID ya parseado, nunca del texto.

### Impacto

`ProjectSummary` (Rust y TS) gana un campo: lo construyen `summary_for` y los mocks; lo leen `ProjectInitial`,
`ProjectHero`, `ProjectCard`, `ProjectsSidebarGroup` y `DialogHost`. `normalized_icon_png` lo usan `instances/icons.rs`
y una prueba de `macos_icon.rs`. `icon-validation.ts` lo importan `InstanceEditor.tsx` y `tests/result-messages.test.ts`.
`convertFileSrc` solo está en `instance-icon.ts`. Nada de sesiones, escaneo ni actualizaciones.

## Solución

### A-1 · Contrato IPC (aditivo, 0.x: sin major)

```rust
// Registro (projects.json), privado de projects.rs
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PinnedProjectIcon { revision: u64 }
// PinnedProject gana:
#[serde(default, skip_serializing_if = "Option::is_none")] icon: Option<PinnedProjectIcon>,

// IPC
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectIcon { pub(crate) path: String, pub(crate) revision: u64 }
// ProjectSummary gana (siempre serializado, null si no hay):
pub(crate) icon: Option<ProjectIcon>,

// contract.rs
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetProjectIconRequest { pub(crate) id: String, pub(crate) bytes: Vec<u8> }

#[tauri::command] async fn set_project_icon(app, request: SetProjectIconRequest) -> Result<ProjectSummary, String>
#[tauri::command] async fn clear_project_icon(app, id: String) -> Result<ProjectSummary, String>
```

```ts
export interface ProjectIcon { path: string; revision: number }
// ProjectSummary gana: icon: ProjectIcon | null;
bridge.setProjectIcon(id: string, bytes: Uint8Array): Promise<ProjectSummary>
  // call("set_project_icon", { request: { id, bytes: Array.from(bytes) } })
bridge.clearProjectIcon(id: string): Promise<ProjectSummary>   // call("clear_project_icon", { id })
```

Los dos devuelven el `ProjectSummary` releído (`read_project_at`, la misma lectura de RN-02, nada nuevo) para que el
frontend lo funda con la acción `project/loaded` que ya existe: su `readAt` nuevo descarta un `readProject` anterior aún
en vuelo (`replaceIfNewer`). Rust informa `icon` también en un proyecto roto; **ocultarlo (D-3) es del frontend**.

### A-2 · Dónde vive la copia

- `<app_data>/project-icons/<uuid>.png`, con `<uuid>` = `Uuid::parse_str(&entry.id)?.hyphenated().to_string()`. La ruta
  la calcula Rust a partir del registro; el frontend nunca envía una ruta. En el registro se guarda solo `revision`, no
  la ruta (sobrevive a un cambio de `app_data`); `ProjectIcon.path` se calcula al construir el resumen.
- `revision = max(ahora_en_ms, anterior + 1)`: crece siempre, también tras «Quitar» y volver a poner, y la URL con
  `?v=` nunca repite una de la sesión.
- **Archivo que falta o no es válido:** al construir el resumen, `icon` es `Some` solo si el registro lo tiene y
  `fs::symlink_metadata` dice archivo regular (no enlace) de 1 byte a 5 MiB. Si no, `None`, y el registro **no** se
  toca al leer. Un PNG dañado que pase ese filtro lo resuelve el `<img onError>` del frontend: vuelve la inicial.
- En `read_entries`, el `icon` de cada resumen sale del registro **releído dentro del candado** (el que ya relee para
  `lastName`): una lista que termina después de guardar un icono lo trae.

### A-3 · Operaciones (`projects.rs`, funciones `_at` que se prueban sin `AppHandle`, `AppError` según ADR-0003)

- **Poner:** valida el UUID (`NOT_PINNED`) → `normalized_icon_png` **fuera** del candado → con el candado: carga,
  busca la entrada (`NOT_PINNED`), lee el PNG anterior si lo hay, `create_dir_all` y `write_file_atomic(…, ".project-icon")`,
  fija `icon`, `save_projects`; si guardar falla, `restore_optional_file` con el anterior y devuelve el error → suelta
  el candado → `read_project_at`.
- **Quitar:** UUID → candado: carga, busca, `icon = None`, `save_projects` (solo si cambió) → después, `remove_file`
  sin fallar (`NotFound` y cualquier error se ignoran: el registro manda y el nombre se reutiliza) → `read_project_at`.
  Idempotente.
- **Desanclar:** tras `save_projects`, `remove_file` del PNG de ese id, sin fallar. Anclar de nuevo da un UUID nuevo:
  sale la inicial (AC-04).
- **Errores en español:** los de `normalized_icon_png` tal cual; `"El proyecto ya no está anclado."`; `"No se pudo
  guardar el icono del proyecto: {e}"`; los de `save_projects`; en `commands.rs`, `"Guardar el icono del proyecto
  terminó inesperadamente: {e}"` y `"Quitar el icono del proyecto terminó inesperadamente: {e}"`.

### A-4 · Normalización compartida

`normalized_icon_png`, `ICON_MAX_BYTES` e `ICON_MAX_DIMENSION` pasan de `instances/icons.rs` a
`src-tauri/src/icon_image.rs` (nuevo, `mod icon_image; use icon_image::*;` en `lib.rs`), con su prueba. Sin cambiar
textos ni firma. Así `projects` no depende de `instances`.

### A-5 · Asset protocol

`tauri.conf.json` → `app.security.assetProtocol.scope` añade **solo** `"$APPDATA/project-icons/*.png"` (`*` no cruza
`/`: `require_literal_separator`). CSP sin cambios (`img-src` ya tiene `asset:` y `http://asset.localhost`). Los tres
`tauri.<plataforma>.conf.json` no se tocan.

### A-6 · Interfaz

- `src/lib/icon-validation.ts` (movido desde `features/instances/`) y `src/lib/local-asset.ts` (nuevo:
  `localFileSource(path, revision?)`, el único `convertFileSrc`; `instance-icon.ts` lo usa sin `revision`).
- Selector puro `visibleIcon(project)` en `projects-selectors.ts`: `isReadable(project) ? project.icon : null` (D-3).
- `ProjectInitial` gana `iconSrc` y la talla `dialog` (72). `ProjectHero` hace del avatar un botón (D-1). Diálogo nuevo
  `ProjectIconDialog`, abierto con `ProjectDialogState { kind: "icon"; projectId }` desde `DialogHost`. Errores con los
  textos de las instancias (★ 7 de `vista.md`, aprobada). Detalle en `briefs/frontend.md`.

### Variables de entorno nuevas

Ninguna.

### Delta de RN-04 (lo aplica el orquestador al cerrar)

> Junto a su registro, Code AI Profiles guarda la ruta, el último nombre leído y cuándo se leyó, para reconocer un
> proyecto cuya carpeta se movió o se rompió, y, desde HU-0027, la copia normalizada (PNG de 512 px) del icono que la
> persona eligió con el selector, en `project-icons/` de sus datos. Desanclar borra todo eso, también la copia.

RN-02 no cambia: la imagen no sale de la carpeta del proyecto y no se escribe en ella.

### Plataformas

- **macOS:** `~/Library/Application Support/com.braiyan.claudeprofiles/project-icons/`. Sin firma ni Dock: es solo la app.
- **Windows:** `%APPDATA%\com.braiyan.claudeprofiles\project-icons\`. `fs::rename` reemplaza aunque el webview haya
  leído el archivo (std abre con `FILE_SHARE_DELETE`). URL `http://asset.localhost/C%3A%5C…png?v=N`.
- **Linux:** `~/.local/share/com.braiyan.claudeprofiles/project-icons/` (también AppImage).

### Riesgos

- **Contrato** (`riesgo: [contrato]`): campo nuevo en `ProjectSummary`; todos los mocks y constructores deben llevarlo.
- **Datos reales:** `projects.json` del mantenedor. Lectura compatible; un proyecto sin icono se guarda igual que hoy
  (`skip_serializing_if`). **Bajar de versión** pierde el campo al primer guardado y deja el PNG huérfano; volver a
  subir enseña la inicial. Aceptado, sin barrido de huérfanos.
- **Permiso:** el webview puede leer cualquier `.png` de `project-icons/`: solo hay iconos. Alternativa sin ampliar el
  scope (un comando que devuelva los bytes) descartada por coste.
- **Carrera:** una lista en vuelo cuya parte con candado terminó antes de guardar el icono puede traer el anterior
  hasta la siguiente lectura. Ventana de milisegundos; aceptada.
- **Pendiente humano:** imagen real en 16 px y el icono en Windows y Linux (no hay runner con interfaz).

### Pruebas que no pueden faltar

Cargo (`projects/tests.rs`, `icon_image.rs`): poner (archivo 512×512 en la ruta del UUID, `revision` crece, la carpeta
del proyecto intacta byte a byte), imagen no válida (error, sin archivo, registro igual), quitar (idempotente),
desanclar borra el PNG y reanclar da `icon: null`, registro con icono y archivo ausente o enlace (resumen sin icono,
registro intacto), `projects.json` antiguo sin `icon` y sin el campo al reescribir, proyecto roto con icono (Rust lo
informa), id inválido. `test:projects`: `visibleIcon` y `project/loaded` con y sin icono. `test:messages` con la ruta
nueva. `test:ui` sin cambios (debe seguir en verde). `pnpm build`.

## Orden y paralelismo

1. **Backend, paso 1:** `src/types.ts` y `src/lib/bridge.ts` (contrato y mocks), commit propio. Desbloquea al frontend.
2. **En paralelo:** backend sigue con Rust y `tauri.conf.json`; frontend con `src/features/**`, `src/app/**`,
   `src/lib/{icon-validation,local-asset}.ts` y `tests/`. Archivos disjuntos.
3. Revisión técnica antes de la prueba humana.

Modelos: backend **opus** (registro real del mantenedor, borrado de archivos, contrato y scope del asset protocol);
frontend **sonnet**.
