# Diálogo (`dialog`)

## Para qué

Ventana modal para una tarea corta.

## Cuándo sí / cuándo no

**Sí**
- Una tarea corta que bloquea el resto: renombrar, editar un campo.

**No**
- En las pantallas actuales: `ModalFrame` y los diálogos de `DialogHost`. Para confirmar: `AlertDialog`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

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

`DialogContent` `showCloseButton` (por defecto, con X). Piezas: `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`.

## Estados

Abierto o cerrado (`open`/`onOpenChange` o con trigger). Contenido largo: el cuerpo hace scroll.

## Accesibilidad

`DialogTitle` y `DialogDescription` son obligatorios para lectores de pantalla (si no se ven, con `sr-only`). Foco atrapado y Escape cierra. El botón de cierre trae `sr-only` en inglés ("Close").

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ui-overlay`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 1 (velo): `bg-black/10 … backdrop-blur-xs` pasa a `bg-overlay … backdrop-blur-[18px]`, el velo de `.modal-backdrop`.

## Qué no hacer

- No abrir un diálogo dentro de otro.
- El portal va a `body`: en la app, `.theme-light` está en `.desktop-shell` (R-5), así que hará falta `container` o la clase en `<html>`.
- No regenerar con `pnpm exec shadcn add dialog --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#dialog` (con `pnpm dev`).
