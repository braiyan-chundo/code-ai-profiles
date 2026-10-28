# Deslizador (`slider`)

## Para qué

Elige un valor o un rango arrastrando.

## Cuándo sí / cuándo no

**Sí**
- Elegir un valor numérico o un rango arrastrando.

**No**
- Un número exacto: `Input type="number"`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { Slider } from "@/components/ui/slider"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Slider } from "@/components/ui/slider"

export function Ejemplo() {
  return (
    <Slider defaultValue={[50]} max={100} step={1} aria-label="Valor" />
  )
}
```

## Variantes y tamaños

Un valor o un rango (varios elementos en `value`). `orientation`: horizontal o `vertical`.

## Estados

`value` controlado (siempre un array), `disabled`.

## Accesibilidad

`aria-label` en español; Radix ya gestiona el teclado.

## Tokens que usa

- `--primary-bright` (`bg-primary`), `--ring`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No pasar un número suelto a `value`: es un array.
- No regenerar con `pnpm exec shadcn add slider --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#slider` (con `pnpm dev`).
