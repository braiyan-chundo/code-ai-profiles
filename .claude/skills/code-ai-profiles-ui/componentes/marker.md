# Marcador (`marker`)

## Para qué

Divisor con texto dentro de una conversación.

## Cuándo sí / cuándo no

**Sí**
- Un divisor con texto dentro de una conversación ("Hoy", "Mensajes nuevos").

**No**
- Un separador sin texto: `Separator`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { Marker, MarkerIcon, MarkerContent, markerVariants } from "@/components/ui/marker"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Marker, MarkerContent } from "@/components/ui/marker"

export function Ejemplo() {
  return (
    <Marker variant="separator">
      <MarkerContent>Mensajes nuevos</MarkerContent>
    </Marker>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `separator`, `border`. `MarkerIcon`, `MarkerContent`.

## Estados

Ninguno.

## Accesibilidad

`MarkerIcon` es decorativo (`aria-hidden`).

## Tokens que usa

- `--border`, `--foreground`, `--muted` (`text-muted-foreground`)

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usarlo como título de sección.
- No regenerar con `pnpm exec shadcn add marker --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#marker` (con `pnpm dev`).
