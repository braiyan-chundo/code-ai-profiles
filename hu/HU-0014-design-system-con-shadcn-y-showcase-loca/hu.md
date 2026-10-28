---
id: HU-0014
titulo: "Design system con shadcn y showcase local"
estado: en-proceso
fase: implementacion
area: interfaz
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: []
reglas: []
depende: [HU-0015]
---

# Design system con shadcn y showcase local

Como mantenedor de Code AI Profiles
quiero un catálogo de componentes shadcn/ui con el aspecto de la app y un showcase local donde verlos
para mejorar la interfaz después con piezas probadas en lugar de crear cada control a mano.

## Petición original

> «vamos a mejorar la ui, actualmente tenemos un design.md pero no tenemos un desgin system, me gustaria que pudieramos tener un showcase de componentes pero que sea algo mas local que no este en develop ni main, con esto podriamos mejorar un poco la interface, me gustaria que sea en base a shadcn pero que los componentes esten estilizandos al diseño de la app actual, y vas a seguir la metodologia, es decir instalar todos los componentes estilizarlos y dejar skill por cada uno con su indice» — Braiyan Rodriguez (mantenedor), 2026-10-28

Elecciones, en la misma conversación:

- Ubicación: «cambie de opinion, integremosla en el proyecto, pero por ahora la ruta solo se pueda abrir local».
- Estilos: «Tailwind 4 con tus tokens (Recomendado)».
- Componentes: «Todos (~50)».
- Skills: «Una skill con índice y fichas (Recomendado)».

Con eso quedan autorizadas: las dependencias de shadcn/ui (Tailwind 4, Radix y sus utilidades), la descarga
de los componentes desde el registro de shadcn y la excepción a la regla de frontend «no se migra a
Tailwind ni a shadcn/ui» para esta historia.

## Problema

La interfaz se construye a mano (`ModalFrame`, `ConfirmDialog`, `Metric`, `UsageMeter`…, repartidos por
features desde la HU-0015) con el CSS plano de `src/styles/`. `DESIGN.md` describe la paleta, la tipografía y la densidad, pero no
hay un sistema de componentes reutilizables ni un sitio donde verlos juntos. Cada control nuevo se
reinventa, y no hay una base para mejorar la interfaz de forma coherente.

## Alcance

- shadcn/ui con Tailwind 4 instalado en el proyecto, con **todo su catálogo** de componentes en
  `src/components/ui/`, y el alias `@/` que esperan sus importaciones.
- Un tema que mapea las variables de shadcn a los tokens de `src/styles/` y `DESIGN.md`, con modo
  oscuro (la base de la app) y claro.
- Un **showcase** con todos los componentes, sus variantes y sus estados, que solo se abre con el servidor
  de desarrollo (`pnpm dev`) y no llega al build de producción ni a los instaladores.
- Una skill `code-ai-profiles-ui` con un índice y una ficha por componente: para qué sirve, cómo se usa
  aquí, variantes y qué no hacer.
- Actualizar la skill `code-ai-profiles-frontend-react-vite` y `.metodo/reglas/frontend.md` para que
  convivan el CSS propio y los componentes nuevos.

## Fuera de alcance

- **Cambiar la interfaz de la app.** Ninguna pantalla actual pasa a usar los componentes nuevos; eso es la
  historia siguiente.
- Retocar `src/styles/` o los tokens de `DESIGN.md`.
- Abrir el showcase dentro de la app empaquetada o desde un menú.
- Componentes que no vengan del registro oficial de shadcn/ui.

## Decisiones por defecto (★)

- ★ **D-1 · El showcase es otra entrada de Vite.** Una página `showcase.html` que el servidor de desarrollo
  sirve en `http://127.0.0.1:1420/showcase.html` y que `vite build` no incluye. *Por qué:* aunque la app ya
  tiene router (HU-0015), el showcase necesita Tailwind con su reseteo (preflight); en una ruta de la app
  ese CSS entraría en el mismo documento y se quedaría aplicado a todas las pantallas al volver. Una página
  aparte lo aísla, y el build solo empaqueta `index.html`. *Alternativa:* una ruta `#/showcase` registrada
  solo con `import.meta.env.DEV`, cuando Tailwind ya conviva con la app.
- ★ **D-2 · Tailwind solo se carga en el showcase.** La app sigue cargando únicamente `src/styles/index.css`, de modo
  que el reseteo de Tailwind (preflight) no cambia nada de lo que existe. *Por qué:* fuera de alcance tocar
  la interfaz actual. *Alternativa:* cargarlo en la app sin preflight desde ya.
- ★ **D-3 · Los iconos internos de shadcn siguen en lucide-react.** Los componentes traen sus chevrons,
  checks y cierres de lucide; se dejan así. *Por qué:* reescribirlos en ~50 componentes no aporta al
  showcase. *Alternativa:* cambiarlos por los de `components/Icons.tsx`.
- ★ **D-4 · El tema de shadcn lee los tokens de la app.** `--background`, `--primary`, `--border`,
  `--radius`… se definen como `var(--surface)`, `var(--primary)`, etc., y no con valores sueltos. *Por qué:*
  un solo origen de color. *Alternativa:* copiar los valores de `DESIGN.md`.
- ★ **D-5 · Versiones fijadas.** La versión de la CLI de shadcn y de Tailwind quedan fijadas, y los
  componentes se versionan como código propio. *Por qué:* que el registro cambie no rompe nada.
  *Alternativa:* actualizarlos con la CLI cuando haga falta.

## Criterios de aceptación

### AC-01 · El showcase se abre en local

Con `pnpm dev`, al abrir `http://127.0.0.1:1420/showcase.html` aparece el showcase con un índice de
todos los componentes del catálogo de shadcn/ui y una sección por componente con sus variantes.

### AC-02 · Los componentes tienen el aspecto de la app

En el showcase, los componentes usan la tipografía (Inter, JetBrains Mono), los colores, los bordes, los
radios y la densidad de Code AI Profiles en lugar del aspecto por defecto de shadcn.

### AC-03 · Tema oscuro y claro

El showcase tiene un selector de tema: en oscuro los componentes se ven como la app en oscuro, y en claro
como la app en claro, sin textos ilegibles ni fondos sin contraste.

### AC-04 · El showcase no llega a la app empaquetada

Tras `pnpm build`, `dist/` no contiene el showcase ni Tailwind. La app (`pnpm dev` en `/` o
`pnpm tauri dev`) se ve exactamente igual que antes de esta historia.

### AC-05 · Una skill con índice y una ficha por componente

Existe la skill `code-ai-profiles-ui` con un índice de todos los componentes y una ficha por cada uno.
La skill de frontend y las reglas del rol indican cuándo usar los componentes nuevos y cuándo el CSS
propio.

## Reglas de negocio afectadas

Ninguna: la historia no cambia lo que hace la app para la persona usuaria.

## Para la persona usuaria

1. **D-1**: el showcase como página aparte (`/showcase.html`) en lugar de una ruta dentro de la app.
2. **D-3**: los iconos internos de los componentes son de lucide, no los propios de la app.
3. **D-2**: Tailwind todavía no se carga en la app; se carga cuando la historia siguiente adopte los
   componentes.

**Pendiente humano:** revisar en el showcase que los componentes «se sienten» como la app, en oscuro y en
claro. Esa es una apreciación visual que solo hace la persona.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0014`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

Fecha, quién cerró y sobre qué veredicto.

SHA por repositorio, con una línea de qué hace cada uno:

★ aceptadas tal como estaban:

Pendientes humanos (nadie los vio; no se dan por hechos):

Deuda declarada:
