# Grupo de opciones (`radio-group`)

## Para qué

Elige una opción entre varias.

## Cuándo sí / cuándo no

**Sí**
- Elegir una opción entre pocas, todas visibles.

**No**
- Más de cinco opciones: `Select`. Opciones cortas y compactas: `ToggleGroup`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export function Ejemplo() {
  return (
    <RadioGroup defaultValue="uno" aria-label="Opciones">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="uno" id="op-uno" />
        <Label htmlFor="op-uno">Uno</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="dos" id="op-dos" />
        <Label htmlFor="op-dos">Dos</Label>
      </div>
    </RadioGroup>
  )
}
```

## Variantes y tamaños

Vertical por defecto; en horizontal, `className="flex gap-4"`.

## Estados

`disabled` en el grupo o en un item; `aria-invalid` en el item.

## Accesibilidad

`aria-label` en el grupo y una etiqueta por item.

## Tokens que usa

- `--destructive`, `--input`, `--primary-bright` (`bg-primary`), `--ring`, `--ui-on-primary`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usarlo con una sola opción: es un `Checkbox`.
- No regenerar con `pnpm exec shadcn add radio-group --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#radio-group` (con `pnpm dev`).
