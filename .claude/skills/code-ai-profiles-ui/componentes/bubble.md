# Burbuja (`bubble`)

## Para qué

Globo de texto con siete variantes.

## Cuándo sí / cuándo no

**Sí**
- El globo de un mensaje.

**No**
- Para texto normal: un párrafo.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { BubbleGroup, Bubble, BubbleContent, BubbleReactions } from "@/components/ui/bubble"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Bubble, BubbleContent } from "@/components/ui/bubble"

export function Ejemplo() {
  return (
    <Bubble variant="secondary">
      <BubbleContent>Texto de ejemplo</BubbleContent>
    </Bubble>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `secondary`, `muted`, `tinted`, `outline`, `ghost`, `destructive`. `align`. `BubbleReactions` `side`/`align`.

## Estados

`BubbleContent asChild` con un botón o enlace.

## Accesibilidad

Si es pulsable, usa `asChild` con un elemento interactivo.

## Tokens que usa

- `--background`, `--border`, `--card`, `--destructive`, `--foreground`, `--input`, `--primary-bright` (`bg-primary`), `--ring`, `--secondary-foreground`, `--secondary`, `--surface-soft` (`bg-muted`), `--ui-on-primary`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 2: `var(--muted)` pasa a `var(--surface-soft)` en el `color-mix` del hover (A-3: `--muted` es texto en la app).

## Qué no hacer

- No mostrar contenido real de perfiles.
- No regenerar con `pnpm exec shadcn add bubble --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#bubble` (con `pnpm dev`).
