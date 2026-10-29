# Botón (`button`)

## Para qué

Dispara una acción: seis variantes y ocho tamaños.

## Cuándo sí / cuándo no

**Sí**
- Cualquier acción: guardar, copiar, abrir, detener.
- Botones de solo icono (`size="icon*"`).
- En la app (HU-0016): todas las acciones de la app: cabeceras de página, sidebar, avisos, sesiones y diálogos. Primaria (`default`, el naranja), `outline` para Cancelar, `destructive` para borrar, `ghost` para iconos de fila.

**No**
- Navegar: `Link` de React Router (en el sidebar, `SidebarMenuButton asChild`).
- Confirmar dentro de un `AlertDialog` asíncrono: `Button` sí, pero no `AlertDialogAction` (cierra antes de marcar `busy`).

## Importación

```tsx
import { Button, buttonVariants } from "@/components/ui/button"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Button onClick={() => undefined}>Guardar</Button>
  )
}
```

## Variantes y tamaños

`variant`: `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`. `size`: `xs`, `sm`, `default`, `lg`, `icon-xs`, `icon-sm`, `icon`, `icon-lg`. `asChild` para pintar un enlace como botón.

## Estados

`disabled`, `aria-invalid`, foco con `focus-visible` (anillo `--ring`). Cargando: un `Spinner` con `data-icon="inline-start"` y `disabled`.

## Accesibilidad

Un botón de solo icono lleva `aria-label` en español. Con `asChild` el elemento hijo debe ser un `a` o un `button` real.

## Tokens que usa

- `--background`, `--border`, `--destructive`, `--foreground`, `--input`, `--primary-bright` (`bg-primary`), `--ring`, `--secondary-foreground`, `--secondary`, `--surface-soft` (`bg-muted`), `--ui-on-primary`, `--ui-primary-text`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 3: `text-primary` (sin `-foreground`) pasa a `text-primary-text`, el naranja legible en claro (#9c5947).

Ajuste 4 (HU-0019, A-3): las alturas siguen el tamaño del texto. `h-9`/`size-9` → `h-(--ctl)`/`size-(--ctl)`, `h-8`/`size-8`
(`sm`, `icon-sm`) → `--ctl-sm`, `h-10`/`size-10` (`lg`, `icon-lg`) → `--ctl-lg` y `h-6`/`size-6` (`xs`, `icon-xs`) →
`--ctl-xs`. Cada `--ctl*` es su alto en px por `--esc` (0,93, 1 o 1,143): en «Normal» no cambia nada. El texto usa `text-sm`, que
ya vale `--fs-body`. Los iconos (16 px) no crecen.

## Qué no hacer

- No pintar un `div` con la clase del botón.
- No usar `variant="link"` para texto que no navega.
- No regenerar con `pnpm exec shadcn add button --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#button` (con `pnpm dev`).
