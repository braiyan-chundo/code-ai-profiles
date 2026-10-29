# Brief · HU-0016 · frontend

Criterios: AC-01 a AC-06. **Modelo: opus para E1 y E3** (cascada y preflight, tema en portales, plataformas, R-1,
guardas de `busy`) y **sonnet para E2** (composición con la lógica intacta). Rama `hu-0016-rediseno-sidebar`. Sin push.
Contrato: `arquitectura.md` (A-1 a A-15, § CSS, § `test:ui`, § Inventario de AC-06, § Secuencia). No hay IPC: **no
tocas** `src/types.ts`, `src/lib/bridge.ts` ni `src-tauri/`. P-1 está resuelta (macOS 13.3, commit O del orquestador).

## Archivos (comprobados)

| Archivo | Qué cambia |
| --- | --- |
| `vite.config.ts` | A-1: `@tailwindcss/vite` estático y siempre. El resto, igual |
| `src/styles/index.css` | § CSS. Paso 7: `tokens.css` sustituye `base.css`, `theme-light.css`, `animations.css` y `responsive.css` |
| `src/main.tsx`, `src/lib/webview-support.ts` (nuevo) | A-16: aviso de motor (pensado para Linux), con estilos en línea, antes de `createRoot().render(<App/>)` |
| `src/features/appearance/{AppearanceProvider.tsx,appearance-preferences.ts}` | A-3 (`useLayoutEffect` sobre `<html>`) y A-5 (`sidebar`) |
| `src/components/ui/{sidebar,dialog,sheet}.tsx` + fichas en `.claude/skills/code-ai-profiles-ui/componentes/` | A-4 |
| `src/app/{router.tsx,layout/*}` | A-6, A-7, A-8, A-10 y A-12. Nuevos `AppSidebar.tsx` y `FeedbackArea.tsx` |
| `src/app/routes/{dashboard,original,instance}/` | Nuevos (A-8, A-9 y A-15). `routes/panel/` se borra en el paso 5 |
| `src/features/{instances,original-app,sessions,dashboard,scan,updates,appearance}/` | Se rehacen las vistas (§ Estructura). La lógica no se toca |
| `src/components/{BrandMark,EmptyState}.tsx` | A-14. `Icons`, `ModalFrame`, `ConfirmDialog`, `Metric`, `LoadingCards` y `*.css` se borran |
| `tests/ui-isolation.test.ts`, `tests/appearance.test.ts`, `tests/dashboard-state.test.ts` | § `test:ui`; `sidebar`; `usageRanking` y `findInstance` |
| `.github/workflows/validate.yml` | El paso del bundle y el nombre del de `test:ui` |
| `src/showcase/showcase.css` | Paso 7: importa `tokens.css` |
| `DESIGN.md`, `.claude/skills/code-ai-profiles-{frontend-react-vite,ui}/`, `.metodo/reglas/frontend.md` | Paso 7. La skill de frontend, en 170 líneas o menos: se sustituye, no se añade |

## Pasos (los de § Secuencia; un commit por paso, trailer `HU: HU-0016`)

0. Línea base, sin commit: tamaños de `dist/assets` tras `pnpm build`, y capturas de `#/` (oscuro y claro, 1440×920
   y 980×680) con `pnpm dev`. Todo en el scratchpad.
1. **E1**: Tailwind en la app (A-1, A-2), tema en `<html>` (A-3), catálogo (A-4), campo `sidebar` (A-5), aviso de
   motor, `test:ui` nuevo (pruebas 1–9) y `validate.yml`. El panel heredado tiene que seguir **usable**. Lo que
   rompa el preflight y lo impida, a `styles/legacy-compat.css`. Lo puramente estético, no.
2. **E1**: shell con sidebar, titlebar por plataforma, statusbar y rutas. Las páginas usan temporalmente
   `InstanceCard` y `OriginalAppSection`. **Fin de E1**: lo devuelves al orquestador.
3. **E2**: `InstanceDetail`, `SessionList` y medidores en `#/instancias/:id`.
4. **E2**: `OriginalDetail` en `#/original`.
5. **E2**: dashboard, `FeedbackArea`, búsqueda en el sidebar con Ctrl/⌘ F, y borrado del panel y de sus piezas.
   **Fin de E2.**
6. **E3**: los 7 diálogos (A-12) y fuera el Escape de `DialogsProvider`.
7. **E3**: lucide, `tokens.css`, el legado borrado, `test:ui` 10–11 y la documentación. **Fin de E3.**

Antes de cada paso, relee la fila de § Inventario de AC-06 que afecte a lo que mueves, y al acabar compruébala en el
DOM. Cada entrega devuelve: lo comprobado del inventario, las capturas, `pnpm build`, las relacionadas y los desvíos.

## Variables de entorno nuevas

Ninguna. Sin URLs en el código (el aviso de motor no enlaza a nada).

## Pruebas

- `tests/ui-isolation.test.ts` reescrito (§ `test:ui`, con canario y rutas `\`);
- `tests/appearance.test.ts`: `sidebar` válido, inválido y ausente;
- `tests/format.test.ts`: `webview-support` (sin capas, sin `color-mix`, los dos presentes);
- `tests/dashboard-state.test.ts`: `usageRanking` (de mayor a menor por el mayor de los dos porcentajes, los `null`
  al final y el empate por nombre) y `findInstance`.

Imports relativos con `.ts`, como hoy. Se corren solo las relacionadas:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`. También `pnpm build`.

## Si dudas

- `graphify explain "DashboardRuntime"`, `graphify explain "SidebarProvider"` y `graphify query "<pieza>"` antes de moverla.
- La skill `code-ai-profiles-ui` (fichas de `sidebar`, `dialog`, `alert-dialog`, `progress`, `empty`, `item`) y
  su `tema.md`.
- La skill `code-ai-profiles-frontend-react-vite`.
- `docs/arquitectura/frontend.md` (§ Estado, § Estilos y § Design system).
- Si algo exige tocar Tauri, IPC o un `tauri*.json`, **paras** y lo devuelves.

## No toques

- `DashboardRuntime.tsx`: ni el orden ni las llamadas.
- Los hooks de ejecución: `useScan*`, `useSourceUpdate*`, `useLiveUsage` y `useBackgroundRefresh`.
- `dashboard-store.ts`, `lib/*-controller.ts`, `bridge.ts`, `types.ts` y `src-tauri/`.
- `showcase/sections/`.
- No añadas dependencias. No montes `Toaster` (A-13). No regeneres con `shadcn add --overwrite`.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
