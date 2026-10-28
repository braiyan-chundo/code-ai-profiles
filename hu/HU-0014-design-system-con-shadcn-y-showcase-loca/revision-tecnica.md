# Revisión técnica · HU-0014 · Design system con shadcn y showcase local

**Veredicto: FAIL**, por un solo bloqueo (R-1). La prueba `tests/ui-isolation.test.ts` es la única guarda
automática del riesgo principal (Tailwind o el catálogo dentro de la app), y tiene dos problemas: en Windows da
falsos verdes y no detecta un import de Tailwind fuera de las dos entradas. Lo demás está bien. La app no cambia
(ni `index.html`, ni `src/main.tsx`, ni `src/styles/{index,base,theme-light,…}.css`, ni `app/`, `features/`,
`components/*.tsx` o `lib/`, salvo `utils.ts`). El tema coincide con la tabla, los ajustes se quedan en la lista
cerrada, el lockfile no mueve nada de lo que ya existía y el showcase no hace peticiones de red ni usa
almacenamiento local. Arreglada la R-1, el veredicto pasa a PASS sin otra revisión completa: basta con revisar el
diff de la prueba y de `validate.yml`.

Revisado el 2026-10-28 sobre la rama `hu-0014-design-system`, de `aaf5602` a `2de3ff4`.

**Pruebas.** `pruebas.mjs estado`: «HEAD 2de3ff4 sin suite en verde · 7 SHA registrados». No he corrido pruebas.
La suite la corre el orquestador después de arreglar la R-1. `config.mjs check` sobre los 134 archivos de `src/`
del diff: en orden.

## Método

- Leí entero todo lo que no viene literal del registro: `vite.config.ts`, `tsconfig.json`, `package.json`,
  `components.json`, `showcase.html`, `src/showcase/{main,Showcase,ShowcaseSection,catalog}`, `showcase.css`,
  `ui-theme.css`, `src/hooks/*`, `src/lib/utils.ts`, la prueba, `validate.yml`, `.metodo/reglas/frontend.md`,
  `.metodo/config.json`, el diff de la skill de frontend y la ficha de `sidebar`. Como muestra, `message.tsx`.
- Ajustes: el diff de `ce5dc92` en `components/ui` (10 archivos) contra la lista cerrada, y `sonner.tsx` y
  `highlighter` en `24d0ef5`. Busqué restos (`text-primary` sin sufijo, `var(--muted)`, `bg-black`,
  `IconPlaceholder`, `@/registry`, `next-themes`, `cn-*`) y no queda ninguno.
- Recuento: 63 componentes, 63 secciones y 63 fichas, con los mismos nombres. Las 12 fichas que declaran
  diferencias son justo las 12 que se ajustaron.
- Lockfile: comparé los `snapshots` de `aaf5602` y de HEAD por nombre y versión. Revisé el código de Vite 6.4.3
  instalado (`resolve`, `computeEntries`) y los scripts de instalación en `node_modules/.pnpm`.

## Los cinco puntos pedidos

**1 · Alias `"@": "/src"`. Correcto en las tres plataformas.** En el `resolve` de Vite 6.4.3 (`asSrc: true` en
`serve` y en `build`), un id que empieza por `/` se resuelve con `path.resolve(root, id.slice(1))` antes que
cualquier otra cosa. En Windows, `"/src/…"` nunca empieza por `C:/…`, así que entra en esa rama y
`path.resolve` lo convierte en `C:\…\src\…`. El escáner de dependencias usa el mismo resolvedor. Además,
`vite build` no llega a usar `@/`, porque nada de lo que importa `index.html` lo menciona. No hace falta
`fileURLToPath`: solo la necesitaría una herramienta que no fuera Vite (R-2).

**2 · Tailwind solo en `serve`.**
- En `vite build` (y por tanto en `tauri build`), `command` vale `"build"`: el `import()` no se ejecuta y el
  plugin no existe. Como no hay `build.rollupOptions.input`, la entrada sigue siendo solo `index.html`, así que
  `showcase.html` no se compila. Lo que sí revisa es `tsc` (`pnpm build` = `tsc && vite build`), que comprueba los
  tipos de `src/showcase` y `components/ui`. Eso es lo que se quiere.
- En `pnpm dev` y `pnpm tauri dev` el plugin está cargado, pero no toca un CSS sin directivas. Lo confirma que el
  CSS de `/` sale con el mismo hash. Hay un efecto que no se veía: el optimizador de dependencias recorre todos los
  `*.html` de la raíz y preempaqueta las dependencias del catálogo aunque solo se abra la app (R-3). Los binarios
  nativos de `@tailwindcss/oxide` y `lightningcss` están en el lockfile para darwin-arm64, win32-x64 y linux
  x64/arm64 (gnu y musl), y además el fallback wasm. Ninguno tiene scripts de instalación.

