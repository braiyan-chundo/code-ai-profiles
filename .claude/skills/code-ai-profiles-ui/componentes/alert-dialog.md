# Diálogo de confirmación (`alert-dialog`)

## Para qué

Modal que exige confirmar o cancelar una acción.

## Cuándo sí / cuándo no

**Sí**
- Confirmar una acción que no se puede deshacer o que el usuario debe decidir.
- En la app (HU-0016): `DeleteInstanceDialog` y `UnlinkSessionDialog`.

**No**
- Para formularios: `Dialog`.

## Importación

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Eliminar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar el perfil?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## Variantes y tamaños

`AlertDialogContent` `size`: `default`, `sm`. `AlertDialogMedia` para un icono. `AlertDialogAction` y `AlertDialogCancel` aceptan `variant`.

## Estados

No se cierra al pulsar fuera: solo con Cancelar, la acción o Escape. `AlertDialogAction` cierra el diálogo al pulsarlo:
si la confirmación es asíncrona y el diálogo debe seguir abierto con «Eliminando…», usa un `Button` normal y cierra al
terminar (lo hacen `DeleteInstanceDialog` y `UnlinkSessionDialog`). Con `busy`, `onOpenChange` no cierra.

## Accesibilidad

Foco inicial en Cancelar. Título y descripción obligatorios.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--surface-soft` (`bg-muted`), `--ui-overlay`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 1 (velo): `bg-black/10 … backdrop-blur-xs` pasa a `bg-overlay … backdrop-blur-[18px]`, el velo de `.modal-backdrop`.

Ajuste 2 (HU-0016, A-12): el aspecto del modal de la app. `AlertDialogContent` pasa de `rounded-xl p-6` a
`rounded-3xl p-7`, y `AlertDialogTitle`, de `text-lg font-medium` a `text-(length:--fs-dialog) leading-tight font-semibold
tracking-[-0.035em]`, como `DialogTitle` (HU-0019: antes `text-[22px]`).

Ajuste HU-0022 (A-1.1 y A-1.3): `AlertDialogContent` pasa a `p-6` y su radio `rounded-3xl` vale 24; `AlertDialogHeader` usa `gap-1` y `AlertDialogTitle`, `text-(length:--fs-dialog)/(--lh-dialog)` en lugar de `leading-tight`.

## Qué no hacer

- No usarlo para información que no pide decisión: es `Alert` o `Dialog`.
- No regenerar con `pnpm exec shadcn add alert-dialog --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#alert-dialog` (con `pnpm dev`).
