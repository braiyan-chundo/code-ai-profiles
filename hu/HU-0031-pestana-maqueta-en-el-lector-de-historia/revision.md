# Revisión técnica · HU-0031 · Pestaña Maqueta en el lector de historias

Fecha: 2026-11-05 · Revisa: architect · HEAD revisado: `9272d5c` (rama `fix-ventanas-consola-windows`)

- **Backend:** `202ddc6` (contrato Rust y TS, `bridge.openHistoryMockup` y su mock) y `08607dc` (`reader.rs`, comando,
  registro, pruebas H31-1 a H31-7).
- **Frontend:** `9272d5c` (`HistoryReaderDialog.tsx`, `history-reader.ts`, mock de `bridge.ts`, `tests/projects.test.ts`).
- **Referencia:** `arquitectura.md` (A-1 a A-5), `briefs/`, `hu.md` (D-1 a D-4, AC-01 a AC-04).

## Veredicto: **PASS con observaciones**

No hay bloqueos (ningún B-n).

**Condiciones antes de la prueba humana:**

1. La suite, una vez, sobre el SHA final. `pruebas.mjs estado` dice «HEAD 9272d5c sin suite en verde». No corrí pruebas.
2. AC-03 se mira en un **build**, no en `pnpm tauri dev`, que puede no aplicar la CSP de la app. Hay que verlo en las
   tres plataformas (es el pendiente humano de la HU).

`cargo fmt --check` y `git diff --check` en orden. `config.mjs check` en orden. Entre `12bbf3e` y `9272d5c` no cambian
`tauri.conf.json`, `capabilities/`, `Cargo.toml` ni `package.json`.

## Lo comprobado

| Punto | Resultado |
| --- | --- |
| Marco aislado (A-3) | `HistoryReaderDialog.tsx:237-243`: `sandbox=""` literal, `srcDoc`, `referrerPolicy="no-referrer"` y `title`. No hay `allow-*`, `allow=`, `onLoad`, `ref`, `contentWindow`/`contentDocument` ni ningún listener de `message` en el diff. El marco tiene origen opaco y no ejecuta scripts, ni los suyos ni los inyectados |
| CSP del marco | `MOCKUP_CSP` (`history-reader.ts:42`) es literal a A-3. Se suma a la de la app (`default-src 'self'`, así que `frame-src` es `'self'`): un enlace del marco no puede navegarlo a internet, y `style-src 'self' 'unsafe-inline'` deja pasar los `<style>` de la maqueta. La prueba comprueba que no aparecen `https:`, `http:`, `'self'`, `asset:` ni `script-src` |
| `mockupDocument`: corrección frente al analizador HTML | Revisé `prologEnd` (`history-reader.ts:51-78`) contra los estados del tokenizador de comentarios (WHATWG 13.2.5.43-52). Coincide en todo: `<!-->` y `<!--->` cierran de forma abrupta; dentro del comentario cierra el primer `-->` o `--!>` (`--->`, `--!-->` y un `<!-->` anidado incluidos); `--x` y `--!x` siguen dentro. Un comentario sin cierre devuelve 0. Los únicos espacios que se saltan son los de la fase *initial* (`\t \n \f \r` y el espacio; el NBSP no). El doctype termina en el primer `>` incluso entre comillas, como `[^>]*>` |
| Dónde cae el `<meta>` | Hay dos casos. (a) Justo tras el doctype: el modo es *before html*, así que el `<meta>` crea `html` y `head` implícitos y entra en el `head`. El `<html lang>` que llega después funde sus atributos y el `<head>` se ignora. Todo lo que había en el `head` sigue ahí, después del `<meta>`. (b) En la posición 0, sin doctype, con un prólogo que no se reconoce o con un comentario sin cierre: el `<meta>` entra igualmente en el `head` implícito. En los dos casos es hijo del `head` y va antes de cualquier recurso. El bypass `<!--><img src=x>-->` queda cubierto, con prueba (`projects.test.ts`, «lo que el analizador no se salta…») |
| `mockupDocument`: coste | Es lineal. `HTML_SPACE` y `DOCTYPE` son *sticky* y de una sola clase de caracteres, sin retroceso. Cada comentario se busca solo hasta su propio cierre con `indexOf`. Hay una prueba con 50 000 comentarios en menos de 1 s |
| Lectura (A-2) | `DOCUMENTS` tiene 5 entradas `(kind, partes, tope)`. Las rutas se arman componente a componente con `join_parts` (sirve para Windows), y `path` se forma con `/`. `canonical != own` se compara con la ruta propia completa: así se detecta tanto un `diseno/` que sea symlink como un `maqueta.html` que lo sea (los cuatro casos en H31-4). `TooLarge` solo sale con `Design` (`reader.rs:170`). Un `.md` grande sigue siendo `unreadable` (H31-3). El tamaño se mira en los metadatos antes de leer y `take(limit+1)` cubre el archivo que crece. Topes ±1 probados. `\0` da ilegible. El HTML no se registra en ningún sitio |
| Abrir (A-5) | `open_history_mockup(id, folder)` (`commands.rs:384-397`) va en `spawn_blocking` y no recibe ninguna ruta. `history_mockup_url` (`reader.rs:205-245`) vuelve a validar todo: `validate_folder`, `find_entry`, `open_root`, `history_folder` (que comparte con la lectura y conserva sus mensajes), `canonical == own`, `is_file` y la nube. No tiene tope de tamaño. Después pasa por `Url::from_file_path` y exige el esquema `file`. Al sistema solo le llega `url.as_str()`, como un único argumento de `open_external_url`, sin shell (macOS `/usr/bin/open`, Windows `rundll32` con `hidden_command`, Linux `xdg-open`). La ruta nunca vuelve al frontend. H31-5 comprueba que el espacio y el `#` se codifican (`%20`, `%23`, sin fragmento) y que la URL lleva de vuelta a la misma ruta. H31-6 cubre ausente, historia ausente, carpeta con ese nombre, nube, `folder` inválido y proyecto sin anclar. H31-7 cubre los cuatro symlinks |
| Cuerpo y pestaña (A-4) | `ok`: franja y marco fuera del `ScrollArea`, sin `max-w` ni `readerBody`. `tooLarge`: `TooLargeMockup` con «Abrir en el navegador» y sin «Reintentar». `unreadable`: `UnreadableDocument` con «Reintentar» y sin abrir. Un `design` nunca cae en `HistoryMarkdown` (`:268`). El aviso del pie distingue «No se pudo abrir el enlace» de «No se pudo abrir la maqueta». `opening` deshabilita el botón mientras se abre |
| Privacidad | El HTML vive solo en el estado del diálogo, en `useMemo`. No pasa por un store, `localStorage` ni la URL. Una maqueta es contenido del proyecto, no de un perfil |
| Contrato | Aditivo en 0.x: `"design"`, `"tooLarge"` y un comando. Rust y TS coinciden en camelCase (`projects_serializes_reader_and_gap_contract_names` ampliada). El mock valida `folder` igual que Rust |

