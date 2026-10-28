# Etiqueta (`label`)

## Para qué

Texto asociado a un control, con su estado deshabilitado.

## Cuándo sí / cuándo no

**Sí**
- Etiquetar un control suelto (checkbox, radio, input).

**No**
- Dentro de un `Field`: usa `FieldLabel`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import { Label } from "@/components/ui/label"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export function Ejemplo() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="acepto" />
      <Label htmlFor="acepto">Acepto</Label>
    </div>
  )
}
```

## Variantes y tamaños

Sin variantes.

## Estados

Se atenúa dentro de un grupo con `data-disabled` o con un par `peer` deshabilitado.

## Accesibilidad

`htmlFor` apunta al `id` del control.

## Tokens que usa

- Ninguno propio: hereda del contenedor.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No usar un `span` como etiqueta.
- No regenerar con `pnpm exec shadcn add label --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#label` (con `pnpm dev`).
