# Arquitectura · HU-0023 · Proyectos: resumen de proyectos con metodología v4

Architect · 2026-10-29 · rama `hu-0022-configuracion-unificada` (HEAD `fe6f7f2`). Solo análisis, contrato y briefs.

## Análisis

Confianza: **alta** en la lectura del método (el formato sale de `hu.mjs` y `metricas.mjs` de la v4 y lo comprobé
contra este repo: 7 terminadas, 3383 min, 571 504 427 tokens, 97,8 % de lectura de caché y 2 743 865 de entrada +
salida, las mismas cifras de `vista.md`). **Media** en TCC de macOS (cuándo exactamente aparece el aviso del
sistema, ver A-6): solo se confirma con la app empaquetada.

Leído: `hu.md`, `seguimiento.md`, `diseno/vista.md`, la maqueta (flujo de anclar), `metodologia4/metricas-y-actividad.md`
§2, `plantillas/scripts/hu.mjs` (parser del frontmatter, estados, carpetas `^HU-\d{4}(-|$)`), `plantillas/config/config.json`,
`.metodo/config.json` y `hu/*/metricas.json` de este repo, `docs/arquitectura/{backend,frontend}.md`, ADR-0002,
`src-tauri/src/lib.rs` (`ManagedPaths` L749, `load_registry`/`save_registry` L788-809, `atomic_replace_file` L2703,
`open_instance_folder` L5100, `detect_original_profile` L1138, `generate_handler!` L5307), `Cargo.toml`/`Cargo.lock`
(`cargo tree -i`), `capabilities/default.json`, `tauri*.conf.json`, `src/app/router.tsx`, `AppSidebar.tsx`,
`AppProviders.tsx`, `dialogs-context.ts`, `src/lib/bridge.ts`, `src/lib/errors.ts`, `tests/ui-isolation.test.ts` (8).
Grafo: `graphify query`, `grafo.mjs impacto` de `AppSidebar` (AppShell → router → App) y `ManagedPaths` (113 usos:
por eso **no** se toca, ver A-2).

Hoy un archivo se elige con `<input type="file">` + `FileReader` (icono, `InstanceEditor.tsx:144`). Para carpetas no
sirve: el webview no da la ruta. **No hay selector nativo** en el proyecto (ni `tauri-plugin-dialog` ni `rfd`).

### Supuestos

- **S-1** · El formato v4 es el de `hu.mjs`: frontmatter YAML plano (escalares, `[listas]`, `{ objetos }`), estados
  `en-espera · en-proceso · terminada · descartada`, bitácora con filas `| AAAA-MM-DD HH:MM | quién | qué |` en hora
  local sin zona, y `metricas.json` con `minutosTotales`, `agentes[].tokens` y `orquestador.porFase[].tokens`. Si una
  versión 4.x cambia el formato, lo desconocido sale como aviso por campo, sin romper.
- **S-2** · Los repos de un proyecto v4 viven dentro de su carpeta (`ruta` relativa, como en la plantilla). Uno que
  salga de ella se lista y no se lee.
- **S-3** · Elegir la carpeta con el panel nativo (`NSOpenPanel`) cuenta como intención de la persona: en esa sesión
  macOS no pregunta. En un arranque posterior, leer una carpeta de Escritorio, Documentos o Descargas puede mostrar
  **una vez** el aviso de TCC por cada una de esas carpetas.
- **S-4** · La fecha que enseña git (D-5) es cuándo llegó el commit actual a la rama (reflog), no la fecha del commit
  (ver A-1.5). Para un commit hecho en local son la misma.

### Preguntas (solo el mantenedor)

1. **Dependencia nueva para el selector de carpetas.** ¿Autorizas `tauri-plugin-dialog` 2.x (crate oficial de Tauri;
   por dentro usa `rfd` y arrastra `tauri-plugin-fs` como crate, sin registrarlo)? Se usa **solo desde Rust**
   (`app.dialog().file().blocking_pick_folder()`): sin paquete npm, sin tocar `capabilities/default.json` y sin red.
   En Linux usa GTK3, que Tauri ya enlaza. **Recomiendo: sí.** Alternativas: `rfd` directo (menos crates, pero el hilo
   principal de macOS y la ventana padre los gestionas tú) o sin dependencia (pegar la ruta y arrastrar la carpeta a
   la ventana: no es «selector nativo» y la maqueta no lo enseña). La lista exacta de crates nuevos sale de
   `cargo tree` al añadirla; si trae algo más que `rfd`, `tauri-plugin-fs` y sus enlaces de plataforma, backend para.
2. **Textos del aviso de macOS.** ¿Añadimos `src-tauri/Info.plist` con `NSDesktopFolderUsageDescription`,
   `NSDocumentsFolderUsageDescription` y `NSDownloadsFolderUsageDescription` («Code AI Profiles lee, sin cambiar
   nada, los archivos del método de los proyectos que anclas»)? No pide ningún permiso nuevo: solo da texto al aviso
   que macOS ya mostraría. **Recomiendo: sí.**
3. **Lectura al abrir la app.** El sidebar enseña el contador «en curso» de cada proyecto, así que la lista se lee al
   arrancar. Si un proyecto está en Documentos, el aviso de TCC (S-3) puede salir al abrir la app y no al entrar en
   Proyectos. **Recomiendo: leer al arrancar** (el aviso sale como mucho una vez por carpeta, y solo si la persona
   ancló algo ahí). Alternativa: al arrancar, solo lo guardado (nombre, sin contador) y leer al entrar en Proyectos.

