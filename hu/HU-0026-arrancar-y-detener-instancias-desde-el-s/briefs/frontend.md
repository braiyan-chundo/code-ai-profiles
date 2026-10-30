# Brief · HU-0026 · frontend

Criterios: AC-02, AC-03, AC-04, AC-05. Modelo: **opus**, porque introduce un estado intermedio («abriendo») sobre el
`busy` compartido y cambia la estructura de clic de dos listas (`riesgo: estados`).
Contrato: sin cambios de IPC. `arquitectura.md` § A-1 a A-4. No hay brief de backend: no hace falta.
Empieza con la maqueta aprobada.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/features/instances/instance-status.ts` | `InstancePending`, `instancePending`, `instanceStatusLabel(status, pending)`, `instanceToggle` (A-1), solo `import type` |
| `src/features/instances/InstanceStatusBadge.tsx` | `stopping` → `pending`; `data-status="launching"` con el mismo tono que `stopping` y «Abriendo…» |
| `src/features/instances/InstanceAvatar.tsx` | `stopping` → `pending`; punto que late también en `launching` |
| `src/features/instances/InstanceDetail.tsx` | `instancePending(busy, id)` para insignia y avatar; los botones, igual |
| `src/features/instances/InstanceToggleButton.tsx` (nuevo) | Botón del dashboard (A-4) a partir de `instanceToggle` |
| `src/features/instances/useInstanceActions.ts` | Guarda con `busyRef`; `errorTitle` con el nombre (A-2) |
| `src/features/instances/index.ts` | Exporta `InstanceToggleButton`, `instanceToggle`, `instancePending` y el tipo |
| `src/features/dashboard/dashboard-store.ts` | `errorTitle`, `title` opcional en `error/changed`, limpieza en `feedback/cleared` |
| `src/features/dashboard/DashboardProvider.tsx` | `runAction(key, action, options?)`; `setError(message, title?)` |
| `src/features/dashboard/dashboard-context.ts` | Tipos de lo anterior |
| `src/features/dashboard/FeedbackBanners.tsx` | Título y cuerpo si hay `errorTitle` |
| `src/components/ui/sidebar.tsx` | `SidebarMenuAction`: 24 px (`size-(--ctl-badge)`), centrado vertical, `rounded-sm`, iconos 16 |
| `.claude/skills/code-ai-profiles-ui/componentes/sidebar.md` | «Diferencias con el registro», punto 5 (HU-0026) |
| `src/app/layout/sidebar-parts.tsx` | `MenuCount` con prop para ocultarse en hover/foco de la fila y con `pending` |
| `src/app/layout/AppSidebar.tsx` | Botón por instancia (A-3), `pending` en avatar, `sr-only` y tooltip |
| `src/app/routes/dashboard/UsageRanking.tsx` | Fila sin `<a>` envolvente, enlace que cubre la fila, botón `z-10`, anchos (A-4) |
| `tests/dashboard-state.test.ts` | Casos nuevos |

## Pasos

1. A-1 con sus pruebas; adapta los tres consumidores de `stopping`.
2. A-2: store, provider, banners y hook. Los `setError(mensaje)` actuales no cambian.
3. A-3: ajusta `SidebarMenuAction` y su ficha; el botón va **fuera** del `Link`, hermano dentro del
   `SidebarMenuItem` (`group/menu-item`). `showOnHover` y, con `pending`, `opacity-100`. `PlayIcon`, `SquareIcon`,
   `Spinner` (`aria-hidden`). `aria-label` = `toggle.label`, `aria-busy`, `disabled`. Plegado: el catálogo lo oculta.
4. A-4: `Item` `relative` sin `asChild`; `Link` en el título con `after:absolute after:inset-0` y foco en la fila con
   `has-[a:focus-visible]:ring-2 ring-ring`; `InstanceToggleButton` `relative z-10`. Detener: `border-primary/30
   bg-primary/10 text-primary-text hover:bg-primary/15` (el de `InstanceDetail`). ≤ 1070 px: `icon-sm` + `Tooltip`,
   corte en CSS (`max-[1070px]:`), sin listener de `resize`. `missing` → hueco del mismo ancho.
5. Revisa con la app abierta (`pnpm dev`; el mock de `bridge.ts` ya simula `launch`/`stop`).

## Variables de entorno nuevas

Ninguna.

## Pruebas

En `tests/dashboard-state.test.ts`, las de `arquitectura.md` § Pruebas (importa `instance-status.ts` y
`dashboard-store.ts` directos).

```bash
pnpm build && pnpm test:dashboard && pnpm test:ui
node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles src/features/instances src/features/dashboard src/app/layout/AppSidebar.tsx src/app/routes/dashboard/UsageRanking.tsx src/components/ui/sidebar.tsx
```

A mano y en la entrega: hover y Tab en el sidebar (el contador cede su sitio, la fila no se mueve), plegado sin botón,
dashboard a 1440×920 y 980×680, claro y oscuro, «Abriendo…»/«Deteniendo…» con los demás botones desactivados, error
con «No se pudo abrir {nombre}», y que el clic en la fila sigue navegando y el del botón no.

## Si dudas

`node .metodo/scripts/grafo.mjs impacto "instanceStatusLabel"`, `graphify explain "UsageRanking"`, la maqueta
(`diseno/maqueta.html#escena=abriendo&tema=oscuro&ancho=1440&sb=abierto`), las fichas `sidebar.md`, `item.md`,
`button.md` y `tooltip.md` de la skill `code-ai-profiles-ui`.

## No toques

`src-tauri/**`, `src/types.ts`, `src/lib/bridge.ts`, la Claude original (`OriginalDetail`, su entrada del sidebar),
`ProjectsSidebarGroup`, el flujo de `usePendingSynchronization`, y el texto de los errores de Rust.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas`.
