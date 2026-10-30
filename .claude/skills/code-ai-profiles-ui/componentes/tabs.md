# Pestañas (`tabs`)

## Para qué

Cambia entre vistas de un mismo contenido.

## Cuándo sí / cuándo no

**Sí**
- Cambiar entre vistas de un mismo contenido sin salir de la pantalla.

**No**
- Para navegar entre pantallas: rutas y `Link`. Para elegir un filtro corto: `ToggleGroup`.
- Hoy no lo usa ninguna pantalla de la app (sí el showcase). Si una lo adopta, se usa con el tema de `ui-theme.css`, sin CSS propio.

## Importación

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants } from "@/components/ui/tabs"
```

## Uso mínimo

Compila tal cual (`pnpm exec tsc`); los textos son de ejemplo.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function Ejemplo() {
  return (
    <Tabs defaultValue="uno">
      <TabsList>
        <TabsTrigger value="uno">Cuenta</TabsTrigger>
        <TabsTrigger value="dos">Sesiones</TabsTrigger>
      </TabsList>
      <TabsContent value="uno">Contenido uno</TabsContent>
      <TabsContent value="dos">Contenido dos</TabsContent>
    </Tabs>
  )
}
```

## Variantes y tamaños

`TabsList` `variant`: `default`, `line`. `orientation`: horizontal o vertical.

## Estados

`disabled` en un `TabsTrigger`; pestaña activa con `data-state="active"`.

## Accesibilidad

Radix pone los roles `tablist`, `tab` y `tabpanel` y las flechas del teclado.

## Tokens que usa

- `--background`, `--foreground`, `--input`, `--muted` (`text-muted-foreground`), `--ring`, `--surface-soft` (`bg-muted`)
- Además: `--radius-*`.

Los valores salen de `src/styles/ui-theme.css`; consulta `../tema.md`.

## Diferencias con el registro

Ajuste HU-0022 (A-1 y A-2): la lista pierde el relleno `bg-muted` y se queda con un anillo (`ring-1 ring-inset ring-(--line-strong)`: el relleno daba 4,13:1 al texto inactivo en claro), con `h-(--ctl)`, `p-1`, `gap-1` y `rounded-md` (12); cada pestaña llena la lista (`h-full`), con `gap-2 px-3`, `rounded-sm` (8, anidado: 12 − 4), `leading-(--lh-body)` y texto `text-muted-foreground`. La activa toma `bg-card` (en oscuro `bg-accent`) y su propio anillo. El foco es un contorno de 2 px (`outline-2 outline-ring`), no un anillo, para no chocar con el de la activa. En la app las usa `SettingsRoute`, controladas por la ruta (`value` y `onValueChange → navigate`), con un `TabsContent` por sección.

## Qué no hacer

- No esconder contenido crítico en una pestaña no activa.
- No regenerar con `pnpm exec shadcn add tabs --overwrite`: es código propio y se perderían los ajustes.

## En el showcase

`http://127.0.0.1:1420/showcase.html#tabs` (con `pnpm dev`).
