# Etiqueta (`badge`)

## Para qué

Marca corta de estado o categoría.

## Cuándo sí / cuándo no

**Sí**
- Una marca corta de estado o categoría.

**No**
- En las pantallas actuales: `.instance-state`, `.original-badge`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Badge, badgeVariants } from "@/components/ui/badge"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Badge } from "@/components/ui/badge"

export function Ejemplo() {
  return (
    <Badge variant="secondary">Activo</Badge>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`. `asChild`.

## Estados

`aria-invalid`.

## Accesibilidad

No transmitas el estado solo por color: lleva texto.

## Tokens que usa

- `--border`, `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`), `--primary-bright` (`bg-primary`), `--ring`, `--secondary-foreground`, `--secondary`, `--surface-soft` (`bg-muted`), `--ui-on-primary`, `--ui-primary-text`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 3: `text-primary` (sin `-foreground`) pasa a `text-primary-text`, el naranja legible en claro (#9c5947).

## Qué no hacer

- No usarlo como botón sin `asChild` y un elemento interactivo.
- No regenerar con `pnpm exec shadcn add badge --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#badge` (con `pnpm dev`).
