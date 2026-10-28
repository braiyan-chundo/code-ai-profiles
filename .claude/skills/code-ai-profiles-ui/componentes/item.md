# Elemento de lista (`item`)

## Para qué

Fila con icono, título, descripción y acciones.

## Cuándo sí / cuándo no

**Sí**
- Filas de lista con icono, título, descripción y acciones.

**No**
- Tablas de datos: `Table`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

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

## Qué no hacer

- No poner varios botones sin etiqueta en la fila.
- No regenerar con `pnpm exec shadcn add item --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#item` (con `pnpm dev`).
