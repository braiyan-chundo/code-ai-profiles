# Diálogo (`dialog`)

## Para qué

Ventana modal para una tarea corta.

## Cuándo sí / cuándo no

**Sí**
- Una tarea corta que bloquea el resto: renombrar, editar un campo.
- En la app (HU-0016): `AppearanceDialog`, `InstanceEditor`, `SessionTransferDialog`, `ApplicationUpdateDialog` y `OriginalApplicationUpdateDialog`, montados por `DialogHost`.

**No**
- Para confirmar una acción: `AlertDialog`.

## Importación

```tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Abrir</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar perfil</DialogTitle>
          <DialogDescription>Escribe el nuevo nombre.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

## Variantes y tamaños

`DialogContent` `showCloseButton` (por defecto, con X) y `closeDisabled` (deshabilita la X mientras corre la operación;
ajuste 3). Piezas: `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`.

## Estados

Abierto o cerrado (`open`/`onOpenChange` o con trigger). Contenido largo: `DialogContent` hace scroll dentro de la
ventana (ajuste 3). Con una operación en curso, la app lo monta con `open` fijo y un `onOpenChange` que no cierra si hay
`busy`: así Escape, la X y el clic fuera quedan guardados igual que «Cancelar» (HU-0016, A-12).

## Accesibilidad

`DialogTitle` y `DialogDescription` son obligatorios para lectores de pantalla (si no se ven, con `sr-only`). Foco atrapado y Escape cierra. El botón de cierre trae `sr-only` «Cerrar» (ajuste 2).

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ui-overlay`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 1 (velo): `bg-black/10 … backdrop-blur-xs` pasa a `bg-overlay … backdrop-blur-[18px]`, el velo de `.modal-backdrop`.

Ajuste 2 (HU-0016, A-4): `Close` → `Cerrar` en el `sr-only` de la X de `DialogContent` y en el botón de
`DialogFooter showCloseButton`.

Ajuste 3 (HU-0016, A-12): el aspecto del modal de la app. `DialogContent` pasa de `rounded-xl p-6 sm:max-w-md` a
`rounded-3xl p-7 sm:max-w-[580px]` (radio 26, relleno 28 y ancho 580 del antiguo `.modal-card`) y gana
`max-h-[calc(100%-2rem)] overflow-y-auto`, para que un diálogo largo quepa en 980×680. Prop nueva `closeDisabled`, que
deshabilita la X. `DialogTitle` pasa de `leading-none font-medium` a `text-(length:--fs-dialog) leading-tight font-semibold
tracking-[-0.035em]` (HU-0019: antes `text-[22px]`, ahora crece con el tamaño del texto: 20, 22 o 25 px) y `DialogDescription`, de `text-sm` a `text-xs` (los del antiguo `.modal-header`).

Ajuste HU-0022 (A-1.1 y A-1.3): `DialogContent` pasa a `p-6` (24) y `sm:max-w-[576px]` (6 columnas de 68 px con 24 de separación más 2 × 24 de relleno); el radio `rounded-3xl` vale ahora 24 (antes 26). `DialogTitle` usa `text-(length:--fs-dialog)/(--lh-dialog)` en lugar de `leading-tight`.

## Qué no hacer

- No abrir un diálogo dentro de otro.
- No darle un `container` dentro del shell: el portal va a `body` y hereda el tema de `<html>` (HU-0016, A-3).
- No regenerar con `pnpm exec shadcn add dialog --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#dialog` (con `pnpm dev`).
