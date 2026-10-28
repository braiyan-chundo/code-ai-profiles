# Avatar (`avatar`)

## Para qué

Imagen o iniciales de una persona o perfil.

## Cuándo sí / cuándo no

**Sí**
- Iniciales o imagen de un perfil o persona.

**No**
- Imágenes remotas: el showcase y la app no piden imágenes a ninguna URL; usa `AvatarFallback`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from "@/components/ui/avatar"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function Ejemplo() {
  return (
    <Avatar>
      <AvatarFallback>PE</AvatarFallback>
    </Avatar>
  )
}
```

## Variantes y tamaños

`size`: `sm`, `default`, `lg`. `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount`.

## Estados

Sin imagen: muestra el `AvatarFallback`.

## Accesibilidad

Si es informativo, añade un texto alternativo o `aria-label`.

## Tokens que usa

- `--background`, `--border`, `--muted` (`text-muted-foreground`), `--primary-bright` (`bg-primary`), `--surface-soft` (`bg-muted`), `--ui-on-primary`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No cargar avatares por red.
- No regenerar con `pnpm exec shadcn add avatar --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#avatar` (con `pnpm dev`).
