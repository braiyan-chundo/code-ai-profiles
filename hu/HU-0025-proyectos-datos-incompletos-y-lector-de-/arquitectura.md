# Arquitectura · HU-0025 · Proyectos: datos incompletos y lector de historias

## Análisis

Confianza: **alta** en los datos incompletos (es reclasificar lo que `method.rs` ya lee) y **media-alta** en el lector
(lectura nueva desde una entrada del frontend y Markdown de terceros en la webview).

Leído: `hu.md`, `diseno/vista.md`, la maqueta (textos), `src-tauri/src/projects.rs`, `projects/method.rs`,
`projects/tests.rs` (fixtures y casos 5-6), `commands.rs`, `lib.rs`, `error.rs`, `platform/{mod,macos,windows,linux,
unsupported}.rs`, ADR-0003, `src/types.ts`, `src/lib/bridge.ts`, `src/features/projects/*` (página, cabecera,
historias, cifras, `projects-detail.ts`), `components/ui/code-block.tsx`, `tauri.conf.json` (CSP),
`capabilities/default.json`, `package.json`, RN-02/RN-03 y `graphify query` del área. Impacto:
`grafo.mjs impacto ProjectHistory` (55 nodos: Rust, `ProjectHistories`, `projects-detail`, `bridge.ts`,
`tests/projects.test.ts`) y `ProjectTotals` (Rust).

Hechos que deciden el diseño:

- `minutosTotales: null` hoy produce `minutes: Some(0)` y el aviso «Faltan 1 cifras…» (`number()` cuenta el nulo como
  cifra que falta). Las 13 de `happy-office` muestran «0 min» y suman 0 al tiempo: el «de 41 terminadas» de las cifras
  es falso. Hay que distinguir **sin tiempo** (`minutes: null`) de **tiempo 0**.
- La «terminada sin metricas.json» es un `ProjectWarning` de `scope: metrics`. Se convierte en estado de la historia.
- **No hay en la app un mecanismo para abrir un enlace en el navegador.** Lo más cercano es `open_update_url`
  (`platform/windows.rs` y `linux.rs`; no existe en macOS) con la URL fija del canal oficial. No hay
  `tauri-plugin-opener` ni `shell`. Ver Pregunta 1.
- La CSP permite `img-src … https:`: **cualquier `<img>` que pinte el Markdown cargaría de la red.** El lector no debe
  crear nunca un elemento `img` (AC-05).
- `react-markdown` 10.1.0 (2025-03-07) y `remark-gfm` 4.0.1 (2025-02-10) son las últimas y superan con creces el
  `minimumReleaseAge` de pnpm 12 (24 h). Se fijan exactas, como el resto de dependencias del catálogo.

### Supuestos (decisiones de `vista.md` pendientes; se asume la recomendada)

- **S-1** D-1 chip en la cabecera; orden del modal avisos → sin métricas → sin tiempo; grupo «Avisos» oculto si no
  hay; «Copiar todos» sí; el `# título` igual al de la historia y el frontmatter no se pintan; pista «de 23 de 41
  terminadas»; un archivo que supera el límite se trata como ilegible.
- **S-2** «Sin tiempo» y «Sin métricas» solo se marcan en historias **terminadas** (es lo que explica el modal: «se
  cerraron sin fases»). Una en curso sin métricas sigue con «—», como hoy.
- **S-3** Las cifras de tokens que falten en un `metricas.json` (no `minutosTotales`) siguen siendo un **aviso**: el
  archivo está mal formado, no incompleto por diseño del método. Igual un `metricas.json` que no es JSON.
- **S-4** El comando para «Sin métricas» es `node .metodo/scripts/metricas.mjs hu HU-####`, con el `HU-####` tomado de
  los 7 primeros caracteres de `folder` (garantizados por `is_history_folder`), **nunca** del `id` del frontmatter: el
  texto se pega en una terminal y no debe llevar nada que venga libre del proyecto.

### Preguntas (los briefs asumen la recomendación)

1. **Cómo se abre un enlace externo.** No hay mecanismo genérico (ver arriba). Recomiendo **un comando nuevo
   `open_external_link(url)`** que valida en Rust (solo `http`/`https`, con host, sin usuario ni contraseña, ≤ 2 048
   caracteres) y abre con el programa del sistema mediante una función de plataforma nueva (`/usr/bin/open`,
   `rundll32 url.dll,FileProtocolHandler`, `xdg-open`). Sin dependencias ni capacidades nuevas. Es un permiso nuevo de
   hecho (la webview puede pedir abrir una URL arbitraria en el navegador), por eso lo confirma el mantenedor.
   Alternativas: `tauri-plugin-opener` (dependencia y capacidad nuevas, mismo efecto) o enlaces no pulsables, con la
   URL a la vista y «Copiar» (cero superficie nueva). Si se elige la última, el brief de backend pierde A-4 y el de
   frontend pinta el enlace como texto.
