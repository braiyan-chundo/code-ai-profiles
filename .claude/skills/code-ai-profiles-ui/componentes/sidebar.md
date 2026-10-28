# Barra lateral (`sidebar`)

## Para qué

Navegación lateral que se contrae a iconos.

## Cuándo sí / cuándo no

**Sí**
- Navegación lateral que se contrae a iconos.

**No**
- La ventana actual no tiene barra lateral: `Titlebar` y `Toolbar` son propios. **Requiere un contenedor con `transform`** si no ocupa toda la ventana.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

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

`SidebarTrigger` con `aria-label` en español. Atajo de teclado propio para alternar. En ventanas estrechas usa `use-mobile` (768 px) y se vuelve un `Sheet`.

## Tokens que usa

- `--background`, `--sidebar-[a-z-]+`, `--sidebar`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No adoptarlo sin decidir qué hace con la persistencia: `sidebar.tsx` escribe la cookie `sidebar_state` (7 días, `path=/`) y registra el atajo global Cmd/Ctrl+B en `window`. En el showcase es inocuo; en la app la cookie quedaría en los datos del webview, así que la historia que lo adopte la quita o la justifica.
- No ponerlo sin contenedor con `transform` dentro de un marco: su `position: fixed` se sale.
- No regenerar con `pnpm exec shadcn add sidebar --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#sidebar` (con `pnpm dev`).
