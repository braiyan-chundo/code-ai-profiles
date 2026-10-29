# Barra lateral (`sidebar`)

## Para qué

Navegación lateral que se contrae a iconos.

## Cuándo sí / cuándo no

**Sí**
- Navegación lateral que se contrae a iconos.
- En la app (HU-0016): `AppShell` y `AppSidebar` (HU-0016): `collapsible="icon"`, 260 px, controlado por la preferencia `sidebar`. El marco lleva `transform`.

**No**
- Un segundo sidebar: la app tiene uno, en `AppShell`. **Requiere un contenedor con `transform`** si no ocupa toda la ventana.

## Importación

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { HomeIcon } from "lucide-react"

export function Ejemplo() {
  return (
    <SidebarProvider className="min-h-0">
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive>
                  <HomeIcon />
                  <span>Inicio</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger aria-label="Alternar barra lateral" />
      </SidebarInset>
    </SidebarProvider>
  )
}
```

## Variantes y tamaños

`Sidebar`: `side`, `variant` (`sidebar`, `floating`, `inset`), `collapsible` (`offcanvas`, `icon`, `none`). `SidebarMenuButton`: `variant` (`default`, `outline`), `size` (`default`, `sm`, `lg`).

## Estados

`isActive`, `SidebarMenuSkeleton` para cargar, `SidebarMenuBadge`, contraído a iconos con `tooltip`.

## Accesibilidad

`SidebarTrigger` con `aria-label` en español. Sin atajo de teclado propio (ajuste 2). En ventanas estrechas usa `use-mobile` (768 px) y se vuelve un `Sheet`.

## Tokens que usa

- `--background`, `--sidebar-[a-z-]+`, `--sidebar`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

HU-0016 (A-4), sobre el código del registro `radix-vega` (2026-10-28):

1. **Sin cookie**: `setOpen` ya no escribe la cookie de estado (`sidebar_state`, 7 días, `path=/`). Quien lo
   use controla `open`/`onOpenChange`; la app guarda el estado en sus preferencias de apariencia (A-5).
2. **Sin atajo global**: fuera el `keydown` de Cmd/Ctrl+B en `window`, que chocaba con los atajos de la app.
3. **Textos en español**: «Alternar barra lateral» en `SidebarTrigger` (`sr-only`) y `SidebarRail` (`aria-label` y
   `title`), y «Barra lateral» / «Muestra la barra lateral.» en la cabecera `sr-only` del `Sheet` móvil.

HU-0019 (A-2 y A-3): 4. **Alturas con el tamaño del texto**: `SidebarInput` y `SidebarMenuButton` (tamaño `default`)
pasan de `h-8` a `h-(--ctl-sm)`, y `SidebarMenuBadge`, de `h-5 min-w-5` a `h-(--ctl-badge) min-w-(--ctl-badge)`. El
plegado a iconos sigue en `size-8!`: el panel de 50 px no crece con el texto.

La app lo usa con `variant="floating"` (panel de 240 px con 8 px de margen; plegado, 50 px y una columna de 64), con
`--sidebar` = `--surface-raised` en el marco y el anillo `*:data-[slot=sidebar-inner]:ring-foreground/10`. El contenedor
`fixed` empieza bajo la barra (`top-(--titlebar-height)! h-auto!`). Los contadores usan `SidebarMenuBadge` con
`top-1/2! -translate-y-1/2` y la raya entre grupos plegado, `SidebarSeparator`.

`pnpm test:ui` (prueba 7) vigila que no vuelvan la cookie ni el `keydown`.

## Qué no hacer

- No devolverle la cookie ni el atajo global (ajustes 1 y 2): la persistencia va controlada desde fuera.
- No ponerlo sin contenedor con `transform` dentro de un marco: su `position: fixed` se sale.
- No regenerar con `pnpm exec shadcn add sidebar --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#sidebar` (con `pnpm dev`).
