# Arquitectura · HU-0026 · Arrancar y detener instancias desde el sidebar y el dashboard

## Análisis

Confianza: **alta**. Todo lo que hace falta ya existe: `launch_instance` y `stop_instance` (Rust, con la verificación
de identidad al detener y el aviso de macOS al abrir), `useInstanceActions().launch/stop`, `runAction` y el `busy`
único del store. **No hace falta backend**: ni comandos nuevos ni cambios en `types.ts` o `bridge.ts`. Es una
historia solo de frontend.

Leído: `hu.md`, `diseno/vista.md`, la maqueta (escenas), `src/features/instances/{useInstanceActions,instance-status,
InstanceStatusBadge,InstanceAvatar,InstanceDetail,index}.ts(x)`, `src/app/layout/{AppSidebar,sidebar-parts}.tsx`,
`src/components/ui/sidebar.tsx` (`SidebarMenuAction`, `SidebarMenuBadge`, `group/menu-item`),
`src/app/routes/dashboard/{UsageRanking,DashboardRoute}.tsx`, `src/features/dashboard/{dashboard-store.ts,
DashboardProvider.tsx,FeedbackBanners.tsx}`, `src/app/routes/instance/InstanceRoute.tsx`,
`src-tauri/src/commands.rs` (`launch_instance`, `stop_instance`), la ficha `componentes/sidebar.md`, `tests/` y
`graphify query` del área. Impacto: `instanceStatusLabel` (18 nodos), `InstanceStatusBadge` (17), `SidebarMenuAction`
(nadie lo usa todavía).

Hechos que deciden el diseño:

- El estado «en curso» se deduce de `busy`: `launch:<id>` y `stop:<id>`. Hoy `InstanceStatusBadge`, `InstanceAvatar`
  e `instanceStatusLabel` solo conocen «deteniendo» (prop `stopping`). `InstanceDetail` ya pinta «Abriendo…» en su
  botón con `busy?.endsWith(id)`, pero no en la insignia.
- La fila de `UsageRanking` es un `<a>` (`Item asChild` + `Link`): un botón dentro sería HTML inválido y robaría el
  clic.
- `SidebarMenuAction` mide 20 px, se coloca con `top-1.5` y lo oculta el catálogo con el sidebar plegado. Nadie lo usa:
  ajustarlo en el componente no afecta a nada más.
- El error de `runAction` es un solo texto (`error: string`) pintado como título de `NoticeAlert`. No lleva el nombre
  de la instancia.
- Un doble clic rápido podría disparar dos operaciones antes de que el `disabled` llegue al DOM: hay que mirar
  `busyRef`.

### Supuestos (decisiones de `vista.md` pendientes; se asume la recomendada)

- **S-1** Sidebar: el botón sustituye al contador al pasar el ratón o con foco (D-2); plegado, sin botón.
- **S-2** Dashboard: botón siempre visible; icono y etiqueta por encima de 1070 px, solo icono por debajo, con tooltip.
- **S-3** «Abrir» `outline`; «Detener» en el tono naranja suave de la página de la instancia.
- **S-4** Mientras corre una operación, **todos** los botones se desactivan (`busy` único). Nada de `busy` por instancia.
- **S-5** Error en el área de avisos (D-3): título «No se pudo abrir {nombre}» / «No se pudo detener {nombre}» y el
  mensaje de Rust debajo. Se aplica también al botón de la página de la instancia (mismo hook): es coherente y no
  cambia su comportamiento.
- **S-6** Sin confirmación al detener (D-1).
- **S-7** Una instancia «No disponible» no tiene botón; en el dashboard deja un hueco del mismo ancho para que las barras
  sigan alineadas.

### Preguntas

Ninguna bloquea. Las decisiones 1-6 de `vista.md` las aprueba el mantenedor con la maqueta (AC-01); si cambia alguna,
el brief cambia solo en la presentación.

### Impacto

| Símbolo | Consumidores | Qué se rompe |
| --- | --- | --- |
| `instanceStatusLabel(status, stopping)` → `(status, pending)` | `AppSidebar`, `InstanceStatusBadge` | Firma; se adaptan las dos llamadas |
| `InstanceStatusBadge`/`InstanceAvatar` prop `stopping` → `pending` | `AppSidebar`, `UsageRanking`, `InstanceDetail` (`OriginalDetail` y `ApplicationUpdateDialog` no la pasan) | Nada fuera de esos tres |
| `SidebarMenuAction` (tamaño y posición) | Ninguno | Su ficha |
| `DashboardStore` (+`errorTitle`) y `runAction` (+opciones) | `DashboardProvider`, `FeedbackBanners`, `tests/dashboard-state.test.ts` | Aditivo; las llamadas actuales no cambian |
| `UsageRanking` (fila ya no es `<a>`) | `DashboardRoute` | Navegación igual por el enlace que cubre la fila |

- **Contrato IPC:** no cambia. **Datos guardados y migración:** ninguno. **Permisos y red:** ninguno.
- **Plataformas:** las tres usan los mismos comandos; lo propio de cada una (aviso de macOS al abrir, señales y
  verificación de identidad al detener) está en Rust y no se toca. El ancho del sidebar y el hover son iguales en las
  tres; en Linux sin ratón el foco de teclado muestra el botón.
- **Privacidad:** solo se usan nombre y estado, que ya se ven.
- **Riesgosa: sí** (`estados`: un estado intermedio nuevo y el `busy` compartido). Revisión técnica obligatoria.

## Solución

### A-1 · Estado intermedio (`features/instances/instance-status.ts`, puro)

