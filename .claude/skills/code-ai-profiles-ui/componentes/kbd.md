# Tecla (`kbd`)

## Para qué

Muestra una tecla o un atajo de teclado.

## Cuándo sí / cuándo no

**Sí**
- Mostrar un atajo de teclado dentro de un botón, un tooltip o un menú.
- En la app (HU-0016): el atajo ⌘F / Ctrl F del buscador del sidebar.

**No**
- Para código: usa `CodeBlock`. La app ya tiene `<kbd>` propio en la búsqueda (`.search-pill kbd`).

## Importación

```tsx
import { Kbd, KbdGroup } from "@/components/ui/kbd"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Kbd, KbdGroup } from "@/components/ui/kbd"

export function Ejemplo() {
  return (
    <KbdGroup>
      <Kbd>Ctrl</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  )
}
```

## Variantes y tamaños

Sin variantes: `Kbd` y `KbdGroup`.

## Estados

Ninguno: es de solo lectura.

## Accesibilidad

Es un `kbd` semántico; si el atajo es la única pista, repítelo en el `aria-label` del control.

## Tokens que usa

- `--background`, `--muted` (`text-muted-foreground`), `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 1 (HU-0019, A-3): `h-5` y `min-w-5` → `h-(--ctl-badge)` y `min-w-(--ctl-badge)` (24 px desde HU-0022).

Ajuste HU-0022 (A-1.3 y A-1.6): `rounded-xs` (4), sin relleno (`bg-transparent`) y con un anillo `ring-1 ring-inset ring-(--line-strong)`, porque el relleno `--line` daba 4,28:1 en oscuro y 3,84:1 en claro; dentro de un tooltip no lleva anillo. `--ctl-badge` ahora vale 24 (28 en Grande) y el texto lleva `leading-(--lh-small)`.

## Qué no hacer

- No escribir símbolos de una sola plataforma sin su equivalente en las otras (⌘ y Ctrl).
- No regenerar con `pnpm exec shadcn add kbd --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#kbd` (con `pnpm dev`).
