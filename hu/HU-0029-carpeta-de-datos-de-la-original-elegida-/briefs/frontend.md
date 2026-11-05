# Brief · HU-0029 · frontend

Criterios: AC-01, AC-02, AC-03, AC-04, AC-06 (interfaz). Modelo: **sonnet** (interfaz sobre un contrato cerrado).
Contrato: `arquitectura.md` § A-1, A-4 y A-5. Empiezas cuando backend haya commiteado `types.ts` y `bridge.ts`:
`SystemInfo.originalProfileOrigin: "chosen" | "detected" | "none"`, `originalProfileHasSessions: boolean`,
`originalProfileChosenMissing: boolean`; `bridge.chooseOriginalProfileFolder(): Promise<DashboardState | null>` y
`bridge.forgetOriginalProfileFolder(): Promise<DashboardState>`.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/features/original-app/original-profile.ts` (nuevo) | `originalProfileView(system)`, puro, sin Tauri |
| `src/features/original-app/useOriginalProfileActions.ts` (nuevo) | `choose()` y `forget()` |
| `src/features/original-app/index.ts` | Exporta lo anterior |
| `src/features/original-app/OriginalDetail.tsx` | «Perfil local» con `view.label`; aviso; ruta elegida y botones |
| `src/app/routes/original/OriginalRoute.tsx` | Pasa la vista y las acciones a `OriginalDetail` |
| `tests/dashboard-state.test.ts` | Casos de `originalProfileView` |

## Datos que llegan a la pantalla

Solo `originalProfilePath`, `originalProfileOrigin`, `originalProfileHasSessions`, `originalProfileChosenMissing`.
Nada más (ni listados de carpetas ni contenido).

## Pasos

1. **`originalProfileView`** devuelve `{ label, warning, chosenPath, canForget }`, con la tabla de A-5:
   `label` «Elegido» | «Detectado» | «Sin sesiones» | «Sin detectar»; `warning`: `"chosen-missing"` si
   `chosenMissing`, si no `"no-sessions"` cuando `!hasSessions`, si no `null`; `chosenPath` = la ruta solo con
   `origin === "chosen"`; `canForget` = `origin === "chosen" || chosenMissing`.
2. **`useOriginalProfileActions`**, como `save` de `useInstanceActions.ts`: `setBusy("original-profile")`,
   `setError(null)`; `choose`: `const next = await bridge.chooseOriginalProfileFolder()`; `null` (canceló) no cambia
   nada; si no, `replaceDashboard(next)`. Error → `setError(friendlyError(reason))` (el mensaje M-n de Rust lo pinta
   `FeedbackArea`; la página queda como estaba, AC-03). `forget` igual con `forgetOriginalProfileFolder`.
3. **`OriginalDetail`**: `Metric label="Perfil local" value={view.label}`. Con `view.warning`, un `Alert`
   (`components/ui/alert`) entre la tarjeta principal y la de sesiones, con los textos literales de A-5 y en
   `AlertAction` «Elegir carpeta» (+ «Usar la detectada» si `canForget`). Con `view.chosenPath`: bajo la versión,
   `Datos · <ruta>` (mono, `truncate`, `title` con la ruta) y botones `outline` «Cambiar carpeta» y «Usar la
   detectada». Botones deshabilitados con `busy === "original-profile"`, con `Spinner` en el que corre.
4. Sin aviso y origen detectado con sesiones: **la página se ve como hoy** (AC-01).
5. Iconos lucide si hacen falta (`FolderOpenIcon`, `FolderSearchIcon`, `RotateCcwIcon`); nada de CSS nuevo, solo
   tokens y clases del sistema.

## Variables de entorno nuevas

Ninguna.

## Pruebas

En `tests/dashboard-state.test.ts` (`pnpm test:dashboard`): los 5 casos de la tabla de A-5, incluido `chosenMissing`
con detectada con sesiones (label «Detectado», aviso «chosen-missing», `canForget`). Corre solo las relacionadas:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>` y `pnpm build`.

Comprobación visual en el navegador: `pnpm dev`, `/?original=sin-sesiones#/original` → aviso → «Elegir carpeta»
rechaza (M-3) → otra vez acepta → «Elegido», ruta y sesiones → «Usar la detectada» vuelve al aviso.

## Si dudas

`graphify explain "OriginalDetail"`, `graphify explain "runAction"`; `src/features/instances/useInstanceActions.ts`
para el patrón de acción; `src/components/ui/alert.tsx` para `Alert`/`AlertAction`.

## No toques

`src/types.ts`, `src/lib/bridge.ts`, `dashboard-store.ts` (son de backend); `SessionList`, los diálogos de
transferencia, `matchesOriginalApp` (sigue buscando por `originalProfilePath`).

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`.
