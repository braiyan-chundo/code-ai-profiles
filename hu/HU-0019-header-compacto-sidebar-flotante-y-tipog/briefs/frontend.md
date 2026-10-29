# Brief · HU-0019 · frontend

Criterios: AC-02, AC-03, AC-04 y AC-05 (AC-01 ya está cumplido). Modelo: **sonnet**: es interfaz, sin dinero, sin estados, sin permisos y sin migrar datos reales.
Contrato: `arquitectura.md` § Solución, A-1 a A-7 (decisiones de interfaz; sin IPC). La maqueta (`diseno/maqueta.html`, variante A) manda en lo visual.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/styles/tokens.css` | Fuera `--session-*`. Entran `--fs-micro…--fs-dialog`, `--esc` y `--ctl`, `--ctl-sm`, `--ctl-lg`, `--ctl-xs` y `--ctl-badge` en `:root` y `:root[data-text-size=…]` (tabla de A-3) |
| `src/styles/ui-theme.css` | En `@theme inline`, `--text-xs…--text-2xl` (bloque literal de A-3) |
| `src/features/appearance/AppearanceProvider.tsx` | `root.dataset.textSize` en lugar de `sessionText` |
| `src/features/appearance/AppearanceDialog.tsx` | Los textos de A-6; fuera `min-h-(--session-row-height)` |
| `src/components/ui/{button,input,badge,kbd,sidebar,dialog,alert-dialog}.tsx` | Las alturas con `--ctl*` (tabla de A-3) y los títulos con `--fs-dialog` |
| `src/app/layout/{AppShell,Titlebar,PageHeader,PageContent,FeedbackArea,Statusbar,AppSidebar}.tsx` | El armazón de A-1, A-2 y A-5 |
| `src/app/routes/dashboard/{DashboardRoute,SummaryCards,UsageRanking}.tsx`, `src/app/routes/instance/InstanceRoute.tsx` | Botones de la barra (A-1), tamaños (A-4) y la sección «Instancias» |
| `src/features/{instances,original-app,sessions,updates}/*.tsx`, `src/components/NoticeAlert.tsx` | Tamaños (A-4) y `--quiet` → `text-muted-foreground` |
| `tests/ui-isolation.test.ts` | Pruebas 12, 13 y 14 y sus canarios en la 9 (A-7) |
| `DESIGN.md`, `.claude/skills/code-ai-profiles-ui/{componentes/*.md,tema.md}`, `.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md` | Paso 6 de la secuencia |

## Pasos

Son los pasos 1 a 7 de `arquitectura.md` § Secuencia, en orden, cada uno con su verificación. El 0, los semáforos de
macOS, lo hace el orquestador: no toques `src-tauri/`.

1. **Escala.** Pon los tokens y el puente, y renombra el atributo. Escribe ya las pruebas 12–14: fallan hasta el paso 2.
2. **Migración**, con la tabla de A-4. La regla que no se negocia: el tamaño es **siempre** `text-(length:--fs-<x>)`,
   nunca una utilidad propia como `text-micro`, porque `cn` la toma por un color y la borra (comprobado). El
   interlineado va aparte (`leading-none`). Quita las alturas fijas que recorten el texto (`h-4` del badge de estado
   en `UsageRanking`). Todo `text-(--quiet)` pasa a `text-muted-foreground`.
3. **Armazón** (A-1). Ni portal ni contexto: la rejilla del dibujo de A-1. `--titlebar-height: 52px` en las tres
   plataformas. `Titlebar` es la zona sobre el sidebar (hueco de 84 px en macOS y 16 px en el resto, el botón de
   plegar y, en Windows, los controles), y deja de llevar la marca. `PageHeader` va en la fila 1 a 52 px, con las
   migas y `data-tauri-drag-region` en cada elemento sin controles, `pr-[160px]` en Windows y `pl-[68px]` en macOS
   plegado. Después, márgenes y barra de estado (A-5).
4. **Sidebar** (A-2): `variant="floating"`, 256 px, `--sidebar` sobre `--surface-raised`, marca en la cabecera,
   contadores con `SidebarMenuBadge` y raya entre grupos al plegar. Conserva todo lo de hoy (lista de A-2).
5. **Apariencia** (A-6).
6. **Documentación.** La skill `frontend-react-vite` no puede crecer: el detalle va a `estilos.md`, dentro de la skill.
   Cada ajuste del catálogo, en su ficha («Diferencias con el registro»).
7. **Comprobación**, como en el paso 7 de `arquitectura.md`: medidas del DOM, el guion del mínimo de 11 px, capturas
   en `hu/HU-0019-…/evidencias/` y el peso. Para ver Windows y Linux, cambia en local `platform` en el mock de
   `src/lib/bridge.ts`, sin commitearlo, y termina con `git diff --exit-code src/lib/bridge.ts`. Recorre el inventario
   de AC-05.

## Variables de entorno nuevas

Ninguna.

## Señales

No aplica.

## Pruebas

Las de A-7 en `tests/ui-isolation.test.ts`, con el script `test:ui` de siempre: no hace falta script ni paso de CI nuevos. `test:appearance` no cambia.
Corre solo las relacionadas: `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`, más `pnpm build`.
La suite la corre el orquestador.

## Si dudas

- `graphify explain "AppShell"`, `"PageHeader"`, `"AppSidebar"` y `node .metodo/scripts/grafo.mjs impacto "<símbolo>"`.
- Cómo se comporta un componente del catálogo: skill `code-ai-profiles-ui` (fichas `sidebar.md`, `button.md`) y su código en `src/components/ui/`.
- Una medida o un color: `diseno/maqueta.html`, `<style id="tokens">` §2–§4 (por ejemplo, `.cab`, `.sb`, `.panel`, `.estado`).
- Si algo de la maqueta no cabe en A-1…A-6, pregunta al orquestador. No inventes una tercera vía.

## No toques

- `src/app/providers/DashboardRuntime.tsx`, los hooks `use*Runtime`, `useLiveUsage`, `useBackgroundRefresh` ni
  `lib/*-controller.ts` (R-1). Nada de listeners nuevos: el corte de 1071 px es CSS.
- `src/types.ts`, `src/lib/bridge.ts` (salvo el cambio local que se revierte), `src-tauri/`.
- `appearance-preferences.ts`: el campo `sessionTextSize` y sus valores se quedan, porque son datos guardados.
- La paleta, los radios y el contenido de las pantallas: solo cambian el armazón y los tamaños.
- Los componentes del catálogo que la app no usa (`calendar`, `questionnaire`…).
- Procesos de Claude y `~/Library/Application Support/com.braiyan.claudeprofiles/`. Vite se para por su PID.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas` y `code-ai-profiles-configuracion`.
