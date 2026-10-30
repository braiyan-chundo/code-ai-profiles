# Revisión técnica · HU-0025 · Proyectos: datos incompletos y lector de historias

Fecha: 2026-10-30 · Revisa: architect · HEAD revisado: `91c553b` (rama `ajustes-proyectos-e-instancias`)

- **Backend:** `afd6fc7` (Rust, `types.ts`, `bridge.ts` y mocks).
- **Frontend:** `6a617c5` (código, pruebas y fichas del catálogo) y `91c553b` (evidencias).
- **Fuera de la revisión:** los commits de la HU-0026. Comparte con ella solo la línea `dialogOpen` de
  `AppSidebar.tsx`, que añade `projectDialog` sin pisar `launch`/`stop` de la HU-0026.

## Veredicto: **FAIL**, por una corrección pequeña de frontend (R-1)

El backend cumple el diseño entero. El frontend también, salvo una cosa: el enlace externo del lector sigue siendo un
`<a href>` real. Eso deja abierta la vía que el diseño quería cerrar, que la ventana de la app navegue a la red. El
hueco viene del brief, que pedía `<a href>` con `onClick`/`onAuxClick`. Es una omisión del diseño y no del
implementador. La corrección es de pocas líneas. R-2 y R-3 no bloquean.

**Condición antes de la prueba humana:** corregir R-1 y correr la suite completa una vez, sobre el SHA final.
`pruebas.mjs estado` dice «HEAD 91c553b sin suite en verde». No corrí pruebas.

## Lo comprobado

### Backend

| Punto | Resultado |
| --- | --- |
| Solo los 4 nombres fijos | `DOCUMENTS` es una constante con `hu.md`, `arquitectura.md`, `verificacion.md` y `seguimiento.md`, en ese orden. No se lista la carpeta. `Skip::Missing` no genera pestaña |
| `folder` no permite escapar | `validate_folder` se aplica antes de tocar el disco: `is_history_folder` (`HU-` y 4 dígitos ASCII), ≤ 120, sin `/`, `\`, `:`, `…`, `..` ni caracteres de control, y `split_parts` da exactamente `[folder]`. Una ruta absoluta queda fuera por `HU-` al principio y por `/`. En Windows, `:` (ADS, `C:x`) está prohibido, y un punto o espacio final solo vuelve a la misma carpeta dentro de `hu/`. La ruta del proyecto sale de `find_entry` (el registro) y nunca del frontend |
| Enlaces simbólicos | `ctx.entry`/`ctx.read` pasan por `ReadContext::resolve`. El destino de cada symlink se comprueba de forma léxica antes de tocarlo, y se rechaza si sale del proyecto o cae en la lista de exclusión (`~/.claude`, `app_data`, el perfil de la original). La nube da ilegible sin descargar. Hay prueba (`projects_reader_keeps_symlink_deny_and_cloud_protections`). Ver R-2 |
| Tope de 512 KiB | `ReadMode::Whole(DOCUMENT_LIMIT)`: rechaza por `metadata.len()` y además lee con `take(limit + 1)`, así que un archivo que crece mientras se lee tampoco pasa. Un `\0` lo marca como ilegible |
| Sin escritura, ejecución ni red | `reader.rs` no tiene `Command`, ni escritura, ni `reqwest` salvo `Url::parse`, y no toca `projects.json` (`lastReadAt`). Nada se registra en logs |
| `external_link` | `raw` ≤ 2048 bytes y sin caracteres de control. `Url::parse`, `http`/`https`, host no vacío, sin usuario ni contraseña, y la URL reserializada ≤ 2048. Al sistema se le pasa `url.as_str()`, nunca `raw`. Hay pruebas de aceptación y de rechazo (`file:`, `javascript:`, `mailto:`, sin host, con usuario, largo y relativa) |
| Inyección de argumentos | La URL reserializada siempre empieza por `http`, así que no puede empezar por `-` (ni `open` ni `xdg-open` la toman como opción). El crate `url` codifica espacio, `"`, `<`, `>` y `` ` `` en ruta, consulta y fragmento, y rechaza la información de usuario. En Windows, `Command` no la entrecomilla y `rundll32 url.dll,FileProtocolHandler` recibe una sola cadena sin comillas ni espacios. No hay shell en ninguna plataforma. macOS usa la ruta absoluta `/usr/bin/open`. Linux, `xdg-open` (el mismo modelo que `open_update_url`). `unsupported` devuelve `AppError::unsupported` |
| ADR-0003 | Los comandos de `commands.rs` son finos, con `spawn_blocking`, y están registrados en `generate_handler!`. La lógica está en `read_project_history_sync`/`open_external_link_sync`. Las funciones de dominio devuelven `AppError`, y `String` solo aparece en `*_sync`. No hay `static` nuevo. Los nombres son únicos en el crate. `open_external_url` está en los cuatro archivos de `platform/`, con la misma firma. El espejo está en `types.ts` (`ProjectDataGap`, `timedHistories`, `ProjectDocument*`) y en `bridge.ts`, con su rama mock |
| Datos incompletos | `minutosTotales` ausente o `null` da `None` y `[NoTime]` sin aviso. Si no es numérico, da `None`, `[NoTime]` y un aviso. Una terminada sin `metricas.json` da `[NoMetrics]` sin aviso. Los dos huecos se excluyen entre sí y solo se marcan en terminadas. `summarize` suma solo los minutos que existen y cuenta `timed_histories`. El contrato es aditivo (0.x) |

