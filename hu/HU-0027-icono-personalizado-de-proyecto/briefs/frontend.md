# Brief · HU-0027 · frontend

Criterios: AC-01, AC-02, AC-03, AC-05 (interfaz). Modelo: **sonnet** (interfaz sobre un contrato cerrado).
Contrato: `arquitectura.md` § A-1 y A-6. Empiezas cuando backend haya commiteado `types.ts` y `bridge.ts`:
`ProjectSummary.icon: ProjectIcon | null`, `ProjectIcon { path: string; revision: number }`,
`bridge.setProjectIcon(id, bytes: Uint8Array): Promise<ProjectSummary>`, `bridge.clearProjectIcon(id): Promise<ProjectSummary>`.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/lib/icon-validation.ts` | `git mv` desde `src/features/instances/icon-validation.ts`, sin cambios |
| `src/lib/local-asset.ts` (nuevo) | `localFileSource(path, revision?)`: fuera de escritorio devuelve `path`; dentro, `convertFileSrc(path)` + `?v=${revision}` si hay revisión |
| `src/features/instances/instance-icon.ts`, `InstanceEditor.tsx` | Usan `../../lib/local-asset` (sin revisión: igual que hoy) y `../../lib/icon-validation` |
| `src/features/projects/projects-selectors.ts` | `visibleIcon(project): ProjectIcon \| null` = `isReadable(project) ? project.icon : null` (D-3) |
| `src/features/projects/project-icon.ts` (nuevo) | `projectIconSource(project)` = `visibleIcon` → `localFileSource(icon.path, icon.revision)` |
| `src/features/projects/ProjectInitial.tsx` | `iconSrc?: string \| null`, talla `dialog`, imagen con aro y `onError` |
| `src/features/projects/ProjectHero.tsx`, `ProjectPage.tsx` | Avatar-botón con velo, lápiz y tooltip; prop `onOpenIcon` |
| `src/features/projects/ProjectIconDialog.tsx` (nuevo) | El diálogo «Icono del proyecto» |
| `src/features/projects/{projects-context.ts,ProjectsProvider.tsx}` | `setIcon(id, bytes)` y `clearIcon(id)`: `Promise<string \| null>` (el error o `null`); con éxito, `dispatch({ type: "project/loaded", project })` |
| `src/features/projects/index.ts` | `ProjectIconDialog` con `lazy` (como `IncompleteDataDialog`) y `projectIconSource` |
| `src/features/projects/ProjectCard.tsx`, `src/app/layout/ProjectsSidebarGroup.tsx` | `iconSrc={projectIconSource(project)}` |
| `src/app/providers/dialogs-context.ts`, `src/app/layout/DialogHost.tsx` | `{ kind: "icon"; projectId: string }`; válido con `readableProject`; monta el diálogo |
| `src/app/routes/project/ProjectRoute.tsx` | `onOpenIcon={() => setProjectDialog({ kind: "icon", projectId: project.id })}` |
| `tests/projects.test.ts`, `tests/result-messages.test.ts` | Casos nuevos; ruta nueva de `icon-validation.ts` |

## Pasos (clases literales de la maqueta)

1. **`ProjectInitial`:** `SIZES.dialog = "size-18 rounded-lg text-(length:--fs-dialog)/(--lh-dialog)"`. Estado
   `failedSrc`; hay imagen si `iconSrc && !broken && failedSrc !== iconSrc` (`broken` gana, D-3). Con imagen, la `<b>`
   añade `relative overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit]
   after:ring-1 after:ring-(--line-strong) after:ring-inset` y pinta `<img src={iconSrc} alt="" draggable={false}
   onError={() => setFailedSrc(iconSrc)} className="size-full object-cover" />` en lugar de la inicial.
2. **`ProjectHero`:** el avatar es `Tooltip` › `TooltipTrigger asChild` › `<button type="button" aria-label="Cambiar
   icono del proyecto" onClick={onOpenIcon} className="group/avatar relative size-16 cursor-pointer rounded-lg
   outline-none focus-visible:ring-2 focus-visible:ring-ring">` con `ProjectInitial size="xl" iconSrc` y el velo
   `<span aria-hidden="true" className="absolute inset-0 grid place-items-center rounded-[inherit] bg-(--surface)/70
   text-foreground opacity-0 transition-opacity group-hover/avatar:opacity-100 group-focus-visible/avatar:opacity-100
   motion-reduce:transition-none"><PencilIcon className="size-6" /></span>`; `TooltipContent side="bottom"` «Cambiar
   icono». Sin pista en reposo. `ProjectBrokenPage` no cambia (D-4).
3. **`ProjectIconDialog`** (`project: ReadableProject`, `onClose`): `Dialog open` + `DialogContent` por defecto
   (576), `aria-busy={saving}`, `closeDisabled={saving}`, `onOpenChange` guardado por `saving`. `DialogTitle` «Icono del
   proyecto», `DialogDescription` = `projectName(project)`. Sección como en `InstanceEditor` sin el `<strong>`:
   `grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-sm ring-1 ring-border ring-inset bg-(--surface-soft)
   p-4`; vista previa `ProjectInitial size="dialog" iconSrc={previewUrl ?? (remove ? null : current)}`; texto
   `text-(length:--fs-small)/(--lh-small) text-muted-foreground` «Se guarda en los datos de Code AI Profiles; el proyecto
   no se modifica.»; botones `mt-1 flex flex-wrap gap-2`: el `Button asChild variant="outline" size="sm"` con `<label>` e
   `<input type="file" accept="image/png,image/jpeg" className="sr-only">` (copia sus clases), `ImageUpIcon`,
   «Seleccionar imagen» / «Reemplazar imagen»; «Quitar» `variant="destructive" size="sm"` si hay vista previa o icono y
   no se ha quitado. Error: `FieldError className="text-(length:--fs-small)/(--lh-small)"` con `iconFileError`,
   `iconDimensionsError`, «No se pudo decodificar la imagen seleccionada.» o el error de Rust. `DialogFooter`:
   «Cancelar» `outline lg`; «Guardar» `size="lg" className="min-w-36"`, desactivado si `!dirty || saving` (`dirty` =
   bytes elegidos, o «Quitar» con icono guardado); al guardar, `Spinner` + «Guardando…». Con éxito, `onClose()`.
4. Contexto, `DialogHost` y la ruta (tabla). `projectDialogValid` acepta `kind === "icon"` con `readableProject`.

## Variables de entorno nuevas

Ninguna.

## Pruebas

`test:projects`: `visibleIcon` (legible con icono → icono; roto con icono → `null`; sin icono → `null`) y
`project/loaded` que pone y quita `icon`. `test:messages` con la ruta nueva. Relacionadas:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`, más `pnpm build` y `pnpm test:ui`. Con
`pnpm dev`: las 9 escenas de la maqueta, temas claro y oscuro, 980 px, sidebar plegado y el diálogo con `saving`.

## Si dudas

`graphify explain "ProjectInitial"`, `node .metodo/scripts/grafo.mjs impacto "ProjectDialogState"`; `InstanceEditor.tsx`
(selección y vista previa) y `DialogHost.tsx` (montaje de los diálogos de proyecto). Skills abajo.

## No toques

`src/types.ts`, `src/lib/bridge.ts`, `src-tauri/**` (backend). `ProjectBrokenPage`, `BrokenProjectCard` y
`PinProjectDialog` (sin icono). `features/projects` no importa `features/instances` (prueba 17). Ningún `.css`, color
ni medida fuera de los tokens; ningún toast.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas`.