**3 · Dependencias de runtime en `dependencies`. Los instaladores no cambian.** `tauri build` empaqueta solo
`frontendDist` (`../dist`), que es idéntico byte a byte, así que el tamaño de los instaladores no se mueve. El coste
está en CI y en local (R-4): `node_modules/.pnpm` ocupa 357 MB y el lockfile pasa de 136 a 569 paquetes. Los más
pesados son lucide-react (46 MB), date-fns (26), @base-ui/react (20), ts-morph y su common (12), @shikijs/langs
(11), recharts (8) y el SDK de MCP (6, por `shadcn`). Cada runner de `build-desktop.yml` y `validate.yml` descarga
más, y `tsc` comprueba los tipos de 63 componentes más (con `skipLibCheck: true`). Ponerlas en `dependencies` es lo
correcto: son de runtime para cuando la app adopte el catálogo, y a Vite le da igual el campo.

**4 · La prueba de aislamiento. Bloquea (R-1).** Detecta bien un import de `components/ui`, `@/hooks`,
`lucide-react` o `radix-ui` desde `app/`, `features/`, `lib/` o `components/*.tsx`, pero solo en macOS y Linux.
Fallos:
- **En Windows da un falso verde.** `relative()` devuelve `features\scan\…`, y `startsWith("features/")` es falso.
  Lo comprobé con `path.win32`: de toda la app solo revisa los 6 archivos de `src/components/*.tsx`. La aserción
  `files.length > 0` se cumple igual. Pasa lo mismo con el destino de los imports relativos (`target`) y con el
  `skip` (`+ "/"`).
- **No detecta una fuga de Tailwind fuera de las dos entradas.** No busca `tailwindcss`, `@tailwindcss/*`,
  `tw-animate-css`, `shadcn`, `showcase` ni `ui-theme` en los specifiers. Tampoco recorre `src/styles/*.css`
  (salvo el texto de `index.css`) ni `src/components/*.css`. Con `@import "tailwindcss"` en `base.css` o en
  `buttons.css`, o con `import "@/styles/ui-theme.css"` en una feature, la prueba pasa. También pasa si
  `src/main.tsx` importa `@/components/ui/…`, porque la prueba 1 no busca esa cadena.
- **La prueba 3 no ve la forma corta de Tailwind 4**: `bg-(--muted)` sortea el `includes("var(--muted)")`.

Parte del hueco viene de mi propia § Pruebas, que solo pedía cuatro comprobaciones. El arreglo es de frontend.

**5 · Privacidad y red. Correcto.** En `src/showcase`, `components/ui`, `hooks`, `lib/utils.ts` y `ui-theme.css` no
hay URLs, `fetch`, `XMLHttpRequest`, `WebSocket`, `localStorage`, `sessionStorage`, `bridge`, `@tauri-apps/*` ni
`import.meta.env`. Shiki usa `createJavaScriptRegexEngine` y carga las gramáticas y los temas con `import()` desde
`node_modules`, sin CDN. El avatar solo usa `AvatarFallback`, las fuentes son `@fontsource` y los textos son de
ejemplo («Perfil de ejemplo», «Mensaje de muestra, sin contenido real»), sin rutas ni credenciales. El único acceso
a `navigator` es `clipboard.writeText` en `code-block`, y solo al pulsar el botón. Hay una salvedad que no bloquea
(R-5): `sidebar.tsx` escribe una cookie de estado.

## Observaciones

