# Pista (`tooltip`)

## Para qué

Texto breve que explica un control.

## Cuándo sí / cuándo no

**Sí**
- Explicar un control de solo icono o dar un atajo.
- En la app (HU-0016): un solo `TooltipProvider` en `AppShell`; los tooltips del sidebar plegado.

**No**
- Información imprescindible o textos largos: `Popover`. **Necesita `TooltipProvider`** arriba.

## Importación

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="outline" aria-label="Añadir">
            <PlusIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Añadir</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

## Variantes y tamaños

`TooltipContent` `side`: `top`, `right`, `bottom`, `left`.

## Estados

Sobre un botón `disabled` no se dispara: envuélvelo en un `span` con `tabIndex={0}`.

## Accesibilidad

No sustituye al `aria-label`: el botón de solo icono lo lleva igualmente.

## Tokens que usa

- `--background`, `--foreground`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste HU-0022 (A-1.1 y A-1.3): `gap-2 px-3 py-2` (antes `gap-1.5 py-1.5`), `rounded-sm` (8) y la flecha `rounded-xs`.

## Qué no hacer

- No olvidar el `TooltipProvider`: sin él lanza un error.
- No regenerar con `pnpm exec shadcn add tooltip --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#tooltip` (con `pnpm dev`).
