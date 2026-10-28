# Grupo de interruptores (`toggle-group`)

## Para qué

Conjunto de toggles de selección única o múltiple.

## Cuándo sí / cuándo no

**Sí**
- Elegir una o varias opciones cortas que se ven siempre (alineación, vista, filtro).

**No**
- Más de cinco opciones o texto largo: usa `Select`. Una opción de formulario con etiqueta: `RadioGroup`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function Ejemplo() {
  return (
    <ToggleGroup type="single" variant="outline" defaultValue="lista" aria-label="Vista">
      <ToggleGroupItem value="lista">Lista</ToggleGroupItem>
      <ToggleGroupItem value="cuadricula">Cuadrícula</ToggleGroupItem>
    </ToggleGroup>
  )
}
```

## Variantes y tamaños

`type`: `single` o `multiple`. `variant`: `default`, `outline`. `size`: `sm`, `default`, `lg`. `spacing` separa los botones.

## Estados

`disabled` en el grupo o en un item. Con `type="single"`, Radix permite quedarse sin valor: se valida el vacío en `onValueChange`.

## Accesibilidad

El grupo lleva `aria-label` en español; cada item de solo icono, también.

## Tokens que usa

- `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No olvidar `type`: es obligatorio.
- No regenerar con `pnpm exec shadcn add toggle-group --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#toggle-group` (con `pnpm dev`).
