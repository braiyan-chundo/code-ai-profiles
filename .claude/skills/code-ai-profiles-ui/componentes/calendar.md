# Calendario (`calendar`)

## Para qué

Elige un día o un rango de fechas.

## Cuándo sí / cuándo no

**Sí**
- Elegir un día o un rango de fechas.

**No**
- Una fecha escrita a mano: `Input type="date"`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"
import { es } from "react-day-picker/locale"

export function Ejemplo() {
  const [dia, setDia] = useState<Date | undefined>(new Date(2026, 9, 15))
  return (
    <Calendar mode="single" selected={dia} onSelect={setDia} locale={es} />
  )
}
```

## Variantes y tamaños

`mode`: `single`, `multiple`, `range`. `captionLayout`, `showOutsideDays`.

## Estados

`disabled` (fechas o reglas como `{ dayOfWeek: [0, 6] }`), día seleccionado y día actual.

## Accesibilidad

react-day-picker gestiona el teclado. Pasa `locale={es}` (`react-day-picker/locale`): sin él, los meses salen en inglés.

## Tokens que usa

- `--background`, `--foreground`, `--muted` (`text-muted-foreground`), `--primary-bright` (`bg-primary`), `--ring`, `--surface-soft` (`bg-muted`), `--ui-on-primary`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No olvidar `locale`: el texto de la interfaz es español.
- No regenerar con `pnpm exec shadcn add calendar --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#calendar` (con `pnpm dev`).
