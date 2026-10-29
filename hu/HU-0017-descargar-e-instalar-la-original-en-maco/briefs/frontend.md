# Brief · HU-0017 · frontend

Criterios: AC-01, AC-02, AC-03, AC-04, AC-05 (lo visible). Modelo: **sonnet**: pantallas, estado y un efecto
acotado; la parte delicada (escribir sobre la original) está en Rust.
Interfaz: `arquitectura.md` § A-6 y A-10. Contrato § A-2/A-3, literal abajo (nada más de Rust); lo escribe
backend en B-1: empiezas cuando `src/types.ts` y `src/lib/bridge.ts` lo tienen. **No los edites.**
```ts
// IPC: install_original_update { request, onProgress: Channel<OriginalInstallProgress> } · cancel_original_update -> boolean
export interface InstallOriginalUpdateRequest { expectedVersion: string }
export type OriginalInstallPhase = "preparing" | "downloading" | "verifying" | "installing" | "synchronizing";
export interface OriginalInstallProgress { phase: OriginalInstallPhase; targetVersion: string | null;
  receivedBytes: number; totalBytes: number; cancellable: boolean }
export type OriginalInstallStatus = "installed" | "cancelled";
export interface OriginalInstallResult { status: OriginalInstallStatus; previousVersion: string | null;
  installedVersion: string | null; synchronization: SynchronizationItemResult[];
  pendingInstanceIds: string[]; dashboard: DashboardState }
// bridge: installOriginalUpdate(request, onProgress): Promise<OriginalInstallResult>; cancelOriginalUpdate(): Promise<boolean>
```

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/features/dashboard/dashboard-store.ts` | `originalInstall: OriginalInstallProgress \| null`, `pendingSyncIds: string[]`; acciones `original-install/progressed`, `original-install/finished`, `pending-sync/added`, `pending-sync/removed` (puras, mismo `store` si no cambia) |
| `src/features/dashboard/DashboardProvider.tsx`, `dashboard-context.ts` | Sus setters |
| `src/features/updates/original-install.ts` (nuevo, puro) | `originalInstallAvailability(system, busy)` → `{ visible, disabledReason }`; `installPhaseLabel(progress, appName)`; `summarizeOriginalInstall(result, appName)` → `{ notice, error }`; `pendingSyncPlan(pendingIds, dashboard)` → `{ ready, drop }` |
| `src/features/updates/useUpdateActions.ts` | `installOriginal()` y `cancelInstall()` |
| `src/features/updates/usePendingSynchronization.ts` (nuevo) | Efecto de A-6 |
| `src/features/updates/OriginalInstallPanel.tsx` (nuevo) | `NoticeAlert` + `Progress` + «Cancelar» |
| `src/features/updates/SourceUpdateBanner.tsx`, `SynchronizeBanner.tsx`, `index.ts` | A-10 |
| `src/features/original-app/OriginalDetail.tsx`, `src/app/routes/original/OriginalRoute.tsx` | Botón principal y secundario |
| `src/features/instances/InstanceDetail.tsx` | `Badge` «Sincronización pendiente» |
| `src/app/layout/FeedbackArea.tsx` | Monta `OriginalInstallPanel` |
| `src/app/providers/DashboardRuntime.tsx` | `usePendingSynchronization()` como **paso 7**, después de `useBackgroundRefresh`; actualiza el comentario de R-1 |
| `tests/dashboard-state.test.ts`, `tests/result-messages.test.ts` | Pruebas nuevas |

## Pasos

1. Store y setters. `installOriginal`: `setBusy("install-original")`, `clearFeedback`, progreso al store, al
   terminar `replaceDashboard(result.dashboard)`, `pending-sync/added`, aviso o error con
   `summarizeOriginalInstall`, `original-install/finished` y `setBusy(null)` en `finally`. Error →
   `setError(friendlyError(reason))`. No pasa por `runHandoff` (no hay salida de la ventana).
2. `originalInstallAvailability`: visible solo con `platform === "macos"`, `sourcePath`, `sourceUpdate` fresco
   (`!stale`, `checkedAt`, `source`) y `status === "available"` con `latestVersion`. `disabledReason`:
   `originalStatus === "running"` → «Cierra {app} para actualizarla.»; `busy !== null` → deshabilitado sin texto.
3. Banner y `OriginalDetail` según A-10: principal «Descargar e instalar» (llama directo, sin diálogo), secundario
   «Abrir {app}» en `outline` que abre el diálogo de handoff actual. El motivo de bloqueo se **ve** (texto), no
   solo en `title`. Fuera de macOS y en los demás tipos, todo igual que hoy.
4. `OriginalInstallPanel`: visible con `originalInstall !== null`; `Progress` con `receivedBytes/totalBytes` en
   `downloading` e indeterminado en las otras fases; «Cancelar» solo si `cancellable`.
5. `usePendingSynchronization` (A-6): sin `addEventListener`; dependencias del store; un ref de vuelo; quita
   `ready` pase lo que pase y `drop` siempre. Aviso «Sincronización pendiente: …» con `summarizeSynchronization`.
6. `SynchronizeBanner` nombra las pendientes («se sincronizará al detenerla»); `InstanceDetail` muestra el `Badge`.

Catálogo: `Button`, `Badge`, `Progress`, `Spinner`, `NoticeAlert`; iconos `lucide-react` (`DownloadIcon`).
Sin `Toaster`, sin diálogos nuevos, sin `listen`.

## Variables de entorno nuevas

Ninguna en el frontend.

## Pruebas

`tests/dashboard-state.test.ts`: las cuatro acciones (y que devuelven el mismo `store` si nada cambia).
`tests/result-messages.test.ts`: `originalInstallAvailability` (macOS/Windows/Linux, stale, current, en marcha,
busy), `installPhaseLabel` por fase y bytes, `summarizeOriginalInstall` (instalada con y sin pendientes, con
fallos de sincronización, cancelada), `pendingSyncPlan` (detenida y por detrás → ready; borrada o al día →
drop; en marcha → nada). `test:ui` debe seguir verde (R-1). Imports relativos con `.ts`, solo `import type` en
módulos probados. A mano: `pnpm dev` con el mock, en oscuro y claro, 980×680.

## Si dudas

`graphify explain "SourceUpdateBanner"`, `graphify explain "DashboardRuntime"`,
`docs/arquitectura/frontend.md` § Estado y § Dónde va cada cosa, la revisión de HU-0015 (R-1).
Skills `code-ai-profiles-frontend-react-vite` y `code-ai-profiles-ui`.

## No toques

`src/types.ts`, `src/lib/bridge.ts`, `src-tauri/**`, `source-update-controller.ts` y el orden de los pasos 1..6
de `DashboardRuntime`, `OriginalApplicationUpdateDialog` (el handoff sigue igual), `components/ui/*`.
