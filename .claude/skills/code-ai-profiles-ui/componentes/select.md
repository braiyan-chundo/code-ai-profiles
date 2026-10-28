# Selector (`select`)

## Para qué

Lista desplegable personalizada de opciones.

## Cuándo sí / cuándo no

**Sí**
- Elegir una opción entre muchas desde una lista.

**No**
- Pocas opciones siempre visibles: `RadioGroup` o `ToggleGroup`. Con búsqueda: `Combobox`. Sin estilo propio: `NativeSelect`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function Ejemplo() {
  return (
    <Select defaultValue="uno">
      <SelectTrigger className="w-56" aria-label="Perfil">
        <SelectValue placeholder="Elige un perfil" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="uno">Perfil uno</SelectItem>
        <SelectItem value="dos">Perfil dos</SelectItem>
      </SelectContent>
    </Select>
  )
}
```

## Variantes y tamaños

`SelectTrigger` `size`: `default`, `sm`. Grupos con `SelectGroup`, `SelectLabel` y `SelectSeparator`.

## Estados

`disabled` en el `Select` o en un `SelectItem`; `aria-invalid` en el trigger.

## Accesibilidad

El trigger lleva `aria-label` o está asociado a una etiqueta con `id`.

## Tokens que usa

- `--accent-foreground`, `--accent`, `--border`, `--destructive`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ring`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar `value=""` en un `SelectItem`: Radix lo reserva para el vacío.
- No regenerar con `pnpm exec shadcn add select --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#select` (con `pnpm dev`).
