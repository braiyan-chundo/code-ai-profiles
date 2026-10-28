# Barra de menús (`menubar`)

## Para qué

Menús de aplicación en una barra horizontal.

## Cuándo sí / cuándo no

**Sí**
- Menús de aplicación en una barra (Archivo, Ver…).

**No**
- Un solo menú: `DropdownMenu`. Los controles de ventana de la app los pone `Titlebar`.
- En una pantalla de la app: hoy no. La app no carga Tailwind (D-2); lo adopta una historia posterior.

## Importación

```tsx
import {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from "@/components/ui/menubar"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarShortcut,
} from "@/components/ui/menubar"

export function Ejemplo() {
  return (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>Archivo</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            Nuevo perfil <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  )
}
```

## Variantes y tamaños

Elementos: `MenubarItem`, `MenubarCheckboxItem`, `MenubarRadioGroup`/`MenubarRadioItem`, `MenubarSub`, `MenubarSeparator`, `MenubarShortcut`.

## Estados

`disabled` en un item; casillas y radios con su estado.

## Accesibilidad

Radix: roles `menubar` y `menuitem`, y navegación con flechas.

## Tokens que usa

- `--accent-foreground`, `--accent`, `--border`, `--destructive`, `--foreground`, `--muted` (`text-muted-foreground`), `--popover-foreground`, `--surface-soft` (`bg-muted`), `--ui-popover`
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ninguna: es el código del registro `radix-vega` (2026-10-28) tal como se descargó.

## Qué no hacer

- No sustituir con esto el menú nativo de macOS.
- No regenerar con `pnpm exec shadcn add menubar --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#menubar` (con `pnpm dev`).
