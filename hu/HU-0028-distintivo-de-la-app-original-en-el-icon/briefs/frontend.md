# Brief · HU-0028 · frontend

Criterios: AC-02, AC-04 y AC-05 (interfaz). Modelo: **sonnet** (interfaz sobre un contrato cerrado).
Contrato: `arquitectura.md` § A-1 y A-6. Empiezas cuando backend haya commiteado `types.ts` y `bridge.ts`:
`SystemInfo.providerBadge: ProviderBadge | null`, `ProviderBadge { path: string }`. En los mocks llega un `data:` neutro.

## Archivos

| Archivo | Qué cambia |
| --- | --- |
| `src/features/instances/avatar-badge.ts` (nuevo) | `showsProviderBadge(iconSrc, badgeSrc, failedSrc): boolean`, puro, sin Tauri |
| `src/features/instances/instance-icon.ts` | `providerBadgeSource(system: SystemInfo): string \| null` (`localFileSource(path)`, sin revisión) |
| `src/features/instances/index.ts` | Exporta `providerBadgeSource` |
| `src/features/instances/InstanceAvatar.tsx` | Props `badgeSrc?: string \| null` y `badgeClassName?: string`; distintivo y punto arriba |
| `src/features/instances/InstanceDetail.tsx` | Prop `badgeSrc: string \| null`; la pasa al avatar de 64 |
| `src/app/routes/instance/InstanceRoute.tsx` | `badgeSrc={providerBadgeSource(state.system)}` |
| `src/app/routes/dashboard/UsageRanking.tsx` | El avatar de 32 recibe `badgeSrc` (calculado una vez, fuera del `map`) |
| `src/features/instances/InstanceEditor.tsx` | Prop `badgeSrc?: string \| null`; distintivo en la vista previa de 72 |
| `src/app/layout/DialogHost.tsx` | `badgeSrc={providerBadgeSource(state.system)}` al `InstanceEditor` |
| `tests/dashboard-state.test.ts` | Casos de `showsProviderBadge` |

## Pasos (medidas de la maqueta aprobada, en clases del sistema)

1. **`showsProviderBadge`** = `Boolean(iconSrc && badgeSrc) && failedSrc !== badgeSrc`.
2. **`InstanceAvatar`:** estado `failedBadge` (`string | null`); `badged = showsProviderBadge(iconSrc, badgeSrc ??
   null, failedBadge)`. La raíz añade `group/avatar` y `data-badged={badged || undefined}`. Tras la imagen, si
   `badged`: `<img src={badgeSrc} alt="" draggable={false} onError={() => setFailedBadge(badgeSrc)}
   className={cn("pointer-events-none absolute -right-0.5 -bottom-0.5 size-[36%] [filter:drop-shadow(0_0_1.5px_var(--surface))_drop-shadow(0_0_1px_var(--surface))]", badgeClassName)} />`
   (36 % del lado, D-3; halo de la superficie como en la maqueta). El punto, después del distintivo, añade
   `group-data-badged/avatar:bottom-auto group-data-badged/avatar:-top-0.5` (D-4); sin distintivo, igual que hoy.
3. **`InstanceDetail` (64):** `badgeSrc={badgeSrc}`, `badgeClassName="-right-1 -bottom-1"` y
   `dotClassName="-right-1 -bottom-1 size-3.5 group-data-badged/avatar:-top-1"`. Comprueba en el DOM que la variante
   gana a `-bottom-1` (si `cn` las funde mal, ajusta el orden; no metas CSS nuevo).
4. **`UsageRanking` (32):** solo `badgeSrc`; las posiciones por defecto (sobresale 2 px) valen.
5. **No pasan `badgeSrc`:** `AppSidebar` y `ApplicationUpdateDialog` (16 px, D-5), `OriginalDetail` (`iconSrc={null}`).
6. **`InstanceEditor`:** envuelve la vista previa en `<span className="relative size-18">` con el `span` de hoy dentro
   (conserva `overflow-hidden`) y, como hermano, el distintivo `absolute -right-1 -bottom-1 size-[36%]` con el mismo
   halo y `onError`, **solo si se ve una imagen** (`iconPreviewUrl || (!removeIcon && currentIconUrl)`). «Quitar»
   deja la marca sin distintivo (AC-04); elegir otra imagen lo conserva.
7. Sin distintivo (`providerBadge: null` o `onError`): todo como hoy, sin aviso ni error (AC-05).

## Variables de entorno nuevas

Ninguna.

## Pruebas

`test:dashboard`: `showsProviderBadge` (sin icono propio → no; sin distintivo → no; fallido el mismo → no; fallido
otro → sí; los dos → sí). Relacionadas: `node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`,
más `pnpm build` y `pnpm test:ui` (prueba 15: nada de medidas en px fuera de la retícula; `size-[36%]` y las
posiciones no cuentan como espaciado). Con `pnpm dev` (mocks): elige una imagen para una instancia y mira la página
(64), «Uso por instancia» (32), el editor (72, con «Quitar»), el sidebar sin cambios, la original sin distintivo,
temas claro y oscuro y `providerBadge: null` a mano en el mock (se ve como hoy). Compara con la maqueta.

## Si dudas

`graphify explain "InstanceAvatar"`, `node .metodo/scripts/grafo.mjs impacto "managedIconSource"`; `InstanceDetail.tsx`
(el avatar de 64) y `InstanceEditor.tsx` líneas 125-145 (la vista previa). Skills abajo.

## No toques

`src/types.ts`, `src/lib/bridge.ts`, `src/features/dashboard/dashboard-store.ts`, `src-tauri/**` (backend).
`AppSidebar`, `ApplicationUpdateDialog` y `OriginalDetail` salvo que no compilen. `features/instances` no importa
`features/dashboard` ni `features/projects`. Ningún `.css`, color ni medida fuera de los tokens; ningún toast.

## Skills

`code-ai-profiles-frontend-react-vite`, `code-ai-profiles-ui`, `code-ai-profiles-pruebas`.
