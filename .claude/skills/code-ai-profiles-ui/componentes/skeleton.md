# Esqueleto (`skeleton`)

## Para qué

Marcador de posición mientras carga el contenido.

## Cuándo sí / cuándo no

**Sí**
- Reservar el sitio de un contenido que carga.

**No**
- En las pantallas actuales: `LoadingCards`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Skeleton } from "@/components/ui/skeleton"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

export function Ejemplo() {
  return (
    <Skeleton className="h-4 w-56" />
  )
}
```

## Variantes y tamaños

Sin variantes: forma y tamaño por `className`.

## Estados

Pulsa en bucle.

## Accesibilidad

Es decorativo; anuncia la carga en un contenedor con `aria-busy`.

## Tokens que usa

- `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar un esqueleto con otra forma que el contenido final.
- No regenerar con `pnpm exec shadcn add skeleton --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#skeleton` (con `pnpm dev`).
