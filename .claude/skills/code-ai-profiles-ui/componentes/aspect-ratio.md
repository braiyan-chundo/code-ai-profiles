# Relación de aspecto (`aspect-ratio`)

## Para qué

Mantiene una proporción fija.

## Cuándo sí / cuándo no

**Sí**
- Mantener una proporción fija para una imagen o un bloque.

**No**
- Cuando CSS `aspect-ratio` en la clase basta.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { AspectRatio } from "@/components/ui/aspect-ratio"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { AspectRatio } from "@/components/ui/aspect-ratio"

export function Ejemplo() {
  return (
    <AspectRatio ratio={16 / 9}>
      <div className="size-full rounded-xl bg-muted" />
    </AspectRatio>
  )
}
```

## Variantes y tamaños

`ratio` numérico.

## Estados

Ninguno.

## Accesibilidad

Sin impacto propio.

## Tokens que usa

- Ninguno propio: hereda del contenedor.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No fijar el alto a la vez que el ratio.
- No regenerar con `pnpm exec shadcn add aspect-ratio --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#aspect-ratio` (con `pnpm dev`).
