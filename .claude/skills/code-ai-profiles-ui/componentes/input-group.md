# Grupo de entrada (`input-group`)

## Para qué

Campo con complementos al inicio, al final o en bloque.

## Cuándo sí / cuándo no

**Sí**
- Un campo con un icono, un texto fijo o un botón pegado (buscar, copiar, unidades).

**No**
- Un campo simple: `Input`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { SearchIcon } from "lucide-react"

export function Ejemplo() {
  return (
    <InputGroup>
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Buscar" aria-label="Buscar" />
    </InputGroup>
  )
}
```

## Variantes y tamaños

`InputGroupAddon` `align`: `inline-start`, `inline-end`, `block-start`, `block-end`. `InputGroupButton` `size`: `xs`, `sm`, `icon-xs`, `icon-sm`. `InputGroupText`, `InputGroupInput`, `InputGroupTextarea`.

## Estados

`disabled` con `data-disabled="true"` en el grupo; `aria-invalid` en el input.

## Accesibilidad

El input lleva etiqueta; un botón de solo icono, `aria-label`.

## Tokens que usa

- `--destructive`, `--input`, `--muted` (`text-muted-foreground`), `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No meter un `Input` suelto dentro del grupo: usa `InputGroupInput`.
- No regenerar con `pnpm exec shadcn add input-group --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#input-group` (con `pnpm dev`).
