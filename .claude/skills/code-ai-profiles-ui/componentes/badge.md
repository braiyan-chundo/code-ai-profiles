# Etiqueta (`badge`)

## Para qué

Marca corta de estado o categoría.

## Cuándo sí / cuándo no

**Sí**
- Una marca corta de estado o categoría.
- En la app (HU-0016): `InstanceStatusBadge` (Ejecutándose, Detenido, No disponible, Deteniendo…), Archivada/Movida/Copia en `SessionList`, «Actualización disponible» e icono en `InstanceDetail`, y el recuento de `UsageRanking`.

**No**
- El estado de una instancia: `InstanceStatusBadge` (`features/instances`), que ya lo compone.

## Importación

```tsx
import { Badge, badgeVariants } from "@/components/ui/badge"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Badge } from "@/components/ui/badge"

export function Ejemplo() {
  return (
    <Badge variant="secondary">Activo</Badge>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`. `asChild`.

## Estados

`aria-invalid`.

## Accesibilidad

No transmitas el estado solo por color: lleva texto.

## Tokens que usa

- `--border`, `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`), `--primary-bright` (`bg-primary`), `--ring`, `--secondary-foreground`, `--secondary`, `--surface-soft` (`bg-muted`), `--ui-on-primary`, `--ui-primary-text`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 3: `text-primary` (sin `-foreground`) pasa a `text-primary-text`, el naranja legible en claro (#9c5947).

Ajuste 4 (HU-0019, A-3): `h-5` → `h-(--ctl-badge)` (24 px desde HU-0022). El texto usa `text-xs` (`--fs-small`) o, en la app,
`text-(length:--fs-micro)`. Un chip con una altura fija propia (`h-4`) recortaría el texto: no se le pone.

Ajuste HU-0022 (A-1.3): pasa de `rounded-4xl` a `rounded-sm` (8), alto `--ctl-badge` (ahora 24, 28 en Grande), `px-2` sin `py-0.5` y `leading-(--lh-small)`; el foco, a `ring-2 ring-ring`.

## Qué no hacer

- No usarlo como botón sin `asChild` y un elemento interactivo.
- No regenerar con `pnpm exec shadcn add badge --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#badge` (con `pnpm dev`).
