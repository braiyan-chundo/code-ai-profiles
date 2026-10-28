# Menú de navegación (`navigation-menu`)

## Para qué

Enlaces de primer nivel con contenido desplegable.

## Cuándo sí / cuándo no

**Sí**
- Navegación de primer nivel con paneles desplegables.

**No**
- En una app de escritorio con barra propia, casi nunca: prefiere rutas y `Tabs`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function Ejemplo() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink href="#sesiones" className={navigationMenuTriggerStyle()}>
            Sesiones
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
```

## Variantes y tamaños

Enlace simple o `NavigationMenuTrigger` + `NavigationMenuContent`. `navigationMenuTriggerStyle()` da el estilo de enlace.

## Estados

`active` en el enlace actual.

## Accesibilidad

Radix gestiona el teclado; el `nav` necesita una etiqueta en español.

## Tokens que usa

- `--border`, `--foreground`, `--popover-foreground`, `--ring`, `--surface-soft` (`bg-muted`), `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usarlo como menú de acciones: eso es `DropdownMenu`.
- No regenerar con `pnpm exec shadcn add navigation-menu --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#navigation-menu` (con `pnpm dev`).