2. **¿Confirmar antes de salir al navegador?** Recomiendo **no**: el enlace lleva la URL completa en su `title` y solo
   se abre `http`/`https` al pulsarlo. Alternativa: un `AlertDialog` «Abrir en el navegador · <host>».

### Impacto

| Símbolo | Consumidores | Qué se rompe |
| --- | --- | --- |
| `ProjectHistory` (+`dataGaps`) | `method.rs`, `tests.rs`, `types.ts`, mocks de `bridge.ts`, `ProjectHistories`, `projects-detail`, `tests/projects.test.ts` | Nada si es aditivo; los mocks ganan `dataGaps: []` |
| `ProjectHistory.minutes` (semántica) | `summarize`, `ProjectHistories`, `consumptionByHistory` | `null` en vez de `0` para las sin tiempo; la UI ya admite `null` |
| `ProjectTotals` (+`timedHistories`) | `summarize`, `ProjectFigures`, mocks | Aditivo |
| Avisos de métricas | `read_history`, `tests.rs` caso 5 | Dos avisos dejan de emitirse: la prueba 5 se adapta |
| Comandos nuevos | `commands.rs`, `lib.rs`, `types.ts`, `bridge.ts` | Ninguno existente cambia |

- **Contrato IPC:** aditivo (0.3.0, sin major). Dos comandos nuevos.
- **Datos guardados:** ninguno nuevo; `projects.json` no cambia. **Migración:** no.
- **Plataformas:** la lectura reutiliza `ReadContext` (symlinks, nube iCloud/OneDrive, mayúsculas en macOS/Windows,
  `\\?\`). El enlace externo tiene tres implementaciones, y `unsupported` devuelve error. Windows y Linux solo se
  compilan en `build-desktop.yml`: la prueba de `external_link` es pura y corre en todas.
- **Privacidad:** el lector solo lee 4 nombres fijos dentro de `hu/<carpeta>` del proyecto anclado, con la lista de
  exclusión (`~/.claude`, perfiles, `app_data`). Nada se guarda ni se registra; el contenido vive en el estado del
  modal y se suelta al cerrarlo.
- **Riesgosa: sí** (`contrato`, lectura con entrada del frontend, Markdown no confiable). Revisión técnica obligatoria.

## Solución

### A-1 · Contrato (aditivo, 0.x)

```rust
// projects.rs
#[serde(rename_all = "camelCase")] enum ProjectDataGap { NoTime, NoMetrics }            // "noTime" | "noMetrics"
struct ProjectHistory { /* … */ minutes: Option<u64> /* None si no hay minutosTotales */, data_gaps: Vec<ProjectDataGap> }
struct ProjectTotals  { /* … */ timed_histories: usize }   // terminadas con métricas y con minutos

#[serde(rename_all = "camelCase")] enum ProjectDocumentKind { Hu, Architecture, Verification, Timeline }
#[serde(rename_all = "camelCase")] enum ProjectDocumentStatus { Ok, Unreadable }
struct ProjectDocument { kind, file: String /* "hu.md" */, path: String /* "hu/<carpeta>/hu.md" */,
                         status, content: Option<String>, message: Option<String> }
struct ProjectHistoryDocuments { folder: String, documents: Vec<ProjectDocument>, read_at: String }
```

```ts
export type ProjectDataGap = "noTime" | "noMetrics";
// ProjectHistory: + dataGaps: ProjectDataGap[]      ProjectTotals: + timedHistories: number
export type ProjectDocumentKind = "hu" | "architecture" | "verification" | "timeline";
export interface ProjectDocument {
  kind: ProjectDocumentKind; file: string; path: string; status: "ok" | "unreadable";
  content: string | null; message: string | null;
}
export interface ProjectHistoryDocuments { folder: string; documents: ProjectDocument[]; readAt: string }
```

Comandos: `read_project_history(id: String, folder: String) -> ProjectHistoryDocuments` y
`open_external_link(url: String) -> ()`. Bridge: `bridge.readProjectHistory(id, folder)` y
`bridge.openExternalLink(url)`, con rama mock.

### A-2 · Datos incompletos (`projects/method.rs`)

- `parse_metrics`: `Metrics.minutes: Option<u64>`. `minutosTotales` ausente o `null` → `None` **sin** contar como
  cifra que falta. Presente pero no numérico o negativo → `None` y cuenta como cifra que falta (aviso).
- `read_history`, historia **terminada**:
  - `metricas.json` legible con `minutes == None` → `data_gaps = [NoTime]`, `minutes: None`; sigue
    `counts_in_totals = true` (sus tokens suman, RN-03).
  - `metricas.json` ausente (`Skip::Missing`) → `data_gaps = [NoMetrics]` y **sin aviso**.
  - Las dos son excluyentes. Fuera de «terminada», `data_gaps` vacío.
- Siguen siendo **avisos** (lo roto): `metricas.json` no JSON o sin forma; cifras de tokens que falten (mensaje: «Faltan
  N cifras de tokens en metricas.json; cuentan como 0.»); `metricas.json` ilegible/nube/fuera/grande; y todos los de
  config, frontmatter, bitácora, repos, manifiestos y git. `cap_warnings` (20) no cambia y no toca `data_gaps`.
- `summarize`: `totals.minutes` suma solo `Some`; `timed_histories` cuenta las que suman y tienen `Some(minutes)`.

### A-3 · Lector (`projects/reader.rs`, nuevo)

`read_project_history_at(app_data, env, id, folder) -> Result<ProjectHistoryDocuments, AppError>` y su
`read_project_history_sync(app, id, folder) -> Result<_, String>`:

1. `find_entry(app_data, id)` → la ruta sale **del registro**, nunca del frontend. `open_root(path, env)` (deny,
   canonicalización, permisos); un fallo → `AppError` con el mensaje de `Failure`.
2. `folder` del frontend se valida antes de tocar el disco: `is_history_folder(folder)`, `split_parts` da exactamente
   un componente igual a `folder`, sin `/`, `\`, `:`, `..`, caracteres de control ni `…`, ≤ 120 caracteres. Si no →
   `AppError::invalid_input("La historia no es válida.")`.
3. `ctx.entry("hu/<folder>")` debe ser `Directory`; si falta → «La historia ya no está en el proyecto. Pulsa
   «Actualizar».».
4. Para `hu.md`, `arquitectura.md`, `verificacion.md`, `seguimiento.md`, **en ese orden** (D-3), `ctx.read(rel,
   ReadMode::Whole(DOCUMENT_LIMIT))` con `DOCUMENT_LIMIT = 512 KiB` por archivo (≤ 2 MiB por llamada):
   `Ok` con un `\0` dentro → `Unreadable` («no es un archivo de texto»); `Ok` → `Ok` con `content`;
   `Skip::Missing` → se omite (sin pestaña); otro `Skip` → `Unreadable` con `message` = «<archivo> <reason>.» (para
   `TooLarge`, «supera el tamaño máximo que se lee (512 KiB)»). Nunca se lee otro nombre ni se lista la carpeta.
5. Sin escritura, sin `Command::new`, sin red, sin tocar `projects.json` (ni `lastReadAt`). Solo lectura bajo el
   mismo `ReadContext`: symlinks que salen, `deny` y nube igual que RN-02.

### A-4 · Enlace externo (Pregunta 1)

- `external_link(raw: &str) -> Result<reqwest::Url, AppError>` (puro, en `reader.rs`): `Url::parse`; esquema `http`
  o `https`; `host_str()` presente; `username()` vacío y `password()` `None`; `raw.len() ≤ 2048`; sin caracteres de
  control. Se pasa al sistema `url.as_str()` (reserializada), nunca `raw`.
- `platform::open_external_url(url: &str) -> Result<(), AppError>` en los cuatro archivos de plataforma (ADR-0003):
  macOS `/usr/bin/open <url>`, Windows `rundll32.exe url.dll,FileProtocolHandler <url>`, Linux `xdg-open <url>`,
  `unsupported` → `AppError::unsupported`. Estado de salida distinto de 0 → `AppError::process("No se pudo abrir el
  enlace en el navegador.")`.

### A-5 · Interfaz

- **Página.** Fuera la lista de avisos de `ProjectPage`. En `ProjectHero`, el chip «N historias con datos incompletos
  · Ver» (+ «· M avisos» con icono triángulo y borde `--ui-warning` si hay avisos; solo avisos → «M avisos al leer el
  proyecto · Ver»; nada → no hay chip). Abre el modal.
- **Filas.** «Sin tiempo» sustituye al «—» de *Tiempo*; «Sin métricas» ocupa las dos columnas de cifras
  (`colSpan`). La fila entera abre el lector (botón accesible, foco de teclado). La descripción de la tarjeta: «Pulsa
  una historia para leerla».
- **Cifras.** *Tiempo en fases*: si `timedHistories < counts.done`, «de {timed} de {done} terminadas»; si no, como hoy.
- **Modal de datos incompletos** (`Dialog` 640 px, `ScrollArea`): Avisos (si hay) → Sin métricas (comando por historia
  con `CodeBlock` y copiar, y «Copiar todos») → Sin tiempo (sin acción, con sus tokens). Pie fijo de solo lectura.
- **Lector** (`Dialog` grande, **carga diferida** con `React.lazy`: `react-markdown` y `remark-gfm` solo entran en ese
  chunk). Llama a `readProjectHistory` al abrir; pestañas `Tabs` en el orden recibido; *Cargando* (`Skeleton`),
  *Ilegible* (triángulo en la pestaña, mensaje y «Reintentar», que repite la llamada), error de la llamada entera
  (`Empty` con el mensaje y «Reintentar»). Descarta respuestas de una apertura anterior.
- **Markdown (D-2).** `skipHtml`, sin `rehype-raw`, `remark-gfm`. Mapa de componentes del catálogo: `pre` → `CodeBlock`,
  tablas → `Table`, casillas → `Checkbox` deshabilitado, `img` → **texto** con el `alt` (nunca un `<img>`), `a`
  `http(s)` → `bridge.openExternalLink` con `preventDefault` en `onClick` y `onAuxClick`, `title` = URL e icono
  externo; cualquier otro enlace (relativo, `#`, `mailto:`, `file:`) → texto. Se quita el frontmatter y el primer h1
  si coincide con el título.

### Variables de entorno nuevas

Ninguna.

### Señales

No hay observabilidad (app local, sin telemetría).

### Delta de RN-02 (lo aplica el orquestador al cerrar)

> Desde HU-0025, además: al abrir el lector de una historia se leen completos, con un tope de 512 KiB cada uno, sus
> `hu.md`, `arquitectura.md`, `verificacion.md` y `seguimiento.md`, solo dentro de `hu/<carpeta de la historia>` y con
> las mismas exclusiones. No se cargan imágenes ni HTML del Markdown. Un enlace `http`/`https` solo se abre en el
> navegador del sistema cuando la persona lo pulsa; la app no lo visita.

### Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `folder` manipulado (`../`, absoluta, symlink) | Validación léxica estricta + `ReadContext` + nombres de archivo fijos; prueba |
| Markdown que carga de la red | Ningún `<img>`; `skipHtml`; la CSP permitiría `https:` en `img-src`, por eso la regla va en el código y en una prueba |
| Enlace que navega la webview fuera de la app | `preventDefault` en `onClick`/`onAuxClick`; no `http(s)` → texto |
| URL abusiva al sistema (`file:`, `javascript:`, argumentos) | `external_link` en Rust; `url.as_str()` siempre empieza por `http` |
| Archivo enorme o binario | 512 KiB por archivo y `\0` → ilegible |
| Archivo en iCloud/OneDrive sin descargar | `Skip::Cloud` → ilegible, sin descargarlo |
| Totales que cambian (13 historias ya no suman 0 min) | Es la corrección buscada; la pista lo explica |

### Pruebas que no pueden faltar

Rust (`cargo test --manifest-path src-tauri/Cargo.toml projects`):
1. `minutosTotales: null` y `fases: []` en terminada → `minutes None`, `[NoTime]`, sin aviso, suma tokens, no minutos,
   `timed_histories` no la cuenta.
2. Terminada sin `metricas.json` → `[NoMetrics]`, sin aviso; en curso sin `metricas.json` → `[]`.
3. `metricas.json` roto y tokens incompletos → siguen siendo avisos (adaptar el caso 5 actual).
4. Lector: devuelve los 4 en orden; omite los que faltan; `\0` y > 512 KiB → `Unreadable`; `folder` con `..`, `/`,
   absoluta, `HU-12` o con control → `invalid_input`; `arquitectura.md` symlink fuera → `Unreadable` sin leerlo;
   proyecto bajo `deny` → error; la huella de la carpeta (`fingerprint`) no cambia.
5. `external_link`: acepta `https://x.test/a?b#c` y `http://`; rechaza `file:`, `javascript:`, `mailto:`, sin host,
   con usuario, > 2 048 y relativa.
6. Serialización: `"noTime"`, `"noMetrics"`, `"architecture"`, `"unreadable"`, `timedHistories`.

Frontend (`pnpm test:projects`): selectores del chip y de los grupos del modal; el comando sale de `folder`; pista de
tiempo; quitar frontmatter y h1 repetido; clasificación de enlaces (externo/texto); orden de pestañas.
`pnpm build` y `pnpm test:ui`.

## Orden y paralelismo

1. **backend** (Rust + `src/types.ts` + `src/lib/bridge.ts` con mocks) → commit.
2. **frontend** sobre ese commit. No se solapan archivos; van en serie porque el frontend compila contra el contrato.

Ninguno empieza antes de que el mantenedor apruebe la maqueta (AC-01) y responda la Pregunta 1.