## Observaciones

- **O-1 · baja · frontend (opcional)** · `history-reader.ts:45`. En Chromium (WebView2), la CSP no controla
  `<link rel="dns-prefetch">` y, según la versión, tampoco `preconnect`. Una maqueta podría provocar una consulta DNS a
  un host, aunque nunca una petición. Las maquetas del método no usan esos enlaces. Se puede cerrar del todo añadiendo
  `<meta http-equiv="x-dns-prefetch-control" content="off">` junto al de la CSP. Si no se añade, hay que anotarlo como
  residual en `docs/` al cerrar.
- **O-2 · informativa** · `history-reader.ts:77`. Un prólogo que el modelo no reconoce, como `<?xml …?>` o `<!x>` antes
  del doctype (comentarios falsos del tokenizador), deja el `<meta>` en la posición 0. Es seguro: el `<meta>` sigue en
  el `head`. El único efecto es que el doctype posterior se ignora y la maqueta se pinta en *quirks mode*. Ninguna
  maqueta del método lo hace.
- **O-3 · informativa · backend** · `platform/windows.rs:380-396` (comportamiento anterior a esta HU). `rundll32`
  devuelve 0 aunque no haya ningún manejador de `.html`. En Windows, «No se pudo abrir la maqueta» casi nunca se verá:
  si falla, simplemente no pasa nada. Es lo mismo que ya ocurre con los enlaces.
- **O-4 · informativa · orquestador** · Residuales que hay que llevar a `docs/` al cerrar, todos aceptados en la
  arquitectura:
  - la ventana entre validar y abrir (un symlink cambiado justo en ese momento);
  - un navegador Snap o Flatpak en Linux sin acceso a carpetas ocultas o a `/mnt`;
  - `.html` asociado a un editor;
  - en macOS y Windows, `Diseno/Maqueta.html` se lee igual.

  Además, falta el delta de RN-09 que propone la arquitectura.

## Responsables

Nada bloquea. O-1 es opcional y le toca al frontend. O-4 le toca al orquestador al cerrar.

## Seguimiento del orquestador (2026-11-05)

- O-1 corregida en `030bc11`: `<meta http-equiv="x-dns-prefetch-control" content="off">` junto a la CSP.
- O-2 y O-3 quedan como residuales documentados; O-4 hecho en `docs/proyectos.document.md`.
