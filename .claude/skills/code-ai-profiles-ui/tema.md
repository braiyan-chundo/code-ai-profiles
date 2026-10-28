# Tema del design system

Puente entre shadcn/ui y los tokens de la app. Vive en `src/styles/ui-theme.css`; solo lo importa
`src/showcase/showcase.css` (`index.css` no). Cada `--ui-*` lleva en el archivo un comentario con la regla de la
app de la que sale.

## Reglas

- **A-3**: no se redeclaran `--primary` ni `--muted`. `--primary` ya significa lo mismo en la app. `--muted` es un
  **color de texto** en la app y un **fondo** en shadcn: las utilidades se mapean en `@theme inline`
  (`bg-muted` = `--surface-soft`, `text-muted-foreground` = `--muted`). Nunca escribas `var(--muted)` en
  `components/ui` ni en `hooks` (lo vigila `tests/ui-isolation.test.ts`); usa `var(--surface-soft)`.
- **`bg-primary` es `--primary-bright`**, el relleno de `.primary-action` (naranja con texto blanco, 3,0:1). El
  naranja de **texto** es `text-primary-text` (`--ui-primary-text`: `--primary` en oscuro, #9c5947 en claro).
- **A-9**: la clase `theme-dark` o `theme-light` va en `<html>`, para que los portales de Radix (que cuelgan de
  `body`) hereden el tema. En la app la pone `AppearanceProvider` (HU-0016, A-3), con `data-session-text`, antes de
  pintar; `body` sigue transparente.
- Las variables de shadcn se declaran en `:root, .theme-dark, .theme-light`: una custom property se resuelve en el
  elemento que la declara, y un `.theme-light` dentro de `:root` no heredaría valores claros.
- `showcase.css` importa `base.css` y `theme-light.css` con `layer(base)`: dentro de la capa `base`, ganan al
  preflight y pierden ante las utilidades.

## Mapa

| Variable de shadcn | Valor | Oscuro → claro |
| --- | --- | --- |
| `--background`, `--sidebar` | `var(--surface)` | #151615 → #f3efeb |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground`, `--sidebar-foreground`, `--sidebar-accent-foreground` | `var(--text)` | #e8e4e2 → #2e2926 |
| `--card` | `var(--surface-raised)` | rgba(33,34,33,.9) → rgba(255,255,255,.92) |
| `--popover` | `var(--ui-popover)` | rgba(43,44,43,.98) → rgba(255,253,251,.995) |
| `--primary-foreground`, `--sidebar-primary-foreground` | `var(--ui-on-primary)` | #fff |
| `--secondary` | `var(--surface-soft)` | blanco 4,5 % → tierra 5,5 % |
| `--muted-foreground` | `var(--muted)` | #aaa19e → #746b67 |
| `--accent`, `--sidebar-accent`, `--border`, `--sidebar-border` | `var(--line)` | blanco 9 % → tierra 11 % |
| `--destructive` | `var(--danger)` | #ef7e70 → #be4f42 |
| `--input` | `var(--line-strong)` | |
| `--ring`, `--sidebar-ring` | `var(--primary)` | foco de la app |
| `--sidebar-primary` | `var(--primary-bright)` | #ff5f35 |
| `--chart-1` a `--chart-5` | `--primary`, `--primary-soft`, `--primary-bright`, `--muted`, `--quiet` | |
| `--radius` | `14px` | botones de `.modal-actions` |

`@theme inline` añade: `--color-primary` = `--primary-bright`; `--color-muted` = `--surface-soft`;
`--color-muted-foreground` = `--muted`; `--color-primary-text` = `--ui-primary-text`; `--color-overlay` =
`--ui-overlay` (el velo de `.modal-backdrop`); `--font-sans` y `--font-heading` = Inter; `--font-mono` = JetBrains
Mono; `--radius-sm/md/lg/xl/2xl/3xl/4xl` = 9, 12, `var(--radius)`, 16, 20, 26 y 32 px.

## Añadir un `--ui-*`

1. Solo si la app no tiene ya un token con ese valor. Busca primero en `base.css` y `theme-light.css`.
2. Declara el valor oscuro en `:root, .theme-dark` y el claro en `.theme-light`, con un comentario que diga de
   qué regla de la app sale. **No** toques `src/styles/base.css` ni `theme-light.css`.
3. Si hace falta una utilidad, mapéala en `@theme inline` (`--color-<nombre>: var(--ui-<nombre>)`).
4. Actualiza este mapa y la ficha de los componentes que lo usen.
