# Casilla (`checkbox`)

## Para qué

Marca o desmarca una opción, con estado indeterminado.

## Cuándo sí / cuándo no

**Sí**
- Marcar una o varias opciones independientes.
- En la app (HU-0016): «Incluir copias locales de artefactos» en `SessionTransferDialog`.

**No**
- Para activar un ajuste al instante: `Switch`. Para una sola opción entre varias: `RadioGroup`.

## Importación

```tsx
import { Checkbox } from "@/components/ui/checkbox"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export function Ejemplo() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="recordar" defaultChecked />
      <Label htmlFor="recordar">Recordar la elección</Label>
    </div>
  )
}
```

## Variantes y tamaños

Sin variantes. `checked` admite `true`, `false` o `"indeterminate"`.

## Estados

`disabled`, `aria-invalid`, indeterminado.

## Accesibilidad

Siempre con `Label` o `aria-label`.

## Tokens que usa

- `--destructive`, `--input`, `--primary-bright` (`bg-primary`), `--ring`, `--ui-on-primary`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar el indeterminado sin un grupo que lo explique.
- No regenerar con `pnpm exec shadcn add checkbox --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#checkbox` (con `pnpm dev`).
