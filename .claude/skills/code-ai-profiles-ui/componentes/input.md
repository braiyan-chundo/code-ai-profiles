# Campo de texto (`input`)

## Para qué

Entrada de una línea con sus tipos nativos.

## Cuándo sí / cuándo no

**Sí**
- Texto de una línea: nombre, búsqueda, correo.
- En la app (HU-0016): `InstanceEditor` y, a través de `SidebarInput`, el buscador del sidebar.

**No**
- Varias líneas: `Textarea`. Con iconos o botones dentro: `InputGroup`. Código de un solo uso: `InputOTP`.

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

Ajuste 1 (HU-0019, A-3): `h-9` → `h-(--ctl)` (36 px por `--esc`), para que el campo siga el tamaño del texto de Apariencia.

## Qué no hacer

- No usar `placeholder` como única etiqueta.
- No regenerar con `pnpm exec shadcn add input --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#input` (con `pnpm dev`).
