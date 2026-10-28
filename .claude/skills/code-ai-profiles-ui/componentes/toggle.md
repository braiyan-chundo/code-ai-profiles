# Interruptor de pulsación (`toggle`)

## Para qué

Botón con estado pulsado o no pulsado.

## Cuándo sí / cuándo no

**Sí**
- Un botón con dos estados (pulsado o no): negrita, filtro activo, vista.

**No**
- Para activar un ajuste al instante: usa `Switch`. Para elegir una opción entre varias: `ToggleGroup` o `RadioGroup`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Toggle, toggleVariants } from "@/components/ui/toggle"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Toggle } from "@/components/ui/toggle"

export function Ejemplo() {
  return (
    <Toggle variant="outline" aria-label="Mostrar sesiones">Sesiones</Toggle>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `outline`. `size`: `sm`, `default`, `lg`.

## Estados

`pressed` (controlado) o `defaultPressed`, `disabled`, `aria-invalid`.

## Accesibilidad

Un toggle de solo icono lleva `aria-label`. Radix expone `aria-pressed`.

## Tokens que usa

- `--destructive`, `--foreground`, `--input`, `--ring`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usarlo para navegar: eso es un enlace.
- No regenerar con `pnpm exec shadcn add toggle --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#toggle` (con `pnpm dev`).