### Frontend

| Punto | Resultado |
| --- | --- |
| `HistoryMarkdown.tsx` | Usa `skipHtml`, sin rehype (solo `remarkGfm`). `img` se pinta como `span` con el `alt` y nunca crea un `<img>`, también con referencias. Un enlace solo es pulsable si `linkTarget` dice `external` (`http:`/`https:` con host). Los demás (relativos, `#`, `mailto:`, `file:`, `javascript:`, notas al pie) son texto. Ver R-1 |
| `HistoryReaderDialog.tsx` | Usa `current` en el efecto y `key={projectId:folder}` en `DialogHost`, de modo que descarta las respuestas de una apertura anterior o de un reintento superado. El contenido vive solo en el estado del diálogo, sin store, URL ni `localStorage`. No hay `dangerouslySetInnerHTML` en `features/` ni en `code-block` |
| `projects-detail.ts` · `metricsCommand` | `node .metodo/scripts/metricas.mjs hu ${folder.slice(0, 7)}`. `folder` solo llega a la lista si Rust lo aceptó con `is_history_folder` (`HU-` y 4 dígitos **ASCII**), así que lo copiado es siempre `HU-dddd` y nunca texto libre del proyecto (ni `id` ni título). Ver R-3 |
| `IncompleteDataDialog.tsx`, `CopyButton.tsx` | Solo leen y copian. `CopyButton` usa `navigator.clipboard.writeText`, anuncia el resultado en una región `role="status"` y no ejecuta nada |
| `DialogHost.tsx` | Valida que el proyecto sea legible y que la historia exista, y si dejan de serlo limpia la bandera, solo con la lista en `ready`. Los diálogos son `lazy` |
| `AppSidebar.tsx` | `dialogOpen` añade `projectDialog`. Las líneas de la HU-0026 (`launch`, `stop`, botón por instancia) quedan intactas |
| Fila de historias | Un `<button>` en la primera celda da el foco y el teclado. Su clic sube al `onClick` del `tr`, de modo que hay un solo manejador y ningún `role` en el `tr` |
| Dependencias | `react-markdown` `10.1.0` y `remark-gfm` `4.0.1`, exactas en `package.json` y en el lockfile (`specifier: 10.1.0` / `4.0.1`). Solo las importa `HistoryMarkdown`, y a este solo `HistoryReaderDialog`, que se carga con `lazy`. En el `dist/` local, micromark y mdast están en `HistoryReaderDialog-*.js` (178 kB) y no en `index-*.js` |
| Desviación declarada: `code-block.tsx` y `scroll-area.tsx` | **Aceptada.** Fuera del catálogo solo los usan el showcase y esta HU. Los cambios llevan valores a la escala armónica (`me-2`, `pt-2`, `leading-(--lh-body)`, `p-0`) y unifican el anillo de foco con el resto de la app (`ring-2 ring-ring`). No cambian el comportamiento, y quedan documentados en `componentes/code-block.md` (ajuste 6) y `componentes/scroll-area.md` (ajuste 1) |
| Configuración | `config.mjs check` en orden. Las URLs de los mocks son de dominios reservados (`.test`/`.invalid`) y llevan `metodo:permitir` |

## Hallazgos

