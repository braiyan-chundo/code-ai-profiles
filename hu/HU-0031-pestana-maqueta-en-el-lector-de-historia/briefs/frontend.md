# Brief · HU-0031 · frontend

Criterios: AC-01, AC-02, AC-03, AC-04. Modelo: opus, porque pone la frontera de aislamiento de la maqueta (AC-03): un
atributo de más en el `<iframe>` abre la app a HTML ajeno.
Contrato: `arquitectura.md` § A-1, A-3 y A-4. Empieza cuando el backend haya dejado `src/types.ts`.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/features/projects/history-reader.ts` | `MOCKUP_CSP`, `mockupDocument(html)`, `tabLabel(document)`, `mockupActions(document)`, puras |
| `src/features/projects/HistoryReaderDialog.tsx` | pestaña «Maqueta»; cuerpos `ok`/`tooLarge` de design; «Abrir en el navegador»; aviso de fallo; doc |
| `src/lib/bridge.ts` | `openHistoryMockup(id, folder)`; mock de maqueta `ok`, `tooLarge` y `unreadable` |
| `tests/projects.test.ts` | pruebas de las funciones puras |

## Pasos

1. `history-reader.ts`:
   - `MOCKUP_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:; form-action 'none'; base-uri 'none'"`.
   - `mockupDocument(html): { srcdoc: string }`: quita un BOM inicial e inserta
     `<meta http-equiv="Content-Security-Policy" content="${MOCKUP_CSP}">` justo tras
     `^\s*(?:<!--[\s\S]*?-->\s*)*<!doctype[^>]*>` (sin distinguir mayúsculas), o al principio. No toca nada más.
   - `tabLabel(document)`: «Maqueta» si `kind === "design"`, si no `document.file`.
   - `mockupActions(document)`: `{ open: boolean; retry: boolean }`: `ok` y `tooLarge` → `open: true, retry: false`;
     `unreadable` → `open: false, retry: true`.
2. `bridge.ts`: `openHistoryMockup(id, folder)` → `call("open_history_mockup", { id, folder })`. **Nunca** una ruta.
   Mock: la misma validación de `folder` que `readProjectHistory`, y `console.info` (no abre nada). En
   `mockHistoryDocuments`, al final: una historia con maqueta `ok` (HTML pequeño con `<style>` y `<script>`, **sin
   URLs**: la guarda las bloquea), otra `tooLarge` («maqueta.html pesa más de 1 MiB y no se pinta aquí.») y otra
   `unreadable`. Historias del mock que existan; anótalo en el comentario.
3. `HistoryReaderDialog.tsx`:
   - `TabsTrigger` con `tabLabel`; el orden es el de `documents` (no reordenes ni filtres). Icono de aviso solo para
     `unreadable`, como hoy.
   - design `ok`: **en lugar** del `ScrollArea`, un contenedor `min-h-0 flex flex-col` que ocupa la fila del cuerpo:
     franja («Vista estática: sus botones funcionan en el navegador.» + «Abrir en el navegador») y
     `<iframe title={`Maqueta de ${history.id}`} sandbox="" srcDoc={srcdoc} referrerPolicy="no-referrer" className="block min-h-0 w-full flex-1 border-0 bg-white" />`.
     `srcdoc` con `useMemo` sobre `active.content`. Nada de `HistoryMarkdown`, `readerBody`, `max-w`, `px-6 py-6`.
   - `sandbox=""` **vacío y literal**. Prohibido `allow-*`, `allow=`, `onLoad`, un `ref` que lea
     `contentDocument`/`contentWindow` o un listener de `message`.
   - design `tooLarge`: un `Empty` como el de ilegible: «La maqueta es demasiado grande para verla aquí», el mensaje de
     Rust y «Abrir en el navegador». Sin «Reintentar». Hoy la rama `else` pinta ilegible todo lo no `ok`: sepáralo.
   - `unreadable`: el `UnreadableDocument` de siempre, sin botón de abrir.
   - El botón: `bridge.openHistoryMockup(projectId, folder)`, deshabilitado con `Spinner` mientras abre. Si falla,
     `NoticeAlert` del pie con título «No se pudo abrir la maqueta» (generaliza el estado `linkError` a título +
     mensaje; los enlaces siguen con «No se pudo abrir el enlace»).
   - Pie sin cambios («Solo lectura · hu/<carpeta>/diseno/maqueta.html»).
   - Disposición y textos finales: los de `hu/HU-0031-…/diseno/maqueta.html`.

## Variables de entorno nuevas

Ninguna. `MOCKUP_CSP` no es configuración.

## Pruebas

En `tests/projects.test.ts`, junto a las de `readerBody`:

- `mockupDocument`: tras `<!doctype html>` y `<!DOCTYPE HTML>`; tras comentarios + doctype; al principio sin doctype;
  con BOM; resto del HTML idéntico; el `<meta>` una sola vez y antes de cualquier `<style>`/`<img>`/`<script>`.
- `MOCKUP_CSP`: contiene `default-src 'none'`; no contiene `https:`, `http:`, `'self'`, `asset:`, `unsafe-eval` ni
  `script-src`.
- `tabLabel`: «Maqueta» para design, `hu.md` para hu; sin design ninguna etiqueta es «Maqueta»; con design al final, la
  última lo es (AC-01).
- `mockupActions`: `ok`/`tooLarge` abren sin reintentar; `unreadable` reintenta sin abrir (AC-04).

`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src/features/projects/history-reader.ts src/features/projects/HistoryReaderDialog.tsx src/lib/bridge.ts tests/projects.test.ts`
y `pnpm build`. Mira en `pnpm dev` (mock) los tres casos.

## Si dudas

`node .metodo/scripts/grafo.mjs impacto "HistoryReaderDialog"`; `arquitectura.md` § H-2…H-5; las skills
`code-ai-profiles-frontend-react-vite` y `code-ai-profiles-ui` (Tabs, Empty, NoticeAlert, Button).

## No toques

`src-tauri/**` (incluidos `tauri.conf.json` y `capabilities/`), `src/types.ts` (backend), `HistoryMarkdown.tsx`,
`readerBody`/`linkTarget`, `openExternalLink`, el ancho del diálogo (`sm:max-w-[960px]`), las otras pestañas.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas`, `code-ai-profiles-configuracion`.
