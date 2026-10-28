# Campo (`field`)

## Para qué

Etiqueta, control, descripción y error de un campo de formulario.

## Cuándo sí / cuándo no

**Sí**
- Cualquier campo de formulario con etiqueta, ayuda y error.

**No**
- Un control suelto sin etiqueta visible: pon `aria-label`. Los formularios actuales usan `.form-field` (`instance-editor.css`).
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from "@/components/ui/field"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function Ejemplo() {
  return (
    <Field>
      <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
      <Input id="nombre" placeholder="Perfil de ejemplo" />
      <FieldDescription>Se muestra en la lista.</FieldDescription>
    </Field>
  )
}
```

## Variantes y tamaños

`Field` `orientation`: `vertical`, `horizontal`, `responsive`. Piezas: `FieldSet`, `FieldLegend`, `FieldGroup`, `FieldContent`, `FieldTitle`, `FieldSeparator`, `FieldError`.

## Estados

`data-invalid` en el `Field` y `aria-invalid` en el control pintan el error; `data-disabled` el estado deshabilitado. `FieldError` muestra el mensaje.

## Accesibilidad

`FieldLabel` con `htmlFor` igual al `id` del control. El mensaje de error en español y diciendo qué hacer.

## Tokens que usa

- `--background`, `--destructive`, `--muted` (`text-muted-foreground`), `--primary-bright` (`bg-primary`), `--ring`, `--surface-soft` (`bg-muted`), `--ui-primary-text`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 3: `text-primary` (sin `-foreground`) pasa a `text-primary-text`, el naranja legible en claro (#9c5947).

## Qué no hacer

- No poner el mensaje de error solo en color: lleva texto.
- No regenerar con `pnpm exec shadcn add field --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#field` (con `pnpm dev`).
