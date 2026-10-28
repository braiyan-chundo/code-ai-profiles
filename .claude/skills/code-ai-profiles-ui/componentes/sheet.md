# Panel lateral (`sheet`)

## Para qué

Panel que entra desde un borde de la ventana.

## Cuándo sí / cuándo no

**Sí**
- Un panel lateral o inferior con un formulario o detalle largo.

**No**
- Una confirmación corta: `AlertDialog`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Abrir panel</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Detalle</SheetTitle>
          <SheetDescription>Contenido del panel.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
```

## Variantes y tamaños

`SheetContent` `side`: `top`, `right`, `bottom`, `left`.

## Estados

Abierto o cerrado; el velo desenfoca el fondo.

## Accesibilidad

Igual que `Dialog`: título y descripción, foco atrapado, Escape.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--ui-overlay`, `--ui-popover`

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 1 (velo): `bg-black/10 … backdrop-blur-xs` pasa a `bg-overlay … backdrop-blur-[18px]`, el velo de `.modal-backdrop`.

Ajuste 2 (HU-0016, A-4): `Close` → `Cerrar` en el `sr-only` de la X de `SheetContent`.

## Qué no hacer

- No usarlo como navegación permanente: es `Sidebar`.
- No regenerar con `pnpm exec shadcn add sheet --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#sheet` (con `pnpm dev`).
