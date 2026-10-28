# Progreso (`progress`)

## Para qué

Barra de avance de una tarea.

## Cuándo sí / cuándo no

**Sí**
- Mostrar el avance de una tarea medible.

**No**
- En las pantallas actuales: `UsageMeter` (uso de sesión y semanal) y el progreso del escaneo. Sin duración conocida: `Spinner`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

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

Sin `value`: indeterminado.

## Accesibilidad

`aria-label` en español; Radix pone `role="progressbar"`.

## Tokens que usa

- `--primary-bright` (`bg-primary`), `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No mostrar un 100 % mientras sigue trabajando.
- No regenerar con `pnpm exec shadcn add progress --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#progress` (con `pnpm dev`).
