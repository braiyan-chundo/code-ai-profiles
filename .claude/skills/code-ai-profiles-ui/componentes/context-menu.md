# Menú contextual (`context-menu`)

## Para qué

Lista de acciones que se abre con el clic derecho.

## Cuándo sí / cuándo no

**Sí**
- Acciones sobre un elemento con el clic derecho.

**No**
- Como única vía para una acción: añade también un botón. Tampoco en táctil como acceso principal.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from "@/components/ui/context-menu"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu"

export function Ejemplo() {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="rounded-xl border border-dashed p-6">Clic derecho aquí</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Abrir</ContextMenuItem>
        <ContextMenuItem variant="destructive">Eliminar</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

## Variantes y tamaños

Como `DropdownMenu`: items, casillas, radios, submenús.

## Estados

`disabled` en un item.

## Accesibilidad

Radix lo abre también con la tecla de menú contextual.

## Tokens que usa

- `--accent-foreground`, `--accent`, `--border`, `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No quitar el menú nativo de una zona de texto editable.
- No regenerar con `pnpm exec shadcn add context-menu --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#context-menu` (con `pnpm dev`).
