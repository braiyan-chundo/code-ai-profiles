# Elemento de lista (`item`)

## Para qué

Fila con icono, título, descripción y acciones.

## Cuándo sí / cuándo no

**Sí**
- Filas de lista con icono, título, descripción y acciones.
- En la app (HU-0016): `SessionItem`/`SessionList` (filas de sesión), `UsageRanking` y la lista de `ApplicationUpdateDialog`.

**No**
- Tablas de datos: `Table`.

## Importación

```tsx
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
  ItemDescription,
  ItemHeader,
  ItemFooter,
} from "@/components/ui/item"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription } from "@/components/ui/item"
import { FolderIcon } from "lucide-react"

export function Ejemplo() {
  return (
    <Item variant="outline">
      <ItemMedia variant="icon">
        <FolderIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Perfil de ejemplo</ItemTitle>
        <ItemDescription>Descripción de muestra.</ItemDescription>
      </ItemContent>
    </Item>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `outline`, `muted`. `size`: `default`, `sm`, `xs`. `ItemMedia` `variant`: `default`, `icon`, `image`.

## Estados

Con y sin acciones; `ItemGroup` y `ItemSeparator` para listas.

## Accesibilidad

Si toda la fila es pulsable, usa `asChild` con un enlace o botón.

## Tokens que usa

- `--border`, `--muted` (`text-muted-foreground`), `--ring`, `--surface-soft` (`bg-muted`), `--ui-primary-text`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 3: `text-primary` (sin `-foreground`) pasa a `text-primary-text`, el naranja legible en claro (#9c5947).

Ajuste HU-0022 (A-1.1, A-1.3 y A-1.6): los tamaños pasan a `gap-3 px-4 py-3` (`default`), `gap-2 px-3 py-2` (`sm`) y `gap-2 px-2 py-2` (`xs`); la variante `outline` usa `ring-1 ring-inset ring-border` en lugar de `border`, y el foco, `ring-2 ring-ring`. Un `Item` dentro de una tarjeta lleva `rounded-sm` (anidado). Título y descripción pierden `leading-snug` y `leading-normal`.

## Qué no hacer

- No poner varios botones sin etiqueta en la fila.
- No regenerar con `pnpm exec shadcn add item --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#item` (con `pnpm dev`).
