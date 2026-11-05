# Arquitectura · HU-0031 · Pestaña Maqueta en el lector de historias

## Análisis

Confianza: **alta** en Rust (reutiliza `ReadContext`, la defensa anti-symlink de HU-0025 y los lanzadores de
`open_external_url` sin cambiarlos); **media-alta** en el aislamiento del marco, que depende de atributos estándar
(`sandbox`, `srcdoc`, CSP en `<meta>`) iguales en WebView2, WKWebView y WebKitGTK y que una persona tiene que ver en las
tres (pendiente humano de la HU).

Leído: `hu.md` (D-2 y D-3 revisadas por el mantenedor); `src-tauri/src/projects/reader.rs` (entero);
`src-tauri/src/projects.rs` (`ProjectDocumentKind` 331, `ProjectDocumentStatus`, `ProjectDocument`, `Skip`,
`ReadContext::resolve` 592, `read` 670, `open_root` 937, `comparable` 777); `src-tauri/src/projects/tests.rs`
(1563-1940); `src-tauri/src/commands.rs` (`read_project_history` 364, `open_external_link` 378); `src-tauri/src/lib.rs`
(104); `src-tauri/src/platform/{macos,windows,linux,unsupported}.rs` (`open_external_url`); `src-tauri/build.rs` (sin
manifiesto de app: los comandos registrados no necesitan capacidad); `src-tauri/capabilities/default.json`;
`src-tauri/tauri.conf.json` (CSP); `src/types.ts` (317-332); `src/lib/bridge.ts` (`readProjectHistory`,
`openExternalLink`, `mockHistoryDocuments`); `src/features/projects/{HistoryReaderDialog.tsx, history-reader.ts}`;
`tests/projects.test.ts`; `index.html`; las diez `hu/*/diseno/maqueta.html`; Tauri 2.11.5 en `~/.cargo/registry`
(`set_csp`, `is_local_url`, `for_main_frame_only`). Grafo: `grafo.mjs impacto "ProjectDocumentKind"` y
`graphify explain "read_project_history_at"`.

### Hechos que deciden el diseño

- **H-1** · `ReadContext::resolve` arma la ruta componente a componente y resuelve cada symlink de forma léxica antes de
  tocarlo; `canonical != own_base.join(…)` detecta también un `diseno/` que sea symlink. **Sirve para
  `diseno/maqueta.html` sin cambios**, si la ruta propia se construye por componentes. La ruta que devuelve no tiene
  symlinks ni prefijo `\\?\` (`comparable`).
- **H-2** · Un `<iframe srcdoc>` hereda la CSP de la app: sus scripts inline no corren sin poner `'unsafe-inline'` en el
  `script-src` de la app (XSS para toda la app). `blob:`/`data:` heredan igual.
- **H-3** · Servirla por un protocolo propio con su CSP la dejaría en un origen que Tauri trata como **local** para el
  IPC (`is_local_url`), con la clave de invocación como única barrera, y con canales de red que la CSP no cierra
  (WebRTC). Descartado: lo decidió el mantenedor («Estática + abrir en navegador»).
- **H-4** · La CSP de la app permite `img-src … https: asset:`: hay que restringirla dentro del marco.
- **H-5** · Las maquetas del método traen un `<script>` inline, fuentes `data:` y ninguna URL remota. HU-0030 y HU-0031
  se dibujan con `innerHTML`: en estático se ven casi vacías; por eso «Abrir en el navegador» está siempre.
- **H-6** · Tamaños reales: 7-381 KiB, y HU-0025 664 KiB. Con 1 MiB (D-3) todas se pintan.
- **H-7** · `index.html` no tiene `<style>` inline, así que Tauri no añade nonces a `style-src` y los `<style>` de la
  maqueta se aplican. Si algún día los tiene, la maqueta se verá sin estilos.
- **H-8** · `open_external_url` (por plataforma) ya lanza el manejador del sistema con un solo argumento y sin shell:
  macOS `/usr/bin/open`, Windows `rundll32 url.dll,FileProtocolHandler` con `hidden_command`, Linux `xdg-open`.
  `build.rs` llama a `tauri_build::build()` sin manifiesto de app: un comando nuevo **no necesita permiso ni capacidad**.

### Decisión D-2 (de la persona): estática dentro, completa fuera

Dentro: `<iframe srcdoc sandbox="">` sin permisos y con CSP propia sin red. Fuera: un comando Rust re-resuelve
`diseno/maqueta.html` con las mismas defensas y lo entrega al manejador de `.html` del sistema como URL `file://`.
`tauri.conf.json`, `capabilities/` y las dependencias **no cambian**.

### Restricciones

- **Plataformas.** Marco: estándar en las tres; en Linux Tauri pone la CSP de la app como `<meta>`, con el mismo efecto.
  Las tres bloquean `<meta http-equiv="refresh">` sin `allow-scripts`, y la `frame-src` heredada (`'self'`) impide que un
  enlace navegue el marco a internet. En `pnpm tauri dev` la CSP de la app puede no aplicarse: AC-03 se verifica en un
  build. Abrir (A-5): ver la justificación por plataforma allí. Windows: rutas por componentes y `path` con `/`.
  macOS y Windows no distinguen mayúsculas: `Diseno/Maqueta.html` se lee allí y no en Linux (aceptado).