```ts
export type InstancePending = "launching" | "stopping";
export function instancePending(busy: string | null, id: string): InstancePending | null; // launch:<id> | stop:<id>
export function instanceStatusLabel(status: InstanceStatus, pending?: InstancePending | null): string;
// "Abriendo…" | "Deteniendo…" | "Ejecutándose" | "Detenido" | "No disponible"
export interface InstanceToggle { action: "launch" | "stop"; label: string; pending: boolean; disabled: boolean }
export function instanceToggle(instance: { name: string; status: InstanceStatus; id: string }, busy: string | null): InstanceToggle | null;
```

`instanceToggle`: `missing` → `null`; `running` → `stop`; `stopped` → `launch`; `pending` si `busy` es el de esta
instancia (también `launch` mientras sigue `stopped`, y al revés); `disabled = busy !== null`; `label` = «Abrir
{nombre}», «Detener {nombre}», «Abriendo {nombre}…», «Deteniendo {nombre}…» (AC-05). El módulo solo usa `import type`.

`InstanceStatusBadge` e `InstanceAvatar` cambian `stopping?: boolean` por `pending?: InstancePending | null`, con
`data-status="launching"` (punto que late, insignia «Abriendo…») además de `stopping`. `InstanceDetail` usa
`instancePending` para la insignia y el avatar.

### A-2 · Acciones y error con nombre

- `runAction(key, action, options?: { errorTitle?: string })`. El store gana `errorTitle: string | null`;
  `error/changed` lleva un `title` opcional; `setError(null)` y `feedback/cleared` limpian los dos.
  `FeedbackBanners`: con `errorTitle`, `title={errorTitle}` y el mensaje como cuerpo; sin él, como hoy.
- `useInstanceActions().launch/stop`: si `busyRef.current !== null`, no hacen nada (doble clic). Pasan
  `errorTitle` «No se pudo abrir {nombre}» / «No se pudo detener {nombre}».

### A-3 · Sidebar

- `SidebarMenuAction` (catálogo): `size-(--ctl-badge)`, `top-1/2 -translate-y-1/2`, `rounded-sm`, iconos de 16; quita
  los `top-*` por tamaño. Diferencia 5 en `componentes/sidebar.md`.
- En cada instancia no `missing`: `SidebarMenuAction showOnHover` hermano del `Link` (fuera de él), `aria-label` =
  `label`, `aria-busy` si `pending`, `disabled`, icono `PlayIcon`/`SquareIcon` o `Spinner`. Con `pending`, visible sin
  hover. La fila lleva `pr-8` si hay botón o contador.
- `MenuCount`: prop para ocultarse con `group-hover/menu-item` y `group-focus-within/menu-item`, y siempre con
  `pending`. Tooltip plegado: «nombre · Abriendo…».

### A-4 · Dashboard (`UsageRanking`)

- La fila pasa a `Item` (sin `asChild`) `relative`; el `Link` envuelve el nombre y cubre la fila con
  `after:absolute after:inset-0`; el anillo de foco de la fila con `has-[a:focus-visible]`. El botón,
  `relative z-10`, al final.
- `InstanceToggleButton` (nuevo, `features/instances`): `Button size="sm"`, 104 px con icono y etiqueta («Abrir» /
  «Detener», que no cambia en curso: la insignia lo dice); ≤ 1070 px, `size="icon-sm"` con `aria-label` y `Tooltip`.
  `missing` → hueco del mismo ancho, `aria-hidden`.
- Barras de 34 % a 26 % (24 % ≤ 1070 px) y hueco de 8 a 12 px; se ajusta si algo no cabe.

### Variables de entorno nuevas

Ninguna.

### Señales

No hay observabilidad.

### Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El botón roba la navegación de la fila | Sidebar: hermano del `Link`. Dashboard: enlace que cubre la fila y botón `z-10` |
| Doble operación por doble clic | `busyRef` en `launch`/`stop` y `disabled` |
| Botón invisible pero pulsable (`opacity-0`) | Solo con ratón encima de la fila, que lo muestra; con teclado lo muestra el foco |
| Operación mientras otra corre (escaneo, sincronización) | `disabled = busy !== null`, el mismo criterio que «Nueva instancia» |
| La instancia cambia de estado por fuera (se cierra sola) | El botón se calcula del `DashboardState` del render; Rust revalida al ejecutar |

### Pruebas que no pueden faltar

`tests/dashboard-state.test.ts` (ya importa `features/instances` puros): `instancePending` (launch, stop, otra
instancia, `delete:`, `null`); `instanceStatusLabel` con los dos `pending`; `instanceToggle` (`missing` → `null`,
`running` → stop, `stopped` → launch, `busy` de otra → `disabled` sin `pending`, propio → `pending` y etiqueta
«Abriendo X…»); reducer: `error/changed` con título, `setError(null)` y `feedback/cleared` limpian `errorTitle`.
`pnpm build`, `pnpm test:dashboard`, `pnpm test:ui`. A mano: hover y foco en el sidebar, plegado, dashboard a 1440 y
980, claro y oscuro, error con nombre, y que la fila sigue navegando.

## Orden y paralelismo

Solo **frontend**, tras la aprobación de la maqueta. No comparte archivos con la HU-0025 (esa toca
`features/projects`, `types.ts`, `bridge.ts` y `DialogHost`/`dialogs-context`; esta, `features/instances`,
`features/dashboard`, `AppSidebar`, `sidebar-parts`, `sidebar.tsx` y `UsageRanking`), salvo **`AppSidebar.tsx`**: la
HU-0025 añade una bandera a `dialogOpen` (una línea, lejos de la lista de instancias). Comparten árbol de trabajo:
pueden ir en paralelo si cada uno añade solo sus archivos al commit (`git add <rutas>`) y los commits se hacen uno tras
otro; en `AppSidebar.tsx` gana quien llegue segundo, editando sobre lo ya escrito.
