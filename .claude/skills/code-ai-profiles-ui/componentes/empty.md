# Estado vacío (`empty`)

## Para qué

Mensaje cuando no hay nada que mostrar.

## Cuándo sí / cuándo no

**Sí**
- Cuando una lista o sección no tiene nada que mostrar.
- En la app (HU-0016): `EmptyState` (sin fuente, sin instancias, sin coincidencias) y el vacío de `SessionList`.

**No**
- Un vacío de página de la app: usa `EmptyState` (`src/components/EmptyState.tsx`), que ya lo compone.

## Importación

```tsx
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { FolderIcon } from "lucide-react"

export function Ejemplo() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderIcon />
        </EmptyMedia>
        <EmptyTitle>Sin perfiles</EmptyTitle>
        <EmptyDescription>Aquí aparecerán cuando existan.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
```

## Variantes y tamaños

`EmptyMedia` `variant`: `default`, `icon`. `EmptyContent` para acciones.

## Estados

Con y sin acción.

## Accesibilidad

El título resume el estado; la acción dice qué hacer.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--surface-soft` (`bg-muted`), `--ui-primary-text`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 3: `text-primary` (sin `-foreground`) pasa a `text-primary-text`, el naranja legible en claro (#9c5947).

## Qué no hacer

- No usarlo para errores: es `Alert`.
- No regenerar con `pnpm exec shadcn add empty --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#empty` (con `pnpm dev`).
