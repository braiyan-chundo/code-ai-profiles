# Grupo de botones (`button-group`)

## Para qué

Une botones, texto y menús en una sola pieza.

## Cuándo sí / cuándo no

**Sí**
- Acciones relacionadas que se leen como una sola pieza (anterior/siguiente, acción + menú).

**No**
- Acciones sueltas o separadas: usa `Button` con huecos (`gap-*`).
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
} from "@/components/ui/button-group"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <ButtonGroup>
      <Button variant="outline">Anterior</Button>
      <Button variant="outline">Siguiente</Button>
    </ButtonGroup>
  )
}
```

## Variantes y tamaños

`orientation`: `horizontal` (por defecto) o `vertical`. Piezas auxiliares: `ButtonGroupText` y `ButtonGroupSeparator`.

## Estados

Hereda el estado de cada `Button` (`disabled`, foco).

## Accesibilidad

Un grupo vertical o con sentido propio lleva `aria-label` en español (el componente ya trae `role="group"`).

## Tokens que usa

- `--input`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No anidar un `ButtonGroup` dentro de otro.
- No regenerar con `pnpm exec shadcn add button-group --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#button-group` (con `pnpm dev`).
