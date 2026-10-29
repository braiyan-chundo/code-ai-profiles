# Gráfico (`chart`)

## Para qué

Gráficos de barras y líneas con el tema de la app.

## Cuándo sí / cuándo no

**Sí**
- Gráficos de barras, líneas o áreas con los colores del tema.

**No**
- Una barra simple de avance: `Progress`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from "@/components/ui/chart"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"

export function Ejemplo() {
  const datos = [
    { dia: "Lun", sesion: 40 },
    { dia: "Mar", sesion: 62 },
  ]
  const config = { sesion: { label: "Sesión", color: "var(--chart-1)" } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="h-48 w-80">
      <BarChart data={datos} accessibilityLayer>
        <XAxis dataKey="dia" tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="sesion" fill="var(--color-sesion)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}
```

## Variantes y tamaños

Recharts 3.8: cualquier gráfico dentro de `ChartContainer`. Colores `--chart-1` a `--chart-5`.

## Estados

Sin datos: ejes vacíos; añade un texto aparte.

## Accesibilidad

`accessibilityLayer` en el gráfico; no dependas solo del color (leyenda y tooltip).

## Tokens que usa

- `--background`, `--border`, `--foreground`, `--muted` (`text-muted-foreground`), `--surface-soft` (`bg-muted`)
- Además: `--radius-*`, `--font-mono`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No pasar datos de un perfil real: solo metadatos permitidos.
- No regenerar con `pnpm exec shadcn add chart --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#chart` (con `pnpm dev`).
