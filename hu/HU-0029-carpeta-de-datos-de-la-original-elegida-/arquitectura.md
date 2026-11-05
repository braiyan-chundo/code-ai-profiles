# Arquitectura · HU-0029 · Carpeta de datos de la original elegida por la persona

## Análisis

Confianza: **alta**. El selector nativo (`project_picker.rs`, `tauri-plugin-dialog`, solo desde Rust), la escritura
atómica (`write_file_atomic`), la comparación de rutas (`path_is_within`) y el refresco por alcance (`RefreshScope`)
ya existen. Lo nuevo es una **única resolución** de la carpeta de la original que sustituye a las llamadas sueltas a
`detect_original_profile()`, un archivo de preferencia y dos comandos.

Leído: `hu.md`; `src-tauri/src/{processes.rs (1-21), scan.rs (RefreshScope, system_info_seed, system_info_scoped,
dashboard_from_scope*), projects.rs (environment, 496-525), sessions/transfer.rs (resolve_transfer_profile y sus 3
llamadas), sessions/mod.rs (read_code_sessions, code_transcript_catalog), versions/topology.rs (1-45), storage.rs
(AppState::with_registry_operation, ManagedPaths, write_file_atomic, path_is_within), project_picker.rs, commands.rs,
lib.rs, contract.rs (SystemInfo), test_support.rs, platform/{macos,windows,linux,unsupported}.rs}`; `src/{types.ts,
lib/bridge.ts (mockState, pickProjectFolder), features/dashboard/{dashboard-store,dashboard-selectors,
dashboard-context}.ts, features/dashboard/DashboardProvider.tsx (runAction), features/original-app/OriginalDetail.tsx,
app/routes/original/OriginalRoute.tsx, features/instances/useInstanceActions.ts}`; `tests/{dashboard-state,
source-update-controller}.test.ts`; `grafo.mjs impacto "detect_original_profile"` (sin consumidores en el grafo: se
consume por literal, comprobado con `rg`).

Hechos que deciden el diseño:

- `detect_original_profile()` se llama en **4 archivos**, pero la carpeta llega a **6 sitios**:
  `original_instance_status_with_inventory` (processes.rs) la usan `system_info_scoped`, `build_version_topology`
  (topology.rs; a su vez desde scan.rs, `original_update.rs:1548` y `versions/synchronize.rs:256`) y
  `resolve_transfer_profile` (3 llamadas en transfer.rs). **Todos esos llamadores ya tienen `ManagedPaths`** a mano.
- `AppState::with_registry_operation` es el candado de las operaciones; `dashboard_from_scope` lo toma por dentro. El
  selector es bloqueante (`blocking_pick_folder`): **no puede abrirse con el candado tomado**, o el panel se congela
  mientras la persona elige.
- `SystemInfo.original_profile_path` solo se rellena con `scope.sessions`; el estado de la original, con
  `scope.processes`; la topología (que depende del estado), con `scope.topology`. Elegir carpeta puede pasar la
  original de `missing` a `stopped`: el refresco posterior tiene que incluir los tres.
- `ManagedPaths` se construye a mano en `test_support.rs:37` y `sessions/links.rs:267`; `SystemInfo`, en
  `scan.rs:615` (prueba) y en `tests/source-update-controller.test.ts:292`.

### Impacto

Rust: `processes.rs`, `scan.rs`, `projects.rs`, `sessions/transfer.rs`, `versions/topology.rs`, `storage.rs`,
`contract.rs`, `commands.rs`, `lib.rs`, `test_support.rs`, `sessions/links.rs` (literal), módulo nuevo
`original_profile.rs`. TS: `types.ts`, `bridge.ts`, `dashboard-store.ts`, `OriginalDetail.tsx`, `OriginalRoute.tsx`,
`tests/{dashboard-state,source-update-controller}.test.ts`. Nada de red, procesos ni instancias.

### Restricciones