Los briefs están escritos con las tres respuestas recomendadas; dicen qué cambia si no.

### Impacto

| Símbolo que cambia | Consumidores (grafo / `rg`) | Qué se rompe |
| --- | --- | --- |
| `generate_handler!` en `run()` | — | Nada: 6 comandos nuevos. Conflicto de edición si HU-0022 toca a la vez `lib.rs` |
| `open_instance_folder` | `bridge.openInstanceFolder` | Se extrae `open_in_file_manager(&Path)`; mismo comportamiento |
| `ManagedPaths` | 113 (lib.rs, macos_icon.rs, original_update.rs) | **No cambia**: `projects.rs` recibe `&paths.app_data` |
| `src/types.ts`, `src/lib/bridge.ts` | toda la app | Solo tipos y funciones nuevas |
| `router.tsx` | `App.tsx` | Dos rutas `lazy` nuevas antes de `*` |
| `AppSidebar.tsx` | `AppShell` | Grupo nuevo; altura a 980×680 (desplazamiento con fundido de la maqueta) |
| `AppProviders.tsx`, `dialogs-context.ts`, `DialogHost.tsx` | todas las pantallas | Un proveedor y una bandera nuevos |
| Configuración › Permisos (HU-0022) | — | La tarjeta «Archivos y carpetas» de macOS recibe un dato de esta historia (A-6) |

- **Contrato:** sí, aditivo (0.x, sin major). Ningún tipo existente cambia.
- **Datos guardados:** sí, archivo nuevo `<app_data>/projects.json` (A-2). Sin migración: si no existe, la lista está vacía.
  `instances.json` y `session-links.json` no se tocan.
- **Permisos:** TCC de macOS (A-6). Ningún permiso nuevo en Tauri. Datos personales: los nombres de `figuras` del
  proyecto se muestran y no se guardan. **Riesgosa:** sí (`riesgo: [permisos]`, lectura de carpetas ajenas y una
  dependencia nueva). Revisión técnica obligatoria.

### Plataformas

| | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Selector | `NSOpenPanel` (plugin, hilo principal resuelto por el plugin) | `IFileOpenDialog` | GTK3 (o portal si el plugin lo usa) |
| Permisos | TCC: Escritorio, Documentos, Descargas, iCloud Drive, volúmenes de red o extraíbles (A-6) | Ninguno | Ninguno (`.deb`/AppImage, sin sandbox) |
| Archivos en la nube | iCloud: archivo *dataless* (`st_flags & SF_DATALESS`) → no se lee, aviso | OneDrive: `FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS`/`OFFLINE` → no se lee, aviso | — |
| Rutas | `/private/var` al canonicalizar | `\\?\` al canonicalizar: se quita al guardar y mostrar; comparación sin distinguir mayúsculas | sensible a mayúsculas |
| Abrir carpeta | `/usr/bin/open` | `explorer.exe` | `xdg-open` |
| Texto | `\n` | `\r\n` (autocrlf) y BOM en cualquier archivo | `\n` |

Leer un archivo en la nube sin descargar haría que el sistema lo baje: sería red por la puerta de atrás. Por eso se salta.

## Solución

### A-1 · Lectura del proyecto (D-1: solo lectura, sin ejecutar nada)

Módulo hijo `src-tauri/src/projects.rs` (ADR-0002: flujo autocontenido; `use super::*` solo para lo común), con
`projects/method.rs` (config, frontmatter, métricas, bitácora), `projects/tech.rs` (manifiestos) y `projects/git.rs`.
Los `#[tauri::command]` son envoltorios finos en `lib.rs` con `spawn_blocking`. **Ningún `Command::new`** en la lectura;
solo `fs::symlink_metadata`, `fs::canonicalize`, `File::open` + `take(límite)`. Ninguna escritura en la carpeta.

Todo pasa por un `ReadContext { root_canonical, deny: Vec<PathBuf>, home: Option<PathBuf> }` inyectable en pruebas, y
por una sola función de lectura `read_capped(rel, limit) -> Result<Vec<u8>, Skip>`:

1. `root.join(rel)`, `canonicalize`, debe empezar por `root_canonical` (si no: `Skip::Outside`). Así un symlink que
   salga de la carpeta no se sigue.
2. Debe ser archivo regular; *dataless* / *recall on access* → `Skip::Cloud`.
3. Tamaño ≤ límite; si no, `Skip::TooLarge`. Lee con `take(limit + 1)`.
4. UTF-8 con pérdida, sin BOM, `\r\n` → `\n`.

Cada `Skip` es un aviso (`ProjectWarning`) con el archivo relativo y nunca con su contenido.

| Límite | Valor |
| --- | --- |
| `.metodo/config.json`, `package.json`, `composer.json` | 1 MiB |
| `hu.md` (solo el frontmatter) | 64 KiB leídos; si el cierre `---` no aparece, aviso |
| `metricas.json` | 2 MiB |
| `seguimiento.md` | los últimos 1 MiB |
| Otros manifiestos | 512 KiB |
| `packed-refs` | 8 MiB · reflog: los últimos 64 KiB |
| Historias | 2000 carpetas (orden por nombre); el resto, un aviso `limit` |
| Repos | 32 · Proyectos anclados: 100 |
| Textos que llegan a la UI | título 200, resumen 1000, el resto 120 caracteres; sin caracteres de control |

**Lista de exclusión (`deny`)**, comparando rutas canónicas: `<home>/.claude`, `app_data_dir` (incluye perfiles y
copias administradas) y `detect_original_profile()`. Una carpeta dentro de cualquiera → `forbidden`. Un repo cuya ruta
caiga en una → `forbidden`, sin leer. Aunque la persona ancle su `home`, solo se leen las rutas de abajo.

