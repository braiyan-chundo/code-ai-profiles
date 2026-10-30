# Brief · HU-0024 · frontend

Criterios: AC-01, AC-03, AC-04, AC-05, AC-06 (la parte visible). Modelo: **sonnet**, porque son textos, presentación y
un botón sobre acciones que ya existen; no hay lógica de instalación en la interfaz.
Contrato: `arquitectura.md` § A-1 (aditivo, 0.x) y § A-5.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/types.ts` | `SourceUpdateSource` + `"officialRelease"`; `SourceUpdateInfo.warning: string \| null` |
| `src/lib/bridge.ts` | Los dos mocks de `sourceUpdate` (≈L128 y `checkSourceUpdate` ≈L634) con `warning: null`; el de `checkSourceUpdate` puede devolver `source: "officialRelease"` |
| `src/lib/source-update-controller.ts` | `sourceUpdatePresentation`: título de «available», `warning` en «local-ahead» y en un «uncertain» nuevo (A-5) |
| `src/features/updates/SourceUpdateBanner.tsx` | Acción principal «Instalar» (antes «Descargar e instalar»); detalle «Instalada A · publicada X.» |
| `src/features/updates/useUpdateActions.ts` | En el `catch` de `installOriginal`: `bridge.checkSourceUpdate()` y fusión con `mergeSourceUpdateForInstallation` (errores de esa comprobación se ignoran) |
| `src/features/updates/SynchronizeBanner.tsx` | Botón «Actualizar instancias obsoletas» |
| `src/features/instances/InstanceDetail.tsx` | Prop `onUpdate`; botón «Actualizar» si `updateAvailable` |
| `src/app/routes/instance/InstanceRoute.tsx` | `onUpdate={() => { clearFeedback(); setUpdateTargets([instance]); }}` |
| `src/app/routes/dashboard/UsageRanking.tsx` | Insignia «Actualizar» en filas por detrás (`versionTopology.staleInstanceIds`) |
| `tests/source-update-controller.test.ts` | Casos nuevos de presentación |

## Pasos

1. Tipos y mocks (compila el contrato antes que nada: `pnpm build`).
2. Presentación (A-5): «available» → título `Hay una nueva versión de ${appName} (${latestVersion}). ¿Deseas
   instalarla?`; `available` ignora `warning`. `current` + `originalBehind` → «local-ahead» con `warning` añadido al
   detalle. `current` + `warning` → `kind: "uncertain"`, título «No se pudo confirmar si hay una versión nueva»,
   detalle `warning`, acción «Comprobar actualización». Lo demás, igual.
3. Banner: en macOS con instalación visible, «Abrir {appName}» (secundario) + «Instalar» (principal, `DownloadIcon`).
   El motivo de bloqueo (original abierta) sigue en el detalle. Sin diálogo nuevo.
4. `OriginalDetail.tsx` mantiene «Descargar e instalar» (los textos de `permissions/permission-cards.ts` lo citan).
5. Instancia: «Actualizar» (`RefreshCwIcon`, `variant="outline"`, `size="lg"`) junto a «Abrir», desactivado con
   `isBusy` o en marcha, con `title` «Detén la instancia para actualizarla» en ese caso (en un `span`, como en
   `DashboardRoute`). «Abrir» no cambia: AC-04 exige que nunca se bloquee por versión. La insignia «Actualización
   disponible» se queda.
6. `UsageRanking`: `Badge` «Actualizar» dentro de la fila (la fila es `Link`: nada de botones dentro).

## Variables de entorno nuevas

Ninguna.

## Pruebas

En `tests/source-update-controller.test.ts`: título nuevo con `officialRelease`; `warning` en «uncertain» y en
«local-ahead»; `available` con `warning` sigue siendo «available»; `stale` sigue ganando. Si hay helper puro nuevo
para la insignia, su caso. Correr:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src/lib/source-update-controller.ts src/features/updates/SourceUpdateBanner.tsx src/features/instances/InstanceDetail.tsx`
y `pnpm build`. Comprobar en el navegador (mock) dashboard, `#/original` e instancia por detrás.

## Si dudas

`graphify explain "sourceUpdatePresentation"`, `graphify explain "originalInstallAvailability"`; la skill
`code-ai-profiles-frontend-react-vite` (features, bridge, controladores puros) y `code-ai-profiles-ui` (Badge, Button).

## No toques

- `src-tauri/` y `.env.example` (backend).
- `useSourceUpdatePolling` (sigue en 6 h: la cadencia la gobierna la caché del backend).
- `originalInstallAvailability` y `installOriginal` (salvo el `catch`): ya hacen lo que pide la historia.
- `ApplicationUpdateDialog`: se reutiliza tal cual con una sola instancia.
- La barra lateral (`AppSidebar.tsx`): fuera de esta historia.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas`.
