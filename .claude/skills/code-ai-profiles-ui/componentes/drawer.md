# Cajón (`drawer`)

## Para qué

Panel que se arrastra para cerrarlo.

## Cuándo sí / cuándo no

**Sí**
- Un panel que se arrastra para cerrarlo (gestos táctiles o de ratón).

**No**
- Si no necesitas arrastrar: `Sheet`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

export function Ejemplo() {
  return (
    <Drawer direction="bottom">
      <DrawerTrigger asChild>
        <Button variant="outline">Abrir cajón</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Cajón</DrawerTitle>
          <DrawerDescription>Arrastra para cerrar.</DrawerDescription>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  )
}
```

## Variantes y tamaños

`direction`: `bottom`, `top`, `left`, `right` (librería `vaul`).

## Estados

Abierto, cerrado y arrastrando.

## Accesibilidad

Título y descripción obligatorios; Escape cierra.

## Tokens que usa

- `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--surface-soft` (`bg-muted`), `--ui-overlay`, `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste 1 (velo): `bg-black/10 … backdrop-blur-xs` pasa a `bg-overlay … backdrop-blur-[18px]`, el velo de `.modal-backdrop`.

## Qué no hacer

- No mezclar `Drawer` y `Sheet` para lo mismo en una pantalla.
- No regenerar con `pnpm exec shadcn add drawer --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#drawer` (con `pnpm dev`).
