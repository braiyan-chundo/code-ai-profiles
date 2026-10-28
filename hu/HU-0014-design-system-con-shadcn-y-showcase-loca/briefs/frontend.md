# Brief · HU-0014 · frontend

Criterios: AC-01 a AC-05. **Modelo: sonnet**, porque no toca dinero, estados, permisos, sesión, migraciones,
datos personales ni concurrencia. El riesgo es el aislamiento, y se mide con hashes.
Contrato: `arquitectura.md`, secciones Decisiones (A-1 a A-9), Archivos, Dependencias, Aislamiento de Tailwind, Mapa de
tokens, Ajustes (lista cerrada), Catálogo, Showcase, Skill, Pruebas y Secuencia. Sin versión: es interno y estamos en 0.x.
Rama `hu-0014-design-system`. Sin push.

## Archivos

Rutas de partida comprobadas: `vite.config.ts`, `tsconfig.json`, `package.json`, `index.html`, `src/main.tsx` (de ahí
salen las fuentes; no se toca), `src/styles/{base,theme-light,index}.css`, `.github/workflows/validate.yml`,
`.metodo/reglas/frontend.md` y `.claude/skills/code-ai-profiles-frontend-react-vite/SKILL.md` (170 líneas). Los
nuevos, en § Archivos de `arquitectura.md`.

## Pasos (los de § Secuencia; un commit por paso con el trailer `HU: HU-0014`)

0. **Línea base**, sin commit: `pnpm build`, luego `find dist -type f | sort | xargs shasum -a 256 > <scratch>/dist-antes`.
   Con `pnpm dev` levantado, `curl -s "http://127.0.0.1:1420/src/styles/index.css?direct" | shasum -a 256`. Las dos
   salidas van fuera del repo.
1. `pnpm add -D -E tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 shadcn@4.22.1 tw-animate-css@1.4.0`. Luego
   `pnpm ignored-builds`: si sale algo, **paras** y lo devuelves (`allowBuilds` no se toca sin el mantenedor).
   `vite.config.ts` con la forma de A-1, `tsconfig.json` con `paths` (sin `baseUrl`), `components.json` literal,
   `showcase.html` y un `src/showcase/` mínimo (`main.tsx` y `showcase.css` con `@import "tailwindcss" source(none)` +
   `@source "./"`). Compruebas: `dist/` idéntico a la línea base, CSS de `/` idéntico y `/showcase.html` con un botón
   hecho con utilidades.
2. `pnpm exec shadcn add --all --yes` (**nunca `--overwrite`**). Con `git status`, revierte todo lo que no esté en
   § Archivos y descarta lo que la CLI escriba en `showcase.css`. Aplica A-6 (`sonner.tsx` con `theme` por props
   y luego `pnpm remove next-themes`), A-7 (mover `src/lib/highlighter.tsx` a `src/hooks/` y arreglar su import) y A-8
   (las dependencias nuevas, exactas según el lockfile). Comprueba que hay 63 componentes, la lista frente a
   § Catálogo y estas búsquedas: `rg -n "IconPlaceholder|@/registry|next-themes" src` vacío;
   `rg -n "\bcn-(menu|rtl|font|logical)" src/components/ui` (anota lo que quede). Después `pnpm build` y `dist/` idéntico.
3. `src/styles/ui-theme.css` según § Mapa de tokens (cada `--ui-*` con un comentario que diga de qué regla sale),
   `showcase.css` definitivo según § Aislamiento y los ajustes 1 a 3 de la lista cerrada. Compruebas botón, input,
   diálogo y menú en oscuro y claro, y `dist/` idéntico.
4. El showcase de § Showcase: `catalog.ts` como única lista, una sección por componente con variantes, estados y
   composición, y los casos especiales (sidebar en un marco con `transform`, avatar sin URL…). Puedes hacer un commit
   por grupo. La consola, sin errores. En la pestaña Red, solo `127.0.0.1`.
5. La skill `code-ai-profiles-ui` según § Skill. Las fichas, con código que compile de verdad. Luego
   `node .metodo/scripts/metodo.mjs validar`.
6. `.metodo/reglas/frontend.md` y la skill de frontend según § Reglas y skill de frontend (170 líneas o menos). No
   corres `metodo.mjs generar`: lo hace el orquestador.
7. `tests/ui-isolation.test.ts` (las 4 comprobaciones de § Pruebas), el script `"test:ui": "node --test
   tests/ui-isolation.test.ts"` y su paso en `.github/workflows/validate.yml`, después de `test:messages`.
8. Cierre, sin commit: lo de la fila 8 de § Secuencia, incluido `rm -rf node_modules && pnpm install --frozen-lockfile
   && pnpm build`.

Si en el paso 2 un componente no compila y el arreglo no es mínimo, o si `dist/` cambia en cualquier paso, **paras y
lo devuelves** con el `git diff pnpm-lock.yaml` de vite, react, rollup y esbuild.
**Variables de entorno nuevas:** ninguna. Nadie lee `import.meta.env`. `components.json` va sin `$schema`, para no
meter una URL en el repo.

## Pruebas

Añades `tests/ui-isolation.test.ts`. Las relacionadas:
`node .metodo/scripts/pruebas.mjs relacionadas code-ai-profiles <archivos>`, más `pnpm build` y `pnpm test:ui`. La
suite la corre el orquestador. La entrada `test:ui` de `stack.comandos` (`.metodo/config.json`) también es suya.

## Entrega

- Los hashes de `dist/` antes y después (iguales), el del CSS de `/` en desarrollo, `rg -l "tailwindcss|--tw-" dist`
  vacío y `ls dist`.
- La lista de componentes instalados y su diferencia con § Catálogo.
- `pnpm ignored-builds`, las versiones exactas añadidas y los ajustes hechos a componentes, con su motivo.
- AC-01 a AC-03, marcados solo con lo que viste. Lo que no viste, declarado como «no visto».

## Si dudas

`docs/arquitectura/frontend.md` (Reglas de dependencias, Estilos, Design system); `arquitectura.md` de esta historia;
`graphify query "styles index tokens theme-light"`; el código de la CLI con `pnpm exec shadcn add <id> --dry-run` o
`--view`. Ante lo que no esté escrito, preguntas: no improvises tokens ni colores.

## No toques

`src/main.tsx`, `index.html`, `src/styles/{index,base,theme-light,animations,responsive}.css`, `src/app/`,
`src/features/`, `src/components/*.tsx|css`, `src/lib/` (salvo crear `utils.ts`), `src/types.ts`, `src-tauri/`,
`DESIGN.md`, `pnpm-workspace.yaml`, `docs/arquitectura/` (si la realidad difiere, avisa a architect) y
`.metodo/config.json`. No corras `shadcn init`. Nada de `localStorage`, `bridge` ni red en el showcase.

**Skills:** `code-ai-profiles-frontend-react-vite`, `code-ai-profiles-configuracion`, `code-ai-profiles-pruebas`.
