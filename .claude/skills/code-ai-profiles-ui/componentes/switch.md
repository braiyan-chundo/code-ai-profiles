# Interruptor (`switch`)

## Para qué

Activa o desactiva un ajuste al instante.

## Cuándo sí / cuándo no

**Sí**
- Activar o desactivar un ajuste con efecto inmediato.

**No**
- Si hay que confirmar con un botón: `Checkbox`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { Switch } from "@/components/ui/switch"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Switch } from "@/components/ui/switch"

export function Ejemplo() {
  return (
    <Switch aria-label="Avisos del sistema" defaultChecked />
  )
}
```

## Variantes y tamaños

`size`: `default`, `sm`.

## Estados

`checked` controlado o `defaultChecked`, `disabled`, `aria-invalid`.

## Accesibilidad

`aria-label` o `Label` asociada.

## Tokens que usa

- `--background`, `--destructive`, `--foreground`, `--input`, `--primary-bright` (`bg-primary`), `--ring`, `--ui-on-primary`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usarlo para acciones puntuales: es un `Button`.
- No regenerar con `pnpm exec shadcn add switch --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#switch` (con `pnpm dev`).
