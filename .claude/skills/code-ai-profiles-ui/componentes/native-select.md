# Selector nativo (`native-select`)

## Para qué

El select del navegador con el aspecto de la app.

## Cuándo sí / cuándo no

**Sí**
- Un selector del sistema (móvil o formularios simples) con el aspecto de la app.

**No**
- Si necesitas opciones con formato, grupos con estilo o búsqueda: `Select` o `Combobox`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

export function Ejemplo() {
  return (
    <NativeSelect aria-label="Perfil">
      <NativeSelectOption value="uno">Perfil uno</NativeSelectOption>
      <NativeSelectOption value="dos">Perfil dos</NativeSelectOption>
    </NativeSelect>
  )
}
```

## Variantes y tamaños

`size`: `default`, `sm`. `NativeSelectOptGroup` agrupa.

## Estados

`disabled`, `aria-invalid`.

## Accesibilidad

Es un `select` nativo: teclado y lectores de pantalla sin trabajo extra; etiqueta en español.

## Tokens que usa

- `--destructive`, `--input`, `--muted` (`text-muted-foreground`), `--primary-bright` (`bg-primary`), `--ring`, `--ui-on-primary`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No estilizar las `option`: el sistema las pinta.
- No regenerar con `pnpm exec shadcn add native-select --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#native-select` (con `pnpm dev`).