- **Privacidad.** La maqueta es contenido del proyecto, no de un perfil. Se lee solo al abrir el lector, vive en el
  estado del diálogo (sin store, `localStorage` ni URL) y no se registra. El comando de abrir no recibe rutas y no
  devuelve la ruta. **En el navegador ya no la aísla la app**: corre con sus scripts y la red que el navegador permita a
  un `file://`; es la elección explícita de la persona y lo dispara su clic.
- **Migraciones.** Ninguna. Nada se guarda.
- **Regresiones posibles.** Las cuatro pestañas de hoy (H25-4a sigue dando cuatro; `diseno/vista.md` no se lee); un
  `.md` de más de 512 KiB sigue siendo `unreadable`, no `tooLarge`; el `ScrollArea`; la rama `else` del cuerpo del
  diálogo, que hoy pinta «ilegible» para todo lo que no es `ok` (con `tooLarge` debe ir a su propio cuerpo). Carga por
  llamada: ≤ 2 MiB de `.md` + 1 MiB de maqueta.

### Impacto

| Símbolo que cambia | Consumidores (grafo y `rg`) | Qué se rompe |
| --- | --- | --- |
| `ProjectDocumentKind` (Rust y TS) | `projects.rs`, `reader.rs`, `tests.rs`, `HistoryReaderDialog.tsx`, `bridge.ts` | Nada: valor nuevo al final |
| `ProjectDocumentStatus` (Rust y TS) | los mismos | El cuerpo del diálogo trataría `tooLarge` como ilegible si no se maneja |
| `DOCUMENTS` (`reader.rs`) | `read_project_history_at` | Nada: 5 entradas con tope propio |
| comando nuevo `open_history_mockup` | `commands.rs`, `lib.rs`, `bridge.ts` | Nada |

- Contrato: **sí**, aditivo (0.x, sin major): `"design"`, `"tooLarge"` y un comando.
- Datos guardados: no. Permisos, capacidades, CSP de la app, red de la app: **no cambian**.
- Riesgosa: **sí**, por la frontera de aislamiento (AC-03) y por lanzar un archivo del proyecto en el sistema.

## Solución

### A-1 · Contrato (aditivo, 0.x)

```ts
export type ProjectDocumentKind = "hu" | "architecture" | "verification" | "timeline" | "design";
export type ProjectDocumentStatus = "ok" | "unreadable" | "tooLarge";
// bridge.openHistoryMockup(id: string, folder: string): Promise<void>  →  call("open_history_mockup", { id, folder })
```

Rust: `ProjectDocumentKind::Design` (`"design"`), `ProjectDocumentStatus::TooLarge` (`"tooLarge"`, **solo** para
`design`). Documento de maqueta: `{ kind: "design", file: "maqueta.html", path: "hu/<carpeta>/diseno/maqueta.html",
status, content, message }`, el último, solo si existe. `content` es el HTML (UTF-8 con pérdida, sin BOM, `\n`) solo
con `ok`. Mensajes:

- `tooLarge`: «maqueta.html pesa más de 1 MiB y no se pinta aquí.» (`content: null`).
- `unreadable`: los de siempre con `{file}` («… no es un archivo de texto.», «… apunta fuera de la carpeta de la historia
  y no se lee.», `skip.reason()`).

### A-2 · Lectura (Rust)

`DOCUMENTS` pasa a 5 entradas `(kind, componentes, tope)`: los cuatro `.md` con `DOCUMENT_LIMIT` (512 KiB) y design
`["diseno", "maqueta.html"]` con `MOCKUP_LIMIT = 1024 * KIB`. Por entrada: `rel`/`own` por componentes, `file` = último,
`path = "hu/{folder}/" + join("/")`. Mismo `canonical != own` → `Outside`, `ReadMode::Whole(tope)`, `\0` → ilegible,
`Missing` → `continue`. `Err(TooLarge)` → `TooLarge` si es design, `Unreadable` si es `.md` (como hoy). El tamaño se
mira en los metadatos antes de leer: más de 1 MiB no se lee.

### A-3 · Marco aislado (frontend)

```tsx
<iframe title={`Maqueta de ${history.id}`} sandbox="" srcDoc={srcdoc} referrerPolicy="no-referrer" … />
```

- `sandbox=""` **vacío**. Nunca `allow-*`, `allow=`, `onLoad`, ni acceso a `contentDocument`/`contentWindow`, ni un
  listener de `message`.
- `srcdoc = mockupDocument(content).srcdoc` (pura, `history-reader.ts`): inserta como primer elemento, tras el
  `<!doctype>` y los comentarios que lo precedan (al principio si no hay doctype):
  `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; form-action 'none'; base-uri 'none'">`.
  Se suma a la heredada (intersección): estilos inline y `data:`; nada de red, `asset:`, `'self'`, marcos ni objetos.

