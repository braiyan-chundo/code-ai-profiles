# Traza (`trace`)

## Para qué

Pasos de una tarea con su estado.

## Cuándo sí / cuándo no

**Sí**
- Los pasos de una tarea con su estado, o un detalle desplegable.

**No**
- Progreso medible: `Progress`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  Trace,
  TraceLine,
  TraceIcon,
  TraceTitle,
  TraceDescription,
  TraceCollapsible,
  TraceCollapsibleTrigger,
  TraceCollapsibleContent,
} from "@/components/ui/trace"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Trace, TraceLine, TraceIcon, TraceTitle } from "@/components/ui/trace"
import { LoaderIcon } from "lucide-react"

export function Ejemplo() {
  return (
    <Trace>
      <TraceLine status="running">
        <TraceIcon>
          <LoaderIcon className="animate-spin" />
        </TraceIcon>
        <TraceTitle>Paso en curso</TraceTitle>
      </TraceLine>
    </Trace>
  )
}
```

## Variantes y tamaños

`TraceLine` `status`: `running`, `pending`, `error` (o ninguno). `TraceCollapsible` para un detalle.

## Estados

Los cuatro estados.

## Accesibilidad

El icono es decorativo; el título dice el estado.

## Tokens que usa

- `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`), `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No volcar salidas de procesos de un perfil.
- No regenerar con `pnpm exec shadcn add trace --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#trace` (con `pnpm dev`).
