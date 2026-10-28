# Botón (`button`)

## Para qué

Dispara una acción: seis variantes y ocho tamaños.

## Cuándo sí / cuándo no

**Sí**
- Una acción nueva en una superficie que ya use Tailwind: guardar, copiar, abrir.
- Botones de solo icono (`size="icon*"`).

**No**
- En las pantallas actuales: siguen `.primary-action`, `.secondary-button` y `.destructive-button` (`src/components/buttons.css`, `shell.css`).
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Button, buttonVariants } from "@/components/ui/button"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Button onClick={() => undefined}>Guardar</Button>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`. `size`: `xs`, `sm`, `default`, `lg`, `icon-xs`, `icon-sm`, `icon`, `icon-lg`. `asChild` para pintar un enlace como botón.

## Estados

`disabled`, `aria-invalid`, foco con `focus-visible` (anillo `--ring`). Cargando: un `Spinner` con `data-icon="inline-start"` y `disabled`.

## Accesibilidad

Un botón de solo icono lleva `aria-label` en español. Con `asChild` el elemento hijo debe ser un `a` o un `button` real.

## Tokens que usa

- `--background`, `--border`, `--destructive`, `--foreground`, `--input`, `--primary-bright` (`bg-primary`), `--ring`, `--secondary-foreground`, `--secondary`, `--surface-soft` (`bg-muted`), `--ui-on-primary`, `--ui-primary-text`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 3: `text-primary` (sin `-foreground`) pasa a `text-primary-text`, el naranja legible en claro (#9c5947).

## Qué no hacer

- No pintar un `div` con la clase del botón.
- No usar `variant="link"` para texto que no navega.
- No regenerar con `pnpm exec shadcn add button --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#button` (con `pnpm dev`).