#### A-1.1 · `.metodo/config.json`
`serde_json::Value`, sin structs rígidos. `version` numérico `4` → v4; otro número → `notV4` con `configVersion`;
ausente o no numérico → `notV4` con `configVersion: null`; JSON inválido → `configBroken` (mensaje con línea y columna
de serde, nunca el texto). Campos: `proyecto.{nombre, slug, resumen}`, `perfil`, `fase`, `figuras.aprueba`,
`repos[].{nombre, ruta, tipo}`, `stack.{gestor, packs}`. Uno ausente o de tipo raro → `null` + aviso `config` con el
campo. Sin nombre, se usa el de la carpeta.

#### A-1.2 · Historias
Carpetas de `hu/` que cumplen `^HU-\d{4}(-|$)` y tienen `hu.md`, como `hu.mjs historias()`. Parser propio del
frontmatter, portado de `leerFm`/`escalar`/`lista`/`objeto` (sin `serde_yaml`), tolerante a `\r\n`. Se usan `id`
(si falta, el prefijo de la carpeta), `titulo`, `estado`, `fase`, `area`, `prioridad`, `creada`. Estado fuera de los
cuatro → `unknown` + aviso. Los recuentos son los de `hu/INDEX.md` porque salen de los mismos archivos.

#### A-1.3 · Métricas (decisiones 1-3 del mantenedor)
De `metricas.json`: `minutosTotales` y la suma, por tipo, de `agentes[].tokens` y `orquestador.porFase[].tokens`
(`entrada`, `salida`, `cacheEscritura`, `cacheLectura`, `total`; un número ausente cuenta 0 con aviso). Se ignoran
`modelos`, `notas` y todo lo demás. `countsInTotals = estado == terminada && métricas válidas`. Los totales del
proyecto suman **solo** esas: minutos, tokens por tipo y `byRole` (agentes por `rol`; el orquestador como rol
`orquestador`, `approximate` si algún `orquestador.aproximado`). Una descartada conserva sus cifras en su fila
(la UI las tacha) y no suma. JSON roto → aviso `metrics`, la historia sin cifras.

#### A-1.4 · Fechas (D-3)
`firstCreated` = el `creada` (`AAAA-MM-DD`) más antiguo. `lastActivity` = la fila de bitácora más reciente de todos los
`seguimiento.md` (`^\| (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \|`), devuelta tal cual como `AAAA-MM-DDTHH:MM` (hora local del
proyecto, sin zona; la UI no la convierte). De la bitácora **solo se extrae la fecha**; el resto de la fila se
descarta. `spanDays` = días de calendario de `firstCreated` a la fecha de `lastActivity`, contando ambos (mínimo 1).