| | Bloquea | Dónde | Qué | Qué hacer | Responsable |
| --- | --- | --- | --- | --- | --- |
| R-1 | **Sí** | `tests/ui-isolation.test.ts`, `.github/workflows/validate.yml` | Lo del punto 4: falso verde en Windows y fugas de Tailwind sin detectar | (a) Normalizar las rutas: `const local = relative(src, path).split(sep).join("/")`, y lo mismo en `target` y en `skip`. (b) Invertir el alcance: recorrer **todo `src/`** salvo `components/ui/`, `hooks/`, `showcase/`, `lib/utils.ts` y `styles/ui-theme.css`, y en cada `.ts`, `.tsx` o `.css` rechazar los specifiers `^(tailwindcss\|@tailwindcss/\|tw-animate-css\|shadcn\|lucide-react\|radix-ui\|class-variance-authority\|cn)(/\|$)`, `^@/(components/ui\|hooks\|showcase\|lib/utils\|styles/ui-theme)` y los relativos que resuelvan ahí. Así quedan cubiertos `main.tsx`, `styles/*.css` y `components/*.css`. (c) En la prueba 3, la regex `/\(--muted\)/`, que cubre `var(--muted)` y `(--muted)`. (d) Una prueba canario que pase a `specifiers()` y al predicado un texto con `@import "tailwindcss"` y otro con `import "@/components/ui/button"`, y compruebe que los marcan. (e) En `validate.yml`, después de «Build frontend», un paso `! grep -rqE "tailwindcss\|--tw-" dist && test ! -e dist/showcase.html`. Es la guarda directa del AC-04, la misma que el paso 8 hizo a mano. La historia que adopte el catálogo cambiará (b) y (e) a propósito | frontend |
| R-2 | No | `vite.config.ts` | `"@": "/src"` es una ruta relativa a la raíz de Vite y funciona en `serve` y `build`, también en Windows (punto 1). Solo la entienden Vite y `tsc` | Nada. Si una herramienta que no sea Vite necesita `@/`, se usa `fileURLToPath(new URL("./src", import.meta.url))`. Queda en `docs/arquitectura/frontend.md` | — |
| R-3 | No | Vite en `serve` | Sin `optimizeDeps.entries`, el escáner recorre `**/*.html`: `showcase.html`, `index.html`, `code.html` y `graphify-out/graph.html`. `pnpm tauri dev` preempaqueta radix-ui, recharts, shiki… El arranque en frío es más lento. Si al abrir el showcase aparece una dependencia nueva, Vite vuelve a optimizar y recarga todas las pestañas, también la ventana de Tauri. Es la causa probable del «Invalid hook call» de la primera carga | Nada en esta historia: limitarlo a `index.html` haría que el showcase descubriera sus dependencias tarde y empeoraría las recargas. Queda documentado | — |
| R-4 | No | `package.json`, CI | Instaladores iguales (dist idéntico). Más peso en `pnpm install` en 4+1 runners y en la caché de pnpm. Ningún paquete previo cambió de versión: 12 transitivos ganan una segunda versión y ninguno pierde la suya. `vite` sigue en 6.4.3, con esbuild 0.25.12, rollup 4.62.2 y postcss 8.5.19, pero ahora su snapshot resuelve los pares opcionales `jiti` y `lightningcss`. Vite no los usa sin `css.transformer: "lightningcss"`, y el hash de `dist/` lo confirma. Solo `esbuild` tiene script de instalación y ya está en `allowBuilds` | Nada. Si el tiempo de CI molesta, la palanca es `shadcn` (ts-morph, babel, MCP), que solo sirve para `add` | — |
| R-5 | No | `src/components/ui/sidebar.tsx:85,107`, ficha `sidebar.md` | Escribe la cookie `sidebar_state` (7 días, `path=/`) en `127.0.0.1:1420` y registra Cmd/Ctrl+B en `window`. En el showcase es inocuo (solo guarda si está abierto o cerrado), pero es persistencia, y la ficha no lo dice. En la app, la cookie quedaría en los datos del webview | Añadir a `sidebar.md`, en «Qué no hacer», una línea sobre la cookie y el atajo. La historia que lo adopte la quita o la justifica. Ya está anotado en `docs/arquitectura/frontend.md` | frontend (puede ir con R-1) |
| R-6 | No | Adopción futura | Tailwind 4 y el registro usan `@property`, `color-mix` y `oklch(from …)` (`bubble.tsx`), que piden Safari 16.4 o superior. La app declara `minimumSystemVersion: 12.0` en macOS, y Linux usa WebKitGTK en Ubuntu 22.04 | Nada ahora: el showcase se abre en un navegador. La historia que lo adopte comprueba el WebKit mínimo. Anotado en `docs/arquitectura/frontend.md` | — |
| R-7 | No | `graphify-out/` | El grafo creció unas 69 000 líneas con 63 componentes y 63 secciones. Las secciones del showcase no aportan al análisis de impacto | Que lo decida el mantenedor: `src/showcase/sections/` en `.graphifyignore`. `components/ui` debe quedarse, porque lo importará la app | orquestador |
| R-8 | No | `src/showcase/ShowcaseSection.tsx:2` | Importa `cn` de `"cn"` y no de `@/lib/utils`, como hace el resto | Cosmético. Se cambia si se toca el archivo | frontend |

## Lo que comprobé y está bien

- `vite.config.ts` tiene la forma de A-1 y conserva `server` tal cual. `tsconfig.json` lleva `paths` sin `baseUrl`.
  `components.json` es literal y sin `$schema`. `showcase.html` usa `<link rel="icon" href="data:,">`, sin URL.
- `showcase.css` es literal de § Aislamiento. `ui-theme.css` coincide con la tabla, fila a fila: no declara
  `--primary` ni `--muted`, los `--ui-*` llevan su regla de origen y los tres selectores están.
- Los ajustes 1 a 5 están todos, y nada fuera de la lista. El 6 (arreglos para que `tsc` compile) no se usó.
- `src/lib/utils.ts` no importa React. `src/hooks/highlighter.tsx` está fuera de `lib/` (A-7).
- La regla de frontend, la skill (170 líneas) y `.claude/agents/frontend.md` (regenerado) dicen lo mismo.
  `test:ui` está en `relacionadas` y en `suite`, y su paso en `validate.yml` funciona sin `node_modules`, porque
  solo usa `node:fs`.

## Documentos de arquitectura

En `docs/arquitectura/frontend.md`, § Design system, añadí lo que el código hace y no estaba escrito: la entrada
única de `vite build`, el escáner de dependencias en `serve` (R-3), cómo se resuelve el alias (R-2) y, en
«Adoptarlo en la app», la base de navegadores (R-6) y la cookie de `sidebar` (R-5). Cuando se arregle la R-1, la
frase «Lo vigila `tests/ui-isolation.test.ts`» de § Reglas de dependencias sigue siendo cierta y no hay que
cambiarla.
