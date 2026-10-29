# Tarjeta (`card`)

## Para qué

Contenedor con cabecera, contenido y pie.

## Cuándo sí / cuándo no

**Sí**
- Agrupar contenido relacionado con cabecera, cuerpo y pie.
- En la app (HU-0016): `InstanceDetail`, `OriginalDetail`, `UsageMeter`, `SummaryCards` y `UsageRanking`.

**No**
- Una fila de lista: `Item`. Un aviso: `Alert`.

## Importación

```tsx
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export function Ejemplo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil de ejemplo</CardTitle>
        <CardDescription>Descripción de muestra.</CardDescription>
      </CardHeader>
      <CardContent>Contenido.</CardContent>
    </Card>
  )
}
```

## Variantes y tamaños

`size`: `default`, `sm`. Piezas: `CardAction`, `CardFooter`.

## Estados

Con y sin acción y pie.

## Accesibilidad

El título es un `div`: si encabeza una sección, usa un encabezado dentro.

## Tokens que usa

- `--card-foreground`, `--card`, `--foreground`, `--muted` (`text-muted-foreground`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No anidar tarjetas.
- No regenerar con `pnpm exec shadcn add card --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#card` (con `pnpm dev`).
