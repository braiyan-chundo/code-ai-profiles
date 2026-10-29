# Código de un solo uso (`input-otp`)

## Para qué

Entrada de código en casillas separadas.

## Cuándo sí / cuándo no

**Sí**
- Códigos cortos de un solo uso, uno por casilla.

**No**
- Texto libre: `Input`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

export function Ejemplo() {
  return (
    <InputOTP maxLength={4} aria-label="Código">
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
      </InputOTPGroup>
    </InputOTP>
  )
}
```

## Variantes y tamaños

Uno o varios `InputOTPGroup`, con `InputOTPSeparator` entre ellos.

## Estados

`disabled`; `aria-invalid` en cada `InputOTPSlot`. **No mezcles `value` y `defaultValue`**: la librería pasa siempre `value` y React avisa.

## Accesibilidad

`aria-label` en español en `InputOTP`.

## Tokens que usa

- `--destructive`, `--foreground`, `--input`, `--ring`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar `defaultValue` (usa `value` y `onChange`).
- No regenerar con `pnpm exec shadcn add input-otp --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#input-otp` (con `pnpm dev`).