### R-1 · El enlace externo sigue siendo un `<a href>` que el webview puede seguir · **bloquea** · frontend

`src/features/projects/HistoryMarkdown.tsx:117-123`. `onClick` y `onAuxClick` (botón central) evitan la navegación,
pero el `href` real deja otras tres vías que no pasan por esos manejadores:

- el **menú contextual nativo** del webview sobre un enlace: «Abrir enlace» en WKWebView y WebKitGTK navega la ventana
  principal, y «Abrir enlace en ventana nueva» en WebView2 abre la URL en una ventana nueva. La app no suprime
  `contextmenu` en ninguna parte (`rg contextmenu src` no encuentra nada), y `preventDefault` en `auxclick` no lo evita;
- **arrastrar** el enlace y soltarlo en la propia ventana;
- el comentario de la línea 122 («el derecho y los demás solo se contienen, sin navegar la ventana») es falso por lo
  anterior.

El efecto es que la ventana de Code AI Profiles carga una web remota, sin forma de volver salvo reiniciar la app. Eso
incumple AC-05 («no carga nada de red») y la mitigación que la arquitectura daba por hecha. Las capacidades solo
cubren la ventana local, así que la web remota no tendría IPC. Por eso es un fallo de producto y no una escalada.

**Corrección:** no pintar `href`. Por ejemplo, `<a role="link" tabIndex={0} title={href} onClick={open}
onKeyDown={(e) => e.key === "Enter" && open(e)} …>` o un `<button type="button">` con el aspecto de enlace, con el
mismo icono y el mismo texto `sr-only`. Sin `href` no hay «Abrir enlace», ni arrastre como URL, ni clic central que
manejar (`onAuxClick` sobra). Si se prefiere conservar `href`, hay que añadir como mínimo
`onContextMenu={(e) => e.preventDefault()}` y `draggable={false}`. Conviene que `test:ui` compruebe que
`HistoryMarkdown.tsx` no pinta `href=` y corregir el comentario. Lo verifica una persona en macOS (y en Windows y Linux
en cuanto haya build): clic derecho y arrastre sobre un enlace del lector.

### R-2 · Un symlink dentro de la carpeta de la historia puede mostrar otro archivo del proyecto · no bloquea · orquestador (redacción del delta) o backend

`ReadContext` sigue un enlace simbólico si su destino queda **dentro del proyecto** y fuera de la lista de exclusión.
Por ejemplo, `hu/HU-0001-x/arquitectura.md -> ../../.env` se lee y se pinta en el lector. No sale nada de la máquina y
los datos de perfiles siguen protegidos. Pero AC-05 («no lee fuera de la carpeta de la historia») y el delta de RN-02
que escribí («solo dentro de `hu/<carpeta de la historia>`») dicen más de lo que el código garantiza. **Corrección
recomendada (barata):** al aplicar el delta, escribir que «se leen esos cuatro nombres en `hu/<carpeta>`; un enlace
simbólico se sigue solo si su destino queda dentro del proyecto y fuera de la lista de exclusión, como el resto de
RN-02». La otra opción es que el backend exija que la ruta resuelta quede bajo `hu/<carpeta>`, con un método nuevo de
`ReadContext` y no tocando `resolve`. Eso sería una historia o un `/fix` aparte.

### R-3 · `metricsCommand` confía en que la carpeta siempre está validada · no bloquea · frontend

`src/features/projects/projects-detail.ts:372` corta `folder.slice(0, 7)` sin comprobarlo. Hoy es seguro, porque Rust
solo devuelve carpetas que pasan `is_history_folder`. Como el texto se pega en una terminal, conviene una segunda
defensa: si `!/^HU-\d{4}$/.test(folder.slice(0, 7))`, devolver `null` y que el modal no muestre comando para esa
historia. Llevaría una prueba en `tests/projects.test.ts`.

## Lo que solo comprueba una persona

- R-1 una vez corregido: clic derecho y arrastre sobre un enlace del lector sin que la ventana navegue, y clic y Enter
  abriendo el navegador del sistema. En macOS ahora y en Windows y Linux con el build de CI.
- Con `happy-office` real: el chip «18 historias con datos incompletos · Ver», el modal con 13 y 5, el comando copiado
  pegado en la terminal del proyecto (la app no lo ejecuta), y la pista «de N de M terminadas».
- Que el lector no carga imágenes. Se ve en la pestaña Red del inspector, en un build de desarrollo.
