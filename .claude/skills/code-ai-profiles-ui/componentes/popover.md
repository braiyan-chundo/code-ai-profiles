# Popover (`popover`)

## Para qué

Contenido flotante anclado a un botón.

## Cuándo sí / cuándo no

**Sí**
- Contenido flotante anclado a un botón: ajustes rápidos, detalles.

**No**
- Una lista de acciones: `DropdownMenu`. Solo texto de ayuda: `Tooltip`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Detalle</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Detalle</PopoverTitle>
          <PopoverDescription>Texto de apoyo.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}
```

## Variantes y tamaños

`PopoverContent` `align` (`start`, `center`, `end`) y `side`.

## Estados

Abierto o cerrado; se cierra con Escape o al pulsar fuera.

## Accesibilidad

El trigger lleva etiqueta; el foco entra en el contenido.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No poner contenido imprescindible solo aquí.
- No regenerar con `pnpm exec shadcn add popover --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#popover` (con `pnpm dev`).