### A-4 · Pestaña y cuerpo

- Pestaña «Maqueta», la última, solo si viene en `documents`; `title` `maqueta.html`.
- `ok`: el cuerpo entero (fuera del `ScrollArea`, sin `max-w` ni `px-6 py-6`, sin `HistoryMarkdown`/`readerBody`) es una
  franja superior con «Vista estática: sus botones funcionan en el navegador.» y el botón **«Abrir en el navegador»**, y
  debajo el marco `block min-h-0 w-full flex-1 border-0 bg-white`, con su propio scroll.
- `tooLarge`: aviso «La maqueta es demasiado grande para verla aquí» con el mensaje de Rust y **«Abrir en el
  navegador»**; sin «Reintentar».
- `unreadable`: el `UnreadableDocument` de siempre, con «Reintentar» y **sin** botón de abrir.
- Si abrir falla: aviso del pie «No se pudo abrir la maqueta» con el mensaje de Rust (mismo `NoticeAlert` que los
  enlaces). Textos y disposición finales: los de `diseno/maqueta.html` de esta HU.

### A-5 · Abrir en el navegador (Rust)

`open_history_mockup(id: String, folder: String) -> Result<(), String>`, `spawn_blocking` como sus vecinos, registrado
en `lib.rs`. **Nunca recibe una ruta.** Dos piezas en `reader.rs`:

1. `history_mockup_url(app_data, env, id, folder) -> Result<reqwest::Url, AppError>`, sin efectos: `validate_folder`,
   `find_entry`, `open_root`, la misma comprobación de la carpeta de la historia que la lectura (sacarla a una función
   común, sin cambiar sus mensajes), y `ctx.resolve(diseno/maqueta.html)` con: `canonical == own` (si no, «La maqueta
   apunta fuera de la carpeta de la historia y no se abre.»), `metadata.is_file()`, y no en la nube
   (`(ctx.env.cloud)(…)`), igual que `read`. **Sin tope de tamaño** (abrir las grandes es el objetivo). Ausente →
   «Esta historia ya no tiene maqueta. Pulsa «Actualizar».». Después `Url::from_file_path(&canonical)`; se exige
   `scheme() == "file"`.
2. `open_history_mockup_sync(app, id, folder)`: `environment(app)`, la URL y `open_external_url(url.as_str())`; un fallo
   del lanzador → «No se pudo abrir la maqueta en el navegador.».

Por qué una URL `file://` y no la ruta, por plataforma (el mismo lanzador, un solo argumento, sin shell):

- **Windows**: `rundll32` pasa a `FileProtocolHandler` el resto de la línea de órdenes tal cual; una ruta con espacios
  llegaría con las comillas que pone Rust y puede fallar. La URL codifica espacios, `#`, `?` y `%` y no lleva comillas.
  `FileProtocolHandler` la entrega a `ShellExecute`, que usa el manejador de `.html`. `hidden_command`: sin consola.
- **macOS**: `open <url file>` usa LaunchServices con la app asociada a `.html`; la URL nunca empieza por `-` (no puede
  leerse como opción) y `#`/`?` de una carpeta no se toman por fragmento.
- **Linux**: `xdg-open <url file>` abre con el manejador de `text/html`. Un navegador Snap o Flatpak puede no ver
  carpetas ocultas de `$HOME`, `/mnt` o medios extraíbles: lo dirá el navegador (restricción documentada).
- En las tres se abre con la app asociada a `.html`, que normalmente es el navegador; si la persona asoció `.html` a un
  editor, se abrirá allí (aceptado, y se dice en la documentación).

Residual: entre validar y que el sistema abra, alguien con escritura en el proyecto podría cambiar el archivo por un
symlink. Solo enseñaría otro archivo local a la propia persona en su navegador; se acepta y se anota.

### Variables de entorno nuevas

Ninguna. La CSP del marco y el tope son constantes del lector, no configuración.

### Señales

Ninguna (no hay observabilidad en la app).

## Briefs y orden

1. `briefs/backend.md` — modelo **opus**: comando nuevo que entrega un archivo del proyecto al sistema, con las
   defensas de rutas. Hace también el espejo en `src/types.ts`.
2. `briefs/frontend.md` — modelo **opus**: pone la frontera de aislamiento (AC-03). Empieza cuando el backend haya
   dejado `src/types.ts`; los demás archivos son disjuntos.

Delta propuesto para RN-09 al cerrar: «… aislada de la app, sin scripts y sin red; “Abrir en el navegador” la abre
completa en el navegador del sistema. Hasta 1 MiB se pinta; más, solo se abre fuera.»

## Revisión técnica

Obligatoria. Se comprueba: `sandbox=""` literal; CSP del `<meta>` literal y primera; sin cambios en `tauri.conf.json`
ni `capabilities/`; ruta por componentes; `tooLarge` solo en design; el comando no acepta rutas, re-valida y no usa
shell; pruebas de presente, ausente, symlinks, nube, topes ±1 y URL codificada.
