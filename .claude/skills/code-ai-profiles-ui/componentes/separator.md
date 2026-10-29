# Separador (`separator`)

## Para qué

Línea que divide contenido.

## Cuándo sí / cuándo no

**Sí**
- Dividir contenido con una línea.

**No**
- Separar con espacio en blanco suele bastar.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { Separator } from "@/components/ui/separator"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Separator } from "@/components/ui/separator"

export function Ejemplo() {
  return (
    <Separator className="my-3" />
  )
}
```

## Variantes y tamaños

`orientation`: `horizontal`, `vertical`.

## Estados

`decorative` (por defecto) o semántico.

## Accesibilidad

Decorativo no se anuncia.

## Tokens que usa

- `--border`

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usarlo como borde de un contenedor.
- No regenerar con `pnpm exec shadcn add separator --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#separator` (con `pnpm dev`).