#### A-1.5 · Git (D-5), sin red y sin ejecutar `git`
Por repo, `<repo>/.git`:
- Si es un archivo (worktree, submódulo) → `unsupported`. Si no existe → `none`.
- `HEAD`: `ref: refs/heads/<rama>` o un SHA (40/64 hex, `detached`). El nombre de rama se valida (sin `..`, ni
  componentes vacíos, ni `\`) antes de usarlo como ruta.
- SHA: `refs/heads/<rama>` suelto o, si no, la línea de `packed-refs`. Se devuelve el corto (7).
- Fecha (`movedAt`): última línea de `logs/refs/heads/<rama>` (o `logs/HEAD` si está suelto). Si su SHA nuevo coincide
  con el actual, el *timestamp* y la zona de esa línea en RFC 3339; si no, `null`. **Nombre, correo y mensaje de la
  línea se descartan al parsear** (no se guardan ni se envían).
- **No se leen objetos.** Leer el commit exigiría `flate2` como dependencia directa (ya está compilado vía `png`) para
  los objetos sueltos, y un lector de packs con deltas para los empaquetados (todo un clon recién hecho). El coste no
  compensa: el reflog da rama, SHA y fecha para el caso común. Ejecutar `git` en solo lectura se descarta: lee la
  configuración del repo (riesgo de ejecución con un `.git/config` ajeno), puede no estar instalado en Windows y
  contradice D-1.

#### A-1.6 · Tecnologías (D-2)
`projects/tech.rs`, tabla cerrada en el código (nombres de paquete → etiqueta; no es configuración):
- `stack.packs` (tal cual, `source: pack`) y `stack.gestor` (+ la mayor de `packageManager` de `package.json`).
- `package.json`: `dependencies` + `devDependencies` → React, Vite, Tailwind CSS, React Router, TypeScript, Tauri
  (`@tauri-apps/api`), Next.js, Vue, Nuxt, Svelte/SvelteKit, Angular, NestJS, Express, Fastify, Astro, Expo, React
  Native, Electron, Prisma, Mongoose. La versión es la mayor del rango (`^19.0.0` → `19`); `workspace:`/`*`/git → sin versión.
- `Cargo.toml`: lector de líneas propio (sin `toml`), secciones `[package]` → Rust, `[dependencies]`,
  `[target.*.dependencies]` → Tauri, Axum, Actix Web, Tokio.
- `pyproject.toml` / `requirements.txt` → Python (+ Django, FastAPI, Flask); `go.mod` → Go `<go x.y>` (+ Gin, Echo,
  Fiber); `composer.json` → PHP (+ Laravel, Symfony); `Gemfile` → Ruby (+ Rails); `pom.xml`, `build.gradle(.kts)` →
  Java/Kotlin; `pubspec.yaml` → Dart/Flutter. Solo la raíz de cada repo; no se recorren subcarpetas.

### A-2 · Persistencia de los anclados (decisión 4)

`<app_data>/projects.json`, junto al registro (`paths.app_data`; `ManagedPaths` no cambia):

```json
{ "version": 1, "projects": [
  { "id": "<uuid v4>", "path": "/Users/x/Proyectos/vetcare", "lastName": "Vetcare",
    "pinnedAt": "2026-10-29T05:10:00Z", "lastReadAt": "2026-10-29T05:12:31Z" } ] }
```

- `path` es la ruta canónica sin el prefijo `\\?\` de Windows. Anclar la misma carpeta (comparación canónica, sin
  distinguir mayúsculas en Windows y macOS) devuelve el id que ya tenía: idempotente.
- `lastName` y `lastReadAt` se actualizan en cada lectura correcta, y solo si cambian. Una carpeta rota conserva ambos.
- **Escritura atómica propia** (`write_json_atomic`): temporal `.projects-<uuid>.tmp` en la misma carpeta, `sync_all`,
  `fs::rename` (reemplaza en las tres plataformas), y borrar el temporal si algo falla. Se serializa con un mutex
  propio (`projects_mutex`, `OnceLock<Mutex<()>>`), no con `with_registry_operation`, para no bloquear las instancias.
  Las lecturas de las carpetas van **fuera** del mutex; el mutex cubre releer + aplicar + guardar.
- Archivo dañado o `version > 1` → `Err` («El registro de proyectos está dañado…») y **no se sobrescribe**. Ausente →
  lista vacía.
- Nada más se guarda: ni cifras, ni historias, ni personas.

### A-3 · Contrato IPC (aditivo, 0.x)

Comandos (`lib.rs`, envoltorios con `spawn_blocking`; mensajes de `Err` en español para la persona):

| Comando | Argumentos | Devuelve | Notas |
| --- | --- | --- | --- |
| `list_projects` | — | `ProjectsState` | Lee todos los anclados, en orden de guardado |
| `read_project` | `id` | `ProjectSummary` | `id` UUID que esté en el registro; si no, `Err` «El proyecto ya no está anclado.» |
| `pick_project_folder` | — | `ProjectCandidate \| null` | Abre el selector nativo con la ventana `main` de padre; `null` si se cancela; inspecciona sin anclar |
| `pin_project` | `path` | `ProjectSummary` | Vuelve a validar en Rust; si no es `v4`, `Err` con el motivo. Guarda y lee |
| `unpin_project` | `id` | `null` | Borra la entrada. No toca la carpeta |
| `open_project_folder` | `id` | `null` | Ruta del registro, nunca del frontend; debe existir y ser carpeta |

`src/types.ts` (literal):

```ts
export type ProjectStatus =
  | "v4" | "notV4" | "noConfig" | "configBroken" | "notFound" | "notDirectory" | "permissionDenied" | "forbidden";
export type ProjectProtectedLocation = "desktop" | "documents" | "downloads" | "icloud" | "external";
export type ProjectHistoryState = "waiting" | "inProgress" | "done" | "discarded" | "unknown";
export type ProjectRepoStatus = "ok" | "missing" | "outside" | "forbidden" | "unreadable";
export type ProjectGitStatus = "ok" | "none" | "unsupported" | "unreadable";
export type ProjectWarningScope = "config" | "history" | "metrics" | "timeline" | "repo" | "manifest" | "git" | "limit";

export interface TokenBreakdown { input: number; output: number; cacheWrite: number; cacheRead: number; total: number }
export interface ProjectWarning { scope: ProjectWarningScope; target: string | null; message: string }
export interface ProjectCandidate {
  path: string; displayPath: string; status: ProjectStatus; message: string | null;
  configVersion: number | null; name: string | null; profile: string | null; phase: string | null;
  historyCount: number | null; repoCount: number | null; alreadyPinnedId: string | null;
}
export interface ProjectGit {
  status: ProjectGitStatus; branch: string | null; detached: boolean; shortSha: string | null; movedAt: string | null;
}
export interface ProjectRepo {
  name: string; path: string; kind: string | null; status: ProjectRepoStatus; manifests: string[]; git: ProjectGit | null;
}
export interface ProjectTechnology { name: string; version: string | null; source: "pack" | "packageManager" | "manifest"; repo: string | null }
export interface ProjectHistory {
  id: string; folder: string; title: string; state: ProjectHistoryState; phase: string | null; area: string | null;
  priority: string | null; created: string | null; minutes: number | null; tokens: TokenBreakdown | null;
  countsInTotals: boolean;
}
export interface ProjectRoleUsage { role: string; tokens: TokenBreakdown; approximate: boolean }
export interface ProjectCounts { total: number; waiting: number; inProgress: number; done: number; discarded: number; unknown: number }
export interface ProjectTotals { histories: number; minutes: number; tokens: TokenBreakdown; byRole: ProjectRoleUsage[] }
export interface ProjectInfo {
  name: string; slug: string | null; summary: string | null; profile: string | null; phase: string | null;
  approver: string | null; packageManager: string | null; packs: string[]; repos: ProjectRepo[];
  technologies: ProjectTechnology[]; histories: ProjectHistory[]; counts: ProjectCounts;
  firstCreated: string | null; lastActivity: string | null; spanDays: number | null; totals: ProjectTotals;
}
export interface ProjectSummary {
  id: string; path: string; displayPath: string; lastName: string | null; pinnedAt: string;
  lastReadAt: string | null; readAt: string; status: ProjectStatus; message: string | null;
  protectedLocation: ProjectProtectedLocation | null; info: ProjectInfo | null; warnings: ProjectWarning[];
}
export interface ProjectsState { projects: ProjectSummary[]; readAt: string }
```

- **Errores tipados** van en los datos, no en el `Err`: un proyecto roto (AC-05) es un estado. `info` existe solo con
  `status === "v4"`. `message` lo redacta Rust en español y la UI lo muestra tal cual. `Err(String)` queda para fallos
  reales (registro dañado, id desconocido, no se pudo abrir el selector o el gestor de archivos).
- `displayPath` reemplaza el `home` por `~`. `protectedLocation` solo en macOS (en las demás, `null`): `external` es
  `/Volumes/*`. `readAt`/`pinnedAt`/`lastReadAt`/`movedAt` en RFC 3339; `created` `AAAA-MM-DD`; `lastActivity` A-1.4.
- Rust: `#[serde(rename_all = "camelCase")]` en structs y enums (`notV4`, `inProgress`).
- `bridge.ts`: `listProjects()`, `readProject(id)`, `pickProjectFolder()`, `pinProject(path)`, `unpinProject(id)`,
  `openProjectFolder(id)`, cada una con su mock (Code AI Profiles con las cifras reales de `vista.md`, Vetcare con 3
  repos, Panel Finanzas `notFound`; el selector mock alterna un candidato `v4` y uno `notV4` con `configVersion: 3`).

### A-4 · Frontend

- **Feature nueva** `src/features/projects/`: `projects-store.ts` (reducer puro), `projects-selectors.ts` (puro),
  `projects-context.ts` + `ProjectsProvider.tsx` (`useReducer`), `useProjects`, `usePinProject`, componentes y `index.ts`.
  Importa solo `dashboard` si lo necesita para la plataforma; **nunca** `instances`, `sessions`, `scan` ni `updates`
  («Solo resumen»).
- **Rutas** (`router.tsx`, `lazy`, antes de `*`): `proyectos` → `app/routes/projects/ProjectsRoute.tsx`;
  `proyectos/:projectId` → `app/routes/project/ProjectRoute.tsx`. Un id que no está en el estado → la página de «no
  encontrado» del proyecto con enlace a `#/proyectos` (no un `Navigate` silencioso).
- **Estado:** `ProjectsProvider` en `AppProviders`, dentro de `DashboardRuntime` y fuera de `DialogsProvider`.
  `{ status: "idle"|"loading"|"ready"|"error", projects, readAt, error, refreshing: Record<id, true> }`.
- **Refresco (D-4):** una carga al montar el proveedor (pregunta 3); al entrar en `#/proyectos`, `listProjects`; al
  entrar en `#/proyectos/:id` (y al cambiar el id), `readProject`; el botón «Actualizar», lo mismo. Las llamadas en
  vuelo se deduplican por clave (StrictMode). **Sin `focus`, `blur`, `visibilitychange`, `listen`, intervalos ni
  sondeo**: R-1 de HU-0015 sigue igual y `test:ui 8` no cambia.
- **Anclar:** «Anclar proyecto» (sidebar, vacía, cabecera de la lista) → `pickProjectFolder` → `null`: nada;
  candidato: bandera `pinCandidate` en `DialogsProvider`, `PinProjectDialog` en `DialogHost`. «Elegir otra carpeta»
  vuelve a llamar al selector; «Anclar» solo con `status === "v4"` (con `alreadyPinnedId`, «Ver proyecto» en su lugar)
  → `pinProject` → a `#/proyectos`, como la maqueta. Desanclar sin confirmación (maqueta).
- **Sidebar:** grupo «Proyectos» bajo «Instancias» como en la maqueta (Todos los proyectos, una fila por proyecto con
  inicial de 16, contador `counts.inProgress`, roto con inicial roja y triángulo, «Anclar proyecto»; plegado, inicial y
  tooltip «<nombre> · N en curso»). La búsqueda sigue filtrando solo instancias.
- **Cálculos de pantalla en selectores puros** (con prueba): orden por `lastActivity` y rotos al final; «572 M»,
  «98 % caché» (`cacheRead / total`), entrada + salida, «56 h» (`minutes / 60`), «Desde» con `spanDays`, fracciones de
  la barra por estado.

### A-5 · Regla de negocio nueva (texto final, `docs/producto/reglas/proyectos.md`)

```markdown
# Reglas de negocio · proyectos

### RN-02 · Un proyecto anclado se lee sin escribir ni ejecutar nada
Desde HU-0023. Solo se admiten proyectos con la metodología v4 (`.metodo/config.json` con `version: 4`). De la
carpeta se leen únicamente `.metodo/config.json`, el encabezado de cada `hu/HU-*/hu.md`, `metricas.json`, la fecha de
cada fila de `seguimiento.md`, los manifiestos de la raíz de cada repo (`package.json`, `Cargo.toml`…) y, de `.git`,
la rama, el commit y la fecha en que llegó a la rama. No se escribe nada en la carpeta ni se ejecuta nada de ella
(ni los scripts del método ni `git`), y no se usa la red. Lo que esté fuera de la carpeta, en `~/.claude`, en los
perfiles o en Code AI Profiles no se lee, aunque el proyecto apunte ahí.

### RN-03 · Los tokens de un proyecto salen solo de sus métricas, y las descartadas no suman
Desde HU-0023. El tiempo en fases y los tokens se suman de los `metricas.json` de las historias terminadas; nunca se
leen transcripciones. Las descartadas muestran sus cifras, tachadas, y no cuentan en los totales.

### RN-04 · La app guarda la ruta y el último nombre leído de cada proyecto
Desde HU-0023. Junto a su registro, Code AI Profiles guarda la ruta, el último nombre leído y cuándo se leyó, para
reconocer un proyecto cuya carpeta se movió o se rompió. Desanclar borra solo eso.
```

Y en `README.md` de reglas, la fila `proyectos.md` · «Proyectos anclados: lectura, consumo y lo que se guarda» · RN-02–RN-04.

### A-6 · Permisos en macOS (TCC) y Configuración › Permisos (HU-0022)

- La app no tiene sandbox ni *entitlements*: no hace falta *security-scoped bookmark*. Lo que aplica es TCC. Leer
  dentro de `~/Desktop`, `~/Documents`, `~/Downloads`, iCloud Drive (`~/Library/Mobile Documents`) o `/Volumes/*`
  puede mostrar el aviso «Code AI Profiles quiere acceder a archivos de tu carpeta Documentos». Elegir la carpeta en
  el panel nativo cubre esa sesión (S-3); el aviso puede salir en un arranque posterior, una vez por carpeta. Aceptado,
  queda en Ajustes › Privacidad › Archivos y carpetas; denegado, cada lectura da `EPERM`.
- Rust: `io::ErrorKind::PermissionDenied` al leer la raíz o la config → `status: "permissionDenied"` con un `message`
  que en macOS remite a Configuración › Permisos y a «Reintentar», y en Windows/Linux a los permisos del archivo. Nunca
  se consulta ni se pide el permiso de antemano; no hay API de Apple para preguntar el estado de TCC sin disparar el aviso.
- Antes de leer nada se calcula `protectedLocation` comparando prefijos con `home` (`dirs::home_dir`) y `/Volumes`
  **sin listar** esas carpetas (un `stat` no dispara el aviso).
- **Para HU-0022:** la tarjeta macOS «Archivos y carpetas» (su texto y su acceso directo son de HU-0022) añade, desde
  `features/projects` (`selectProtectedProjects`), la línea «Lo usan N proyectos anclados en Documentos…» y marca los
  que están en `permissionDenied`. La página de un proyecto en `permissionDenied` enlaza a `#/configuracion` (sección
  Permisos). Si HU-0022 define el inventario como una lista pura, esta historia solo aporta ese dato; no cambia su forma.
- Pregunta 2: los textos `NS*FolderUsageDescription` en `src-tauri/Info.plist` (Tauri lo fusiona al empaquetar).

### Variables de entorno nuevas

Ninguna. No hay URLs, hosts ni identificadores: todo es local. `config.mjs check` no cambia.

### Señales

No hay observabilidad en el proyecto (local, sin telemetría). Ningún `println!` con rutas o contenidos de proyectos.

## Riesgos

| # | Riesgo | Mitigación |
| --- | --- | --- |
| R-1 | Romper la promesa de privacidad leyendo algo de un perfil o de `~/.claude` | `deny` canónico en la raíz y en cada repo; pruebas 12 |
| R-2 | Escribir en la carpeta del proyecto | Ninguna API de escritura en `projects/*` fuera de `write_json_atomic` sobre `app_data`; prueba 13 (huella antes/después) |
| R-3 | Symlink o `ruta` de repo que salga de la carpeta | `read_capped` canonicaliza y exige el prefijo; pruebas 8 y 10 |
| R-4 | Aviso de TCC inesperado al abrir la app | Pregunta 3; textos de la pregunta 2; verificación humana en macOS empaquetado |
| R-5 | Red encubierta (iCloud/OneDrive sin descargar, volumen de red lento) | *dataless*/*recall* se saltan; un volumen de red lento solo retrasa esa lectura, en `spawn_blocking` |
| R-6 | Cifras distintas de `INDEX.md` o de las métricas (AC-03/04) | Mismo filtro de carpetas y estados que `hu.mjs`; prueba 6 con las sumas |
| R-7 | Registro de proyectos perdido | Escritura atómica; dañado → no se sobrescribe |
| R-8 | Conflicto con HU-0022 en `lib.rs`, `AppSidebar`, `DialogsProvider`, `AppProviders` | Orden de abajo: HU-0022 primero en esos archivos |
| R-9 | Selector colgado en Linux sin GTK/portal | El plugin devuelve error → `Err` con texto; verificado en CI y por la persona |
| R-10 | Contraste «en curso» en claro (2,98:1) | Abierto desde la maqueta: leyenda con número y tabla; no lo arregla esta historia |

## Pruebas proporcionales

**Rust** (`#[cfg(test)] mod tests` en `projects.rs`; fixtures escritos por código en `env::temp_dir()/code-ai-projects-<caso>-<uuid>`):

1. v4 válido: 3 historias (en curso; terminada con métricas; descartada con métricas) → recuentos, totales sin la
   descartada, `byRole` con orquestador `approximate`, caché.
2. No v4: `version: 3` → `notV4` + `configVersion 3`; sin `.metodo` → `noConfig`; `version: "4"` → `notV4`.
3. Config rota → `configBroken`, sin pánico, `message` sin el contenido.
4. Frontmatter: ausente, sin cierre, `\r\n` + BOM, estado raro → avisos por historia; las demás bien.
5. `metricas.json` roto o ausente en una terminada → aviso, `countsInTotals: false`.
6. Sumas: los totales igualan la suma de `totales.tokens` y `minutosTotales` de las terminadas del fixture.
7. Bitácora: `firstCreated`, `lastActivity`, `spanDays` inclusivo; filas sin fecha ignoradas.
8. Repos múltiples: `package.json` (React 19, Vite 6, TS), `Cargo.toml` (Tauri 2), `go.mod`; uno ausente (`missing`);
   `../fuera` y ruta absoluta (`outside`).
9. Git: ref suelta + reflog; solo `packed-refs`; HEAD suelto; `.git` archivo (`unsupported`); reflog que no coincide
   (`movedAt: null`); sin `.git`. El JSON serializado no contiene el correo ni el mensaje del reflog.
10. `#[cfg(unix)]` symlinks: `metricas.json` y `hu/` hacia fuera → aviso, no se leen.
11. Límites: archivo mayor que su tope → aviso; más historias que el máximo (con un máximo inyectado) → aviso `limit`.
12. `deny`: carpeta dentro de un `.claude` y de un `app_data` falsos → `forbidden`; repo apuntando ahí → `forbidden`.
13. Solo lectura (AC-06): huella del árbol (ruta, tamaño, `mtime`) igual antes y después de inspeccionar, anclar y leer.
14. Registro: anclar dos veces da el mismo id; desanclar; dañado → `Err` y el archivo intacto; `version: 2` → `Err`;
    sin temporales sobrantes.
15. Carpeta borrada tras anclar → `notFound` conservando `lastName` y `lastReadAt`.
16. `protectedLocation` (función pura con `home` inyectado) y `displayPath` con `~`; quitar `\\?\` (prueba de cadena).

**TypeScript:** `tests/projects.test.ts` (`pnpm test:projects`): reducer y selectores de A-4. `tests/ui-isolation.test.ts`:
caso 15, `features/projects` no importa `instances`, `sessions`, `scan` ni `updates`, y nadie importa
`@tauri-apps/plugin-dialog`. El orquestador añade `pnpm test:projects` a `relacionadas` y `suite` de `.metodo/config.json`.

**Solo una persona:** el selector y TCC en macOS empaquetado (carpeta en Documentos, aceptar y denegar), y el
selector en Windows y Linux (o «solo verificado en CI»).

## Briefs y orden

1. **HU-0022** termina antes sus cambios en `lib.rs`, `AppSidebar.tsx`, `AppProviders.tsx`, `dialogs-context.ts`,
   `DialogHost.tsx` y la página de Configuración. Nadie escribe a la vez en esos archivos.
2. **Backend B-1** (contrato): `types.ts` + `bridge.ts` con mocks. Commit y aviso.
3. **Backend B-2** (Rust) y **frontend** en paralelo: frontend trabaja contra los mocks; no comparten archivos.
4. Revisión técnica (architect) y prueba humana.

Modelos: **backend `opus`** (permisos de macOS, contención de rutas y privacidad, dependencia nueva, tres plataformas);
**frontend `sonnet`** (pantallas sobre un contrato fijado, sin dinero, sesión ni permisos en el cliente).

### Brief · HU-0023 · backend

Criterios: AC-02, AC-03, AC-04, AC-05, AC-06. Modelo: **opus**, por TCC, contención de rutas y privacidad.
Contrato: § A-1, A-2, A-3 y A-6 de este archivo. Espera a que HU-0022 haya commiteado sus cambios en `lib.rs`.

| Archivo | Qué cambia |
| --- | --- |
| `src/types.ts` | Los tipos de A-3, literales, al final (B-1) |
| `src/lib/bridge.ts` | Las 6 funciones con mock (B-1) |
| `src-tauri/src/projects.rs` (nuevo) | Registro (A-2), `ReadContext`, `read_capped`, `deny`, `*_sync`, pruebas |
| `src-tauri/src/projects/{method,tech,git}.rs` (nuevos) | A-1.1-A-1.6 |
| `src-tauri/src/lib.rs` | `mod projects;`, 6 comandos finos, `generate_handler!`, plugin del diálogo en el builder, `open_in_file_manager` extraído de `open_instance_folder` (L5100) |
| `src-tauri/Cargo.toml`, `Cargo.lock` | `tauri-plugin-dialog = "2"` (pregunta 1) |
| `src-tauri/Info.plist` (nuevo) | Tres `NS*FolderUsageDescription` (pregunta 2) |

Pasos:

1. B-1: tipos y `bridge.ts` con mocks; `pnpm build`; commit `HU: HU-0023`; avisa a frontend.
2. Añade el plugin y comprueba `cargo tree -i rfd` y `-i tauri-plugin-fs`: si aparece algo fuera de lo previsto en la
   pregunta 1, para y avisa. **No** toques `capabilities/default.json` ni añadas `@tauri-apps/plugin-dialog`.
3. `pick_project_folder`: `blocking_pick_folder()` dentro de `spawn_blocking`, con la ventana `main` de padre.
4. Lectura (A-1) con `ReadContext` inyectable; `deny` = `home/.claude`, `app_data_dir`, `detect_original_profile()`.
5. Registro (A-2) con `write_json_atomic` y `projects_mutex`; no uses `save_registry` ni `fs::write` directo.
6. `open_project_folder`: la ruta sale del registro; reutiliza `open_in_file_manager`.
7. Mensajes en español en `message` y en `Err`; ningún `unwrap`/`expect` nuevo; ningún `Command::new` en `projects/*`.

Si la pregunta 1 es «no»: `pick_project_folder` no existe; añade `inspect_project_folder(path) -> ProjectCandidate` y
avisa a architect para rehacer A-4. Si la 2 es «no»: sin `Info.plist`.

Variables de entorno nuevas: ninguna.

Pruebas: las 16 de «Pruebas proporcionales». Corre `cargo test --manifest-path src-tauri/Cargo.toml -q projects`, luego
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>` y `pnpm build`.

Si dudas: `graphify explain "open_instance_folder"`, `graphify explain "detect_original_profile"`,
`node .metodo/scripts/grafo.mjs impacto "atomic_replace_file"`; formato del método en
`METODOLOGIAS/metodologia4/plantillas/scripts/hu.mjs` (L35-81) y `metricas-y-actividad.md` §2; este repo como fixture
de referencia (no en las pruebas).

No toques: `ManagedPaths` ni `test_managed_paths`, `save_registry`, `atomic_replace_file`, `capabilities/`,
`tauri.conf.json` (CSP y `assetProtocol`), `config.rs`/`build.rs`, nada de `hu/HU-0022-*`, `~/.claude`, procesos de Claude.

Skills: `code-ai-profiles-rust-tauri`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.

### Brief · HU-0023 · frontend

Criterios: AC-02, AC-03, AC-04, AC-05 (lo visible). Modelo: **sonnet**: pantallas sobre un contrato fijado.
Contrato: § A-3 y A-4. **No edites** `src/types.ts` ni `src/lib/bridge.ts` (backend, B-1). Empieza cuando backend avise
y HU-0022 haya commiteado su sidebar, `DialogsProvider` y Configuración. Maqueta: `diseno/maqueta.html` y `vista.md`.

Datos que llegan a la pantalla: `ProjectsState`, `ProjectSummary`, `ProjectCandidate`. `message` se muestra tal cual.

| Archivo | Qué cambia |
| --- | --- |
| `src/features/projects/` (nuevo) | `projects-store.ts`, `projects-selectors.ts`, `projects-context.ts`, `ProjectsProvider.tsx`, `useProjects.ts`, `usePinProject.ts`, componentes de la maqueta (tarjeta, barra por estados, cifras, tecnologías, repos, tabla de historias, consumo, rota, `PinProjectDialog`), `index.ts` |
| `src/app/routes/projects/ProjectsRoute.tsx` (nuevo) | `#/proyectos`: lista, vacía, rotas al final |
| `src/app/routes/project/ProjectRoute.tsx` (nuevo) | `#/proyectos/:projectId`: página, rota, no encontrada |
| `src/app/router.tsx` | Dos rutas `lazy` antes de `*` |
| `src/app/providers/AppProviders.tsx` | `ProjectsProvider` dentro de `DashboardRuntime`, fuera de `DialogsProvider` |
| `src/app/providers/dialogs-context.ts`, `DialogsProvider.tsx`, `src/app/layout/DialogHost.tsx` | Bandera `pinCandidate` y `PinProjectDialog` |
| `src/app/layout/AppSidebar.tsx` | Grupo «Proyectos» (A-4) |
| Tarjeta «Archivos y carpetas» de Configuración (archivo de HU-0022) | La línea de A-6 con `selectProtectedProjects` |
| `tests/projects.test.ts` (nuevo), `tests/ui-isolation.test.ts`, `package.json` | Pruebas y `test:projects` |

Pasos:

1. Reducer y selectores puros con su prueba (A-4, «Cálculos»). Importes relativos (Node no resuelve `@/`).
2. Proveedor: carga al montar, `refreshAll`, `refreshOne(id)`, `unpin(id)`, deduplicación de llamadas en vuelo.
3. Rutas y pantallas con el catálogo `components/ui` y los tokens; colores de estado, trama de «en espera» y retícula
   de la maqueta (sistema armónico de HU-0022).
4. Flujo de anclar (A-4) y sidebar. Tras anclar, a `#/proyectos`.
5. `permissionDenied` enlaza a `#/configuracion` (sección Permisos, como lo deje HU-0022).

Variables de entorno nuevas: ninguna. Ninguna URL en componentes.

Pruebas: `tests/projects.test.ts` (orden con rotos al final, «572 M», «98 % caché», entrada + salida, «56 h», `spanDays`,
fracciones de la barra, reducer); caso 15 de `ui-isolation`. Corre `pnpm test:projects`, `pnpm test:ui`, `pnpm build` y
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`. Revisa en el navegador (mocks) las
pantallas de la maqueta a 1440×920 y 980×680, oscuro y claro.

Si dudas: `graphify explain "AppSidebar"`, `graphify explain "DialogHost"`, `docs/arquitectura/frontend.md` («Dónde va
cada cosa»), la maqueta con `#pantalla=…`.

No toques: `DashboardRuntime.tsx` ni ningún listener de `focus`/`blur`/`visibilitychange` (R-1, `test:ui 8`); `features/instances`,
`sessions`, `scan`, `updates`; `DESIGN.md` y la propuesta de radios (decisión aparte); `hu/HU-0022-*`.

Skills: `code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas`.

## Al cerrar (orquestador)

`docs/proyectos.document.md` nuevo, la regla de A-5, `README.md`, `CHANGELOG.md`, y en `docs/arquitectura/backend.md`
una sección «Proyectos anclados» (A-1, A-2, A-6) y la fila de `projects.rs` en Módulos; en `frontend.md` la feature
`projects` y sus dependencias. Observación ajena a esta historia: `save_registry` sigue con `fs::write` (deuda conocida).

## Revisión técnica

Pendiente: tras implementar, sobre el SHA final (`pruebas.mjs estado`).
