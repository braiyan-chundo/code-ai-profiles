# Tema del design system

Puente entre shadcn/ui y los tokens de la app. Los tokens viven en `src/styles/tokens.css` (HU-0016: sustituye a
`base.css`, `theme-light.css`, `animations.css` y `responsive.css`) y el puente, en `src/styles/ui-theme.css`. Los
importan las dos entradas, `src/styles/index.css` (la app) y `src/showcase/showcase.css`, en el mismo orden. Cada
`--ui-*` lleva en el archivo un comentario con la regla de la app de la que sale (aunque ese CSS ya se haya retirado).

## Reglas

- **A-3**: no se redeclaran `--primary` ni `--muted`. `--primary` ya significa lo mismo en la app. `--muted` es un
  **color de texto** en la app y un **fondo** en shadcn: las utilidades se mapean en `@theme inline`
  (`bg-muted` = `--surface-soft`, `text-muted-foreground` = `--muted`). Nunca escribas `var(--muted)` en
  `components/ui` ni en `hooks` (lo vigila `tests/ui-isolation.test.ts`); usa `var(--surface-soft)`.
- **`bg-primary` es `--primary-bright`**, el relleno del botón primario (naranja con texto oscuro `#151615`, 6,0:1;
  HU-0022, A-1.5). `--ui-on-primary` se declara en los tres selectores (`:root, .theme-dark` y `.theme-light`) como hex:
  `var(--surface)` no sirve, porque se resuelve en `<html>` y en claro daría `#f3efeb` (2,65:1). El hover del primario
  aclara hacia blanco (`color-mix`), porque `bg-primary/80` sobre la ventana oscura bajaba a 4,2:1. El naranja de
  **texto** es `text-primary-text` (`--ui-primary-text`: `--primary` en oscuro, #9c5947 en claro).
- **A-9**: la clase `theme-dark` o `theme-light` va en `<html>`, para que los portales de Radix (que cuelgan de
  `body`) hereden el tema. En la app la pone `AppearanceProvider` (HU-0016, A-3), con `data-text-size`, antes de
  pintar; `body` sigue transparente.
- Las variables de shadcn se declaran en `:root, .theme-dark, .theme-light`: una custom property se resuelve en el
  elemento que la declara, y un `.theme-light` dentro de `:root` no heredaría valores claros.
- `tokens.css` se importa con `layer(base)` en las dos entradas: dentro de la capa `base`, gana al preflight y pierde
  ante las utilidades. No hay CSS sin capa: la app se pinta con utilidades y el catálogo.
- Oscuro, la base, en `:root, .theme-dark`; claro en `.theme-light`, **después**. Así una muestra con `theme-dark` o
  `theme-light` dentro del otro tema toma sus propios tokens (las miniaturas de tema de `AppearanceDialog`).
- **Escala (HU-0019, HU-0022)**: siete `--fs-*` (`micro`, `small`, `body`, `heading`, `title`, `figure`, `dialog`), ocho
  `--lh-*` (los mismos más `prose`) y cinco alturas (`--ctl` 36, `--ctl-sm` 32, `--ctl-lg` 40, `--ctl-xs` 24 y
  `--ctl-badge` 24), todos en px enteros, van en `:root` y cambian con `:root[data-text-size=compact|large]`. **No hay
  `--esc`**: cada tamaño declara sus alturas, múltiplos de 4. Sustituyen a `--session-*`. Mínimo 11 px (prueba 12 de
  `test:ui`, que también vigila la retícula y el orden compacto ≤ normal ≤ grande). La tabla, en `DESIGN.md`.
- **El texto en la app es siempre `text-(length:--fs-<x>)/(--lh-<y>)`**, con el `/` obligatorio, nunca una utilidad
  propia (`text-micro`): `cn` (como tailwind-merge) la toma por un color y la borra. `leading-(--lh-<y>)` sirve donde
  el tamaño viene del catálogo; `leading-none|tight|snug|normal|relaxed|loose|[n]` están prohibidos (prueba 15). El
  catálogo se engancha por `@theme inline` en `ui-theme.css`: `--text-xs` = `--fs-small`, `--text-sm` = `--fs-body`,
  `--text-base` = `--fs-heading`, `--text-lg` = `--fs-title`, `--text-xl` = `--fs-figure` y `--text-2xl` =
  `--fs-dialog`, cada uno con su `--text-<n>--line-height` = `--lh-*`. `body` lleva `--fs-body` y `--lh-body`.
- **Espaciado, radios y foco (HU-0022, A-1)**: solo los pasos `0, 1, 2, 3, 4, 6, 8, 12` de Tailwind (0 a 48 px) en
  `p*`, `m*`, `gap*` y `space-*`; radios 4, 8, 12, 16, 20 y 24 (`rounded-xs` a `rounded-3xl`; nada de
  `rounded-4xl` ni `rounded-[calc…]`), con la regla de anidado `max(8, R − p)`; alturas arbitrarias múltiplos de 4;
  anillos de foco `ring-2 ring-ring` (`--ring` = `--ui-primary-text`, sin `/50`) y los bordes de 1 px que mueven la
  retícula como `ring-1 ring-inset`. Lo vigila la prueba 15 en la app y en los componentes que importa; el contraste
  de los pares sólidos, la 16.
- **`--quiet` no colorea texto** (3,4:1 en oscuro, 2,9:1 en claro): usa `text-muted-foreground`. Queda para puntos y
  rayas (`bg-(--quiet)`; prueba 14).

## Mapa

| Variable de shadcn | Valor | Oscuro → claro |
| --- | --- | --- |
| `--background`, `--sidebar` | `var(--surface)` | #151615 → #f3efeb |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--secondary-foreground`, `--accent-foreground`, `--sidebar-foreground`, `--sidebar-accent-foreground` | `var(--text)` | #e8e4e2 → #2e2926 |
| `--card` | `var(--surface-raised)` | rgba(33,34,33,.9) → rgba(255,255,255,.92) |
| `--popover` | `var(--ui-popover)` | rgba(43,44,43,.98) → rgba(255,253,251,.995) |
| `--primary-foreground`, `--sidebar-primary-foreground` | `var(--ui-on-primary)` | #151615 en los dos temas |
| `--secondary` | `var(--surface-soft)` | blanco 4,5 % → tierra 5,5 % |
| `--muted-foreground` | `var(--muted)` | #aaa19e → #746b67 |
| `--accent`, `--sidebar-accent`, `--border`, `--sidebar-border` | `var(--line)` | blanco 9 % → tierra 11 % |
| `--destructive` | `var(--danger)` | #ef7e70 → #be4f42 |
| `--input` | `var(--line-strong)` | |
| `--ring`, `--sidebar-ring` | `var(--ui-primary-text)` | #ff8d6c → #9c5947 (7,1:1 y 5,3:1 sobre la superficie) |
| `--sidebar-primary` | `var(--primary-bright)` | #ff5f35 |
| `--chart-1` a `--chart-5` | `--primary`, `--primary-soft`, `--primary-bright`, `--muted`, `--quiet` | |
| `--radius` | `16px` | `rounded-lg` (tarjetas, panel del sidebar, popover) |

Tokens `--ui-*` que la app añadió (HU-0016): `--ui-window*` (el marco de la ventana), `--ui-window-close` (cerrar de
Windows), `--ui-success` (#84ab8c → #3b7550 en claro; era #3f7a52, 4,46:1) y `--ui-warning` (#cf9a5e → #94601f), que dan `text-success`,
`bg-success`, `text-warning` y `bg-warning` al contexto «saludable» y «elevado» de una sesión. El «crítico» es `destructive`.

`@theme inline` añade: `--color-primary` = `--primary-bright`; `--color-muted` = `--surface-soft`;
`--color-muted-foreground` = `--muted`; `--color-primary-text` = `--ui-primary-text`; `--color-overlay` =
`--ui-overlay` (el velo de los diálogos); `--font-sans` y `--font-heading` = Inter; `--font-mono` = JetBrains
Mono; `--radius-xs/sm/md/lg/xl/2xl/3xl` = 4, 8, 12, `var(--radius)`, 16, 20 y 24 px.

## Añadir un `--ui-*`

1. Solo si la app no tiene ya un token con ese valor. Busca primero en `tokens.css`.
2. Declara el valor oscuro en `:root, .theme-dark` y el claro en `.theme-light`, con un comentario que diga de
   qué regla de la app sale. Un token de la propia app (`--surface`, `--line`…) va en `tokens.css`, con su valor
   claro.
3. Si hace falta una utilidad, mapéala en `@theme inline` (`--color-<nombre>: var(--ui-<nombre>)`).
4. Actualiza este mapa y la ficha de los componentes que lo usen.
