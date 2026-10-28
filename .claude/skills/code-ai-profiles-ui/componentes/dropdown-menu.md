# Menú desplegable (`dropdown-menu`)

## Para qué

Lista de acciones que se abre desde un botón.

## Cuándo sí / cuándo no

**Sí**
- Una lista de acciones desde un botón.

**No**
- Elegir un valor de formulario: `Select`. Una barra de menús: `Menubar`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Acciones</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Abrir</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Eliminar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## Variantes y tamaños

`DropdownMenuItem` `variant`: `default`, `destructive`. También: casillas, radios, submenús, `DropdownMenuLabel`, `DropdownMenuShortcut`.

## Estados

`disabled` en un item; casillas y radios con estado.

## Accesibilidad

Radix: flechas, Enter, Escape y búsqueda por letra. El trigger de solo icono lleva `aria-label`.

## Tokens que usa

- `--accent-foreground`, `--accent`, `--border`, `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No esconder acciones críticas solo aquí.
- No regenerar con `pnpm exec shadcn add dropdown-menu --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#dropdown-menu` (con `pnpm dev`).
