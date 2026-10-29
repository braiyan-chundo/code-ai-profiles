---
name: {{SLUG}}-frontend-react-vite
description: Cómo se construyen las apps de {{PROYECTO}} con React + Vite + TypeScript, shadcn/ui, Tailwind, Zustand, TanStack Query, lucide-react y Socket.IO - estructura, estado, datos del servidor, tiempo real, formularios y pruebas. Cárgala antes de escribir o cambiar cualquier pantalla, hook o componente.
---

# React + Vite · {{PROYECTO}}

<!-- Pack frontend-react-vite, forjado desde la documentación oficial el 2026-10-24. Sin revisar en proyecto.
     Las versiones exactas las fija el ADR del stack; lo de aquí vale para TanStack Query v5, Zustand v5,
     Tailwind v4 y shadcn/ui actual. -->

## La regla de oro

**Cada dato vive en un solo sitio.** Lo que viene del servidor vive en **TanStack Query**; lo que es
solo de la interfaz (filtro abierto, paso del asistente, tema) vive en **Zustand** o en el estado local.
Nunca se copia una respuesta del servidor a un store de Zustand: se desincroniza y nadie sabe cuál es
la verdad.

## La estructura

```text
src/
  config.ts              el ÚNICO sitio que lee import.meta.env (validado con zod)
  main.tsx  App.tsx      providers: QueryClientProvider, router, tema, socket
  components/ui/         los de shadcn (se generan con su CLI y se adaptan a los tokens: son nuestros)
  components/            componentes propios reutilizables, sobre los de ui/
  features/<dominio>/    por dominio: api.ts (llamadas), queries.ts (hooks de Query), componentes, store.ts si hace falta
  pages/ o routes/       una por ruta; componen features, no hacen fetch directo
  lib/                   http.ts (cliente), socket.ts, utils (cn)
  stores/                stores de Zustand globales (pocos)
```

Los componentes de `components/ui/` se estilizan **una vez**, con los tokens del sistema de diseño; una
pantalla no los reestiliza con clases sueltas. Si hace falta una variante, se añade al componente
(`cva`), con su skill `<slug>-ui-<id>` y su línea en el índice de componentes.

## El módulo de configuración

```ts
// src/config.ts
import { z } from "zod";
const esquema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_SOCKET_URL: z.string().url(),
});
const env = esquema.parse(import.meta.env);   // si falta una variable, la app no arranca y dice cuál
export const config = { apiUrl: env.VITE_API_URL, socketUrl: env.VITE_SOCKET_URL } as const;
```

- Todo lo que lleva `VITE_` **acaba en el navegador**: solo `[PUBLICO]`. Un secreto nunca va aquí; si la
  app lo necesita, lo pide al servidor.
- El resto del código importa `config`. Nunca `import.meta.env` suelto, nunca una URL escrita.

## Datos, estado y tiempo real

Lo que no toda app necesita vive en archivos aparte de esta skill; **ábrelos solo si la tarea lo pide**:

- `datos-y-estado.md`: TanStack Query (fábrica de claves, mutaciones, invalidación, estados de carga) y
  Zustand (estado de interfaz, selectores, `persist`). Cuando la pantalla lea o escriba datos del servidor.
- `tiempo-real.md`: Socket.IO (un socket, token en cada reconexión, eventos que actualizan la caché,
  dos clientes al probar). Solo si la app usa sockets.

Una landing sin servidor no abre ninguno de los dos.

## Formularios

`react-hook-form` + `zod` (el componente `Form` de shadcn lo usa). El esquema de zod refleja el DTO de
entrada del servidor; los errores del servidor se muestran en el campo que corresponde.

## Iconos y estilos

- Iconos de `lucide-react`, importados uno a uno (`import { Trash2 } from "lucide-react"`), con tamaño de
  los tokens. Un botón solo con icono lleva `aria-label`.
- Tailwind con los tokens del sistema de diseño como variables CSS; nada de colores arbitrarios
  (`bg-[#3b5bdb]`) ni medidas sueltas. `cn()` para combinar clases.

## Lo que nunca

- Fetch dentro de un componente de página o en un `useEffect`: va en un hook de Query.
- Datos del servidor dentro de Zustand.
- Una URL, un token (aunque sea público de solo lectura) o un ID de servicio escrito en el código.
- `any` para tipar una respuesta.
- Reestilizar un componente de `ui/` dentro de una pantalla.

## Lo que no se toma prestado

- Redux, `useEffect` + `useState` para datos remotos, o SWR: aquí es TanStack Query.
- Next.js (`"use client"`, `getServerSideProps`, rutas de API): esto es Vite, una SPA.
- Variables `REACT_APP_*` de Create React App: en Vite son `VITE_*` y se leen en `config.ts`.

## Pruebas

Vitest + Testing Library. Se prueba lo que ve el usuario (roles y textos), no la implementación. Para
datos del servidor, MSW o un cliente de Query de prueba por test.

```bash
node .metodo/scripts/pruebas.mjs relacionadas <repo> <archivos>
```

## Skills relacionadas

`{{SLUG}}-diseno` y `{{SLUG}}-componentes` (al construir una pantalla) · `{{SLUG}}-configuracion` ·
`{{SLUG}}-tiempo-real` (si hay sockets) · el contrato en `{{SLUG}}-contratos`, si existe.
