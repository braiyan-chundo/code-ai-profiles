# Campo de texto (`input`)

## Para qué

Entrada de una línea con sus tipos nativos.

## Cuándo sí / cuándo no

**Sí**
- Texto de una línea: nombre, búsqueda, correo.

**No**
- Varias líneas: `Textarea`. Con iconos o botones dentro: `InputGroup`. Código de un solo uso: `InputOTP`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Input } from "@/components/ui/input"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Input } from "@/components/ui/input"

export function Ejemplo() {
  return (
    <Input type="text" placeholder="Perfil de ejemplo" aria-label="Nombre" />
  )
}
```

## Variantes y tamaños

Acepta todos los `type` nativos (`text`, `email`, `password`, `number`, `search`, `file`).

## Estados

`disabled`, `readOnly`, `aria-invalid` (borde y anillo del color de `--destructive`), foco con anillo `--ring`.

## Accesibilidad

Siempre con etiqueta: `Field` + `FieldLabel` o `aria-label` en español.

## Tokens que usa

- `--destructive`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar `placeholder` como única etiqueta.
- No regenerar con `pnpm exec shadcn add input --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#input` (con `pnpm dev`).
