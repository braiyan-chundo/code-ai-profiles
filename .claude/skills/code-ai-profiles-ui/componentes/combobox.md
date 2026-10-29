# Combobox (`combobox`)

## Para qué

Campo con búsqueda y lista de opciones, simple o múltiple.

## Cuándo sí / cuándo no

**Sí**
- Elegir entre muchas opciones con búsqueda, una o varias (con chips).

**No**
- Pocas opciones: `Select`. Aquí viene de `@base-ui/react`, no de Radix: `asChild` no existe, se usa `render`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox"

export function Ejemplo() {
  return (
    <Combobox items={["Perfil uno", "Perfil dos"]}>
      <ComboboxInput placeholder="Elige un perfil" aria-label="Perfil" />
      <ComboboxContent>
        <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
```

## Variantes y tamaños

Simple o `multiple` (con `ComboboxChips`, `ComboboxChip`, `ComboboxChipsInput` y `useComboboxAnchor`). `ComboboxInput` acepta `showTrigger` y `showClear`.

## Estados

`disabled` en el `Combobox`; `ComboboxEmpty` para el vacío.

## Accesibilidad

`aria-label` en español en el input.

## Tokens que usa

- `--accent-foreground`, `--accent`, `--border`, `--destructive`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ring`, `--surface-soft` (`bg-muted`), `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No mezclar este patrón con `Command`: son dos componentes distintos.
- No regenerar con `pnpm exec shadcn add combobox --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#combobox` (con `pnpm dev`).
