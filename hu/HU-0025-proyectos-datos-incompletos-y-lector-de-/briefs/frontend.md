# Brief · HU-0025 · frontend

Criterios: AC-02, AC-03, AC-04, AC-05 (la parte visible). Modelo: **sonnet**: presentación sobre un contrato cerrado;
lo sensible (no `<img>`, enlaces) va fijado aquí y en pruebas, y la revisión técnica lo comprueba.
Contrato: `arquitectura.md` § A-1 y § A-5, ya en `src/types.ts` y `src/lib/bridge.ts` (los hace backend; no los cambies).
Empieza sobre el commit de backend y con la maqueta aprobada.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `package.json`, `pnpm-lock.yaml` | `react-markdown` **10.1.0** y `remark-gfm` **4.0.1**, exactas (`pnpm add -E`); autorizadas en la historia |
| `src/features/projects/projects-detail.ts` | Selectores puros: `incompleteHistories`, `incompleteChip(info, warnings)` (texto y tono), `incompleteGroups`, `metricsCommand(folder)` = `node .metodo/scripts/metricas.mjs hu ${folder.slice(0, 7)}`, `timeHint(totals, counts)`; `limitWarnings` sigue para el grupo «Avisos» |
| `src/features/projects/history-reader.ts` (nuevo, puro) | `readerBody(content, title)` (quita frontmatter `---…---` inicial y el primer `# ` si es igual al título), `linkTarget(href)` → `"external" \| "text"` (solo `http:`/`https:`) |
| `src/features/projects/ProjectPage.tsx` | Fuera la lista de avisos; props `onOpenIncomplete()` y `onOpenHistory(folder)` |
| `src/features/projects/ProjectHero.tsx` | El chip (D-1) en la fila de insignias, 24 px, botón accesible |
| `src/features/projects/ProjectHistories.tsx` | Etiquetas «Sin tiempo» / «Sin métricas» (`colSpan={2}`), fila pulsable con teclado, descripción «Pulsa una historia para leerla» |
| `src/features/projects/ProjectFigures.tsx` | Pista de *Tiempo en fases* con `timeHint` |
| `src/features/projects/IncompleteDataDialog.tsx` (nuevo) | Modal 640 px (A-5): Avisos → Sin métricas (`CodeBlock` + copiar, «Copiar todos») → Sin tiempo |
| `src/features/projects/HistoryReaderDialog.tsx` (nuevo, `export default`) | Lector: carga, pestañas, ilegible, reintentar, pie «Solo lectura · ruta» |
| `src/features/projects/HistoryMarkdown.tsx` (nuevo) | `react-markdown` + `remark-gfm` + mapa de componentes del catálogo |
| `src/features/projects/index.ts` | Exporta `IncompleteDataDialog` y un `HistoryReader` = `lazy(() => import("./HistoryReaderDialog"))` |
| `src/app/providers/dialogs-context.ts`, `DialogsProvider.tsx` | Bandera `projectDialog: { kind: "incomplete", projectId } \| { kind: "reader", projectId, folder } \| null` |
| `src/app/layout/DialogHost.tsx` | Monta los dos (el lector dentro de `Suspense` con el esqueleto); sin proyecto legible → no pinta y limpia la bandera |
| `src/app/layout/AppSidebar.tsx` | `dialogOpen` incluye `projectDialog` (⌘ , no navega detrás del modal) |
| `src/app/routes/project/ProjectRoute.tsx` | Conecta las props de `ProjectPage` con `setProjectDialog` |
| `tests/projects.test.ts` | Casos nuevos |

## Pasos

1. Dependencias y selectores puros con sus pruebas. Los diálogos van por `useDialogs()` porque `features/` no importa
   de `app/` y porque `AppSidebar` necesita saber que hay un modal.
2. Página, fila y cifras. Chip: «N historias con datos incompletos · Ver» (1 → «1 historia…»); con avisos, icono
   triángulo, borde `--ui-warning` y «· M avisos»; solo avisos → «M avisos al leer el proyecto · Ver»; nada → no hay.
3. Modal de datos incompletos. «Copiado» con ancho mínimo común (112 px). Copiar con `navigator.clipboard`, como
   `CodeBlockCopyButton`; textos y `aria-label` en español.
4. Lector. Pide `bridge.readProjectHistory(projectId, folder)` al abrir y en «Reintentar»; descarta una respuesta
   vieja con un contador de petición. El contenido vive en el estado del diálogo, nunca en un store, `localStorage` ni
   la URL. Error de toda la llamada → `Empty` con el mensaje de Rust y «Reintentar».
5. Markdown (D-2), sin excepciones: `skipHtml`, `remarkPlugins={[remarkGfm]}`, **ningún** plugin rehype; `img` → un
   `span` con «Imagen no mostrada: {alt}», **nunca** `<img>` (la CSP dejaría cargar `https:`); `a` con
   `linkTarget = "external"` → `<a href>` con `onClick`/`onAuxClick` que hacen `preventDefault` y llaman a
   `bridge.openExternalLink(href)`, `title={href}` e `ExternalLinkIcon`; el resto de enlaces → texto. `pre` →
   `CodeBlock`; tablas → `Table` con desbordamiento horizontal; casillas → `Checkbox` deshabilitado. Columna de 720 px,
   texto 14/24, ritmo de `vista.md` (5). Solo utilidades de Tailwind, sin `.css`.

## Variables de entorno nuevas

Ninguna. El comando de métricas no es configuración: es el del método, armado desde `folder`.

## Pruebas

En `tests/projects.test.ts` (importa los `.ts` directos, sin React): chip (0/0 → nada, solo avisos, ambos, singular);
grupos y orden; `metricsCommand` usa `folder` aunque el `id` traiga otra cosa; `timeHint` (23 de 41 y exacto);
`readerBody` (con y sin frontmatter, h1 igual y distinto, CRLF ya normalizado); `linkTarget` (`https`, `http` →
externo; `javascript:`, `file:`, `mailto:`, `#x`, `../a.md`, `//host` → texto).

```bash
pnpm build && pnpm test:projects && pnpm test:ui
node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src/features/projects src/app/layout/DialogHost.tsx
```

Con la app abierta (`pnpm dev`, mock tipo `happy-office`): chip, modal, lector con imagen y HTML crudo sin pintar,
enlace que no navega la ventana, 1440×920 y 980×680, claro y oscuro, foco de teclado.

## Si dudas

`graphify explain "ProjectHistories"`, `node .metodo/scripts/grafo.mjs impacto "ProjectPage"`, la maqueta
(`diseno/maqueta.html#pantalla=lector&estado=hu`), las fichas `dialog.md`, `tabs.md`, `code-block.md`,
`scroll-area.md` de la skill `code-ai-profiles-ui`.

## No toques

`src/types.ts`, `src/lib/bridge.ts`, `src-tauri/**`, la CSP, `ProjectConsumption` (RN-03 no cambia) y los
componentes del catálogo (si uno necesita un ajuste, pídelo con su ficha).

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-configuracion`,
`code-ai-profiles-pruebas`.
