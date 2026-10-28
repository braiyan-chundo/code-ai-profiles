# Dirección (`direction`)

## Para qué

Proveedor de dirección de lectura (izquierda a derecha o al revés).

## Cuándo sí / cuándo no

**Sí**
- Cambiar la dirección de lectura de un bloque (derecha a izquierda).

**No**
- La app está en español: hoy no hace falta.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { DirectionProvider, useDirection } from "@/components/ui/direction"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { DirectionProvider } from "@/components/ui/direction"

export function Ejemplo() {
  return (
    <DirectionProvider dir="rtl">
      <div dir="rtl">Texto de ejemplo</div>
    </DirectionProvider>
  )
}
```

## Variantes y tamaños

`dir`: `ltr`, `rtl`.

## Estados

Afecta a los componentes Radix de dentro.

## Accesibilidad

Pon también el atributo `dir` en el contenedor.

## Tokens que usa

- Ninguno propio: hereda del contenedor.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No envolver la app entera sin necesidad.
- No regenerar con `pnpm exec shadcn add direction --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#direction` (con `pnpm dev`).