- **Plataformas.** Nada es específico de una plataforma: la resolución, la validación y el archivo son `std::fs` y
  `Path`, iguales en las tres; `platform/*.rs` **no se toca** (la detectada sigue siendo la de hoy). Notas:
  Windows compara `claude-code-sessions` sin distinguir mayúsculas, `is_symlink()` es verdadero también para las
  uniones (junctions) y `fs::canonicalize` devuelve `\\?\C:\…`: se usa **solo para comparar**, nunca se guarda ni se
  muestra. En Windows MSIX la carpeta real suele estar en `%LOCALAPPDATA%\Packages\<familia>\LocalCache\Roaming\
  Claude`; la app no la adivina (fuera de alcance), la persona la elige. En macOS `~/Library` está oculta en el
  selector: por eso se abre en la carpeta que contiene la detectada (A-4). Linux usa el portal/GTK que ya usa
  Proyectos.
- **Privacidad.** Se guarda solo la ruta. Validar y resolver usan solo `symlink_metadata`/`is_dir` y `canonicalize`:
  **ningún archivo se abre** ni se lista. Las sesiones se siguen leyendo con `read_code_sessions`, los mismos
  metadatos de hoy. La ruta no se registra en logs.
- **Migraciones.** Ninguna: sin `original-profile.json` todo funciona como hoy. Una versión anterior ignora el archivo.
- **Regresiones posibles.** Estado «No detectada» de la original, topología y sincronización (dependen del estado),
  transferencias desde/hacia la original y la lista de exclusión de Proyectos.

## Solución

### A-1 · Contrato IPC (aditivo; 0.x, sin major)

```rust
// contract.rs
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub(crate) enum OriginalProfileOrigin { Chosen, Detected, None }
// SystemInfo gana, después de original_profile_path (que pasa a ser la carpeta EFECTIVA):
pub(crate) original_profile_origin: OriginalProfileOrigin,
pub(crate) original_profile_has_sessions: bool,     // la efectiva tiene `claude-code-sessions/`
pub(crate) original_profile_chosen_missing: bool,   // hay una elegida guardada y ya no vale (D-5)
```

```ts
// types.ts
export type OriginalProfileOrigin = "chosen" | "detected" | "none";
// SystemInfo gana, tras originalProfilePath:
originalProfileOrigin: OriginalProfileOrigin;
originalProfileHasSessions: boolean;
originalProfileChosenMissing: boolean;
```

Semilla (`system_info_seed`, `EMPTY_DASHBOARD`): `"none"`, `false`, `false`. Los cuatro se rellenan juntos en el
bloque `scope.sessions` de `system_info_scoped`, desde la misma resolución que da `originalProfilePath`.

### A-2 · Una sola resolución (`src-tauri/src/original_profile.rs`, nuevo)

```rust
pub(crate) struct OriginalProfile {
    pub(crate) path: Option<PathBuf>,         // efectiva
    pub(crate) origin: OriginalProfileOrigin,
    pub(crate) has_code_sessions: bool,
    pub(crate) chosen_missing: bool,
    pub(crate) detected: Option<PathBuf>,     // para la exclusión de Proyectos
    pub(crate) chosen: Option<PathBuf>,       // la guardada, valga o no
}
pub(crate) fn resolve_original_profile(paths: &ManagedPaths) -> OriginalProfile;   // nunca falla
pub(crate) fn resolve_original_profile_with(chosen: Option<PathBuf>,
    detect: impl FnOnce() -> Option<PathBuf>, app_data: &Path) -> OriginalProfile; // pura, para pruebas
```

1. `detected = detect()` (siempre; es `detect_original_profile`).
2. Si `chosen` pasa `validate_original_profile_folder(chosen, app_data)` **y** el resultado es la misma ruta →
   `path = chosen`, `origin = Chosen`, `has_code_sessions = true`, `chosen_missing = false`.
3. Si no → `chosen_missing = chosen.is_some()`, `path = detected`, `origin = Detected | None`,
   `has_code_sessions = detected.join("claude-code-sessions").is_dir()`.

La elegida se revalida en **cada** resolución (borrada, renombrada, convertida en enlace o sin `claude-code-sessions`
→ D-5). Coste: un archivo pequeño y unos `stat`; hoy ya se llama a `detect` en los mismos sitios.

**Los llamadores**, todos con `ManagedPaths`:

| Sitio | Hoy | Pasa a |
| --- | --- | --- |
| `processes.rs` `original_instance_status_with_inventory` | `(inventory)` | `(paths, inventory)`; `resolve(paths).path.is_none()` → `Missing` |
| `versions/topology.rs:23` | `(inventory)` | `(paths, inventory)` |
| `scan.rs` bloque `scope.sessions` | `detect_original_profile()` | `resolve(paths)`: sesiones de `path` + los 4 campos |
| `scan.rs` bloque `scope.processes` | `(inventory)` | `(paths, inventory)` |
| `sessions/transfer.rs` `resolve_transfer_profile` | `(registry, id, inventory)` | `(paths, registry, id, inventory)`; `path` efectiva |
| `projects.rs` `environment` | `detect_original_profile()` | deny += `path`, `detected` y `chosen` (las tres, sin duplicar) |

Después, **`detect_original_profile` solo se llama desde `original_profile.rs`** (comprobable con `rg`).

### A-3 · Validación (D-2, D-4) y persistencia (D-3)

`validate_original_profile_folder(picked: &Path, app_data: &Path) -> Result<PathBuf, String>`, solo metadatos:

1. `picked` absoluta y `symlink_metadata` correcto, si no → M-1. Enlace simbólico (o unión) → M-2. No carpeta → M-1.
2. Si su nombre es `claude-code-sessions` (sin distinguir mayúsculas) → `perfil = padre`, con las mismas comprobaciones.
3. `perfil/claude-code-sessions`: `symlink_metadata` carpeta real; si falta o no es carpeta → M-3; si es enlace → M-2.
4. `path_is_within(perfil, app_data) || path_is_within(app_data, perfil)` → M-4.
5. `perfil.to_str()` es `None` → M-5. Devuelve `perfil` **tal como lo dio el selector** (sin canonicalizar).

Mensajes literales (Rust → el `Err` que pinta `FeedbackArea`):

- **M-1** «La carpeta elegida no existe o no es una carpeta. No se guardó nada.»
- **M-2** «La carpeta elegida es un enlace simbólico. Elige la carpeta real. No se guardó nada.»
- **M-3** «Esa carpeta no tiene «claude-code-sessions». Elige la carpeta de datos de Claude que la contiene. No se guardó nada.»
- **M-4** «Esa carpeta es de los datos de Code AI Profiles, donde viven las instancias. Elige la de la aplicación original. No se guardó nada.»
- **M-5** «La ruta de la carpeta elegida no se puede guardar. No se guardó nada.»
- **M-6** «No se pudo guardar la carpeta elegida: {error}» · **M-7** «No se pudo volver a la carpeta detectada: {error}»

Archivo: `ManagedPaths.original_profile = app_data.join("original-profile.json")`, contenido `{"path":"<ruta>"}`
(`#[serde(rename_all = "camelCase")] struct OriginalProfileChoice { path: String }`), escrito con
`write_file_atomic(…, ".original-profile")`. Ausente o dañado → sin elegida (no rompe el panel; la siguiente
elección lo sobrescribe). Olvidar = `remove_file`, `NotFound` cuenta como éxito.

### A-4 · Comandos IPC

```rust
// commands.rs, registrados en lib.rs junto a pick_project_folder
pub(crate) async fn choose_original_profile_folder(app: AppHandle) -> Result<Option<DashboardState>, String>;
pub(crate) async fn forget_original_profile_folder(app: AppHandle) -> Result<DashboardState, String>;
```

- **Elegir:** `spawn_blocking` → selector (título «Elige la carpeta de datos de Claude», padre `main`,
  `set_directory` = padre de la detectada si existe, si no el home; solo se calcula la ruta) **sin candado**. Cancelar →
  `Ok(None)`, nada cambia. Con una ruta: `with_registry_operation(|| validar + guardar)`; error → `Err(M-n)` sin
  escribir. Fuera del candado: `dashboard_from_scope_async(app, RefreshScope::ORIGINAL_PROFILE, "La actualización del
  panel")` → `Ok(Some(dashboard))`.
- **Olvidar:** `with_registry_operation(|| forget)` y el mismo refresco.
- `RefreshScope::ORIGINAL_PROFILE = Self { sessions: true, topology: true, ..Self::LIGHT }` (procesos, sesiones y
  topología; nada de versiones ni almacenamiento).
- Sin dependencias, sin capacidades nuevas: el diálogo se abre desde Rust como en Proyectos.

