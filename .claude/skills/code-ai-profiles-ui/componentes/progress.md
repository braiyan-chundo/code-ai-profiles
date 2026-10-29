# Progreso (`progress`)

## Para qué

Barra de avance de una tarea.

## Cuándo sí / cuándo no

**Sí**
- Mostrar el avance de una tarea medible.
- En la app (HU-0016): `UsageMeter`, `UsageBar`, `SessionContextMeter` y `ScanProgressPanel`. Pasa siempre `aria-valuenow` (ver «Accesibilidad»).

**No**
- El uso de sesión y semanal de una instancia: `UsageMeter` o `UsageBar` (`features/instances`), que ya lo componen. Sin duración conocida: `Spinner`.

## Importación

```tsx
import { Progress } from "@/components/ui/progress"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Progress } from "@/components/ui/progress"

export function Ejemplo() {
  return (
    <Progress value={60} aria-label="Progreso" />
  )
}
```

## Variantes y tamaños

Sin variantes: el valor va de 0 a 100.

## Estados

El ancho del indicador sale de `value` (0 a 100). **El Root nunca recibe `value`**: el componente lo desestructura
para el indicador y no lo pasa a `ProgressPrimitive.Root`, así que Radix lo deja siempre en
`data-state="indeterminate"`, con o sin valor. No uses `data-state` para pintar estados: usa tus propios `data-*`.

## Accesibilidad

`aria-label` en español; Radix pone `role="progressbar"` y `aria-valuemax="100"`. Como el Root no recibe `value`, Radix
**no pone `aria-valuenow`**: un lector de pantalla lo anunciaría como indeterminado. La app lo pasa a mano, redondeado
(`<Progress value={v} aria-valuenow={Math.round(v)} aria-label="…" />`, como en `UsageMeter`, `UsageBar`,
`SessionContextMeter` y `ScanProgressPanel`), y lo omite cuando no hay dato. Comprobado en el DOM (HU-0016).

## Tokens que usa

- `--primary-bright` (`bg-primary`), `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No olvidar `aria-valuenow` (ver «Accesibilidad») ni pasarle `value` sin redondear a un lector.
- No mostrar un 100 % mientras sigue trabajando.
- No regenerar con `pnpm exec shadcn add progress --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#progress` (con `pnpm dev`).