```ts
// bridge.ts
chooseOriginalProfileFolder(): Promise<DashboardState | null>;   // call("choose_original_profile_folder")
forgetOriginalProfileFolder(): Promise<DashboardState>;          // call("forget_original_profile_folder")
```

Mocks: `mockState().system` lleva `originalProfileOrigin: "detected"`, `HasSessions: true`, `ChosenMissing: false`
(como hoy). Con `?original=sin-sesiones` en `location.search` (antes del `#`) arranca en detectada sin sesiones y
`originalCodeSessions: []`. `chooseOriginalProfileFolder` alterna: 1.ª vez rechaza con M-3; 2.ª acepta
`"/Users/demo/Datos de Claude"` (`chosen`, sesiones de ejemplo). `forget` vuelve al arranque.

### A-5 · Pantalla (lo que llega y lo que se ve)

Función pura `originalProfileView(system)` en `src/features/original-app/original-profile.ts`:

| Caso | `label` «Perfil local» | Aviso | Ruta y acciones |
| --- | --- | --- | --- |
| `chosen` | «Elegido» | — | ruta + «Cambiar carpeta» + «Usar la detectada» |
| `detected` con sesiones, sin `chosenMissing` | «Detectado» | — (como hoy) | — |
| `detected` sin sesiones | «Sin sesiones» | sin sesiones | «Elegir carpeta» |
| `none` | «Sin detectar» | sin sesiones | «Elegir carpeta» |
| `chosenMissing` (cualquier detectada) | según la detectada | elegida ya no existe | «Elegir carpeta» + «Usar la detectada» |

Textos del aviso (`Alert`, entre la tarjeta principal y la de sesiones):

- Sin sesiones: título «No se encontraron las sesiones de Claude», texto «No están en la carpeta habitual. Elige la
  carpeta de datos de Claude: la que contiene «claude-code-sessions».»
- Elegida ya no existe: título «La carpeta elegida ya no existe», texto «Se usa la carpeta detectada. Elige otra o
  vuelve a la detectada.»

### A-6 · Regla de negocio (delta al cerrar)

RN-07 **nace** en un archivo nuevo `docs/producto/reglas/sesiones.md` (dominio «Sesiones de la original: de dónde se
leen»), con el texto de `hu.md` y «Desde HU-0029». Fila nueva en `docs/producto/reglas/README.md`.
**No se toca `instancias.md`** (hay un PR abierto que lo cambia; el README puede chocar con él: fila al final).
Documentación funcional: `docs/sesiones.document.md` y `CHANGELOG.md` («Añadido»), las actualiza el orquestador.

## Orden y paralelismo

1. **backend** (opus): todo Rust + contrato TS (`types.ts`, `bridge.ts`, `dashboard-store.ts`, fixture de
   `tests/source-update-controller.test.ts`). Commitea primero el paso de contrato TS.
2. **frontend** (sonnet): empieza cuando el contrato TS esté commiteado; archivos disjuntos con backend.

## Riesgos

- **R-1 · Candado durante el selector** (congela el panel): el selector va fuera de `with_registry_operation`.
- **R-2 · Estado y topología desfasados** tras elegir: `RefreshScope::ORIGINAL_PROFILE` incluye `topology`.
- **R-3 · Transferencias escriben en la carpeta elegida**: son datos reales de la persona. Mismas garantías de hoy
  (perfiles detenidos, respaldo, vuelta atrás); una sesión vinculada que se «devuelve» irá a la carpeta efectiva del
  momento. Se acepta.
- **R-4 · Pendiente humano (de `hu.md`):** si Claude MSIX 4.16336 no crea `claude-code-sessions` en ningún sitio, M-3
  rechazará toda carpeta y el problema de Windows sigue abierto (otra historia).
- **R-5 · Prueba humana en macOS:** con sesiones en la carpeta habitual el aviso no sale (D-1). Se prueba con el mock
  `?original=sin-sesiones` y en el Windows real; **nunca** renombrando los datos reales de Claude.
- **R-6 · `claude-code-sessions` borrada dentro de la elegida** muestra «La carpeta elegida ya no existe» (texto de
  D-5) aunque la carpeta exista. Se acepta por simplicidad; observación para la revisión.
