---
id: HU-0016
titulo: "Rediseño con sidebar, dashboard y página por instancia"
estado: terminada
fase: cierre
area: interfaz
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: false }
repos: [code-ai-profiles]
riesgo: [estados]
reglas: []
depende: [HU-0014, HU-0015]
---

# Rediseño con sidebar, dashboard y página por instancia

Como mantenedor de Code AI Profiles
quiero navegar la app desde un sidebar con un dashboard y una entrada por cada Claude clonado
para ver el estado de todo de un vistazo y llegar a cada instancia sin buscarla en una cuadrícula.

## Petición original

> «ok, ahora me gustaria que en base a los nuevos componentes, se cree una historia de rediseño de la app para que quede con mejor uso, me gustaria ahora un sidebar con un dashboard y que aparte el sidebar se coloque cada claude clonado» — Braiyan Rodriguez (mantenedor), 2026-10-28

Elecciones, en la misma conversación:

- Dashboard: «Resumen global (Recomendado)»: métricas de todas las instancias con accesos rápidos; el
  detalle de cada instancia pasa a su página.
- Instancia en el sidebar: «Página propia (Recomendado)»: `#/instancias/<id>` con estado, versión, uso,
  sesiones y acciones.
- Aplicación original: «Arriba de los clones (Recomendado)»: su propia entrada y su página.

Queda autorizado usar en la app el catálogo de la HU-0014, y con él cargar Tailwind en la app.

## Problema

Hoy la app es una sola pantalla: una barra de herramientas con búsqueda y, debajo, la sección de la
aplicación original y una cuadrícula de tarjetas, una por instancia, cada una con su uso, sus sesiones y
todas sus acciones. Con varias instancias, la pantalla se alarga, el resumen («cuántas están en marcha»,
«cuál va a quedarse sin uso», «qué hay que actualizar») no existe como tal, y llegar a una instancia
concreta exige buscarla. Las piezas son CSS propio hecho a mano; el catálogo de la HU-0014 existe pero
ninguna pantalla lo usa.

## Alcance

- Un **sidebar** permanente con: Dashboard, la aplicación original y la lista de instancias clonadas (nombre,
  icono y estado), más «Nueva instancia», «Escanear sistema» y «Apariencia». Se puede plegar.
- Un **dashboard** (`#/`) con el resumen global y accesos rápidos, y los avisos que hoy viven en el panel
  (actualización oficial, sincronización, escaneo, resultados).
- Una **página por instancia** (`#/instancias/<id>`) y una para la **aplicación original** (`#/original`)
  con todo lo que hoy hacen su tarjeta y su sección.
- La app pasa a construirse con los componentes de `src/components/ui`, con el aspecto actual de la app
  (tokens de `DESIGN.md`), en oscuro, claro y sistema.
- Actualizar `DESIGN.md`, `docs/arquitectura/frontend.md`, las skills de frontend y de UI, y las reglas del rol.

## Fuera de alcance

- Datos nuevos: el dashboard y las páginas usan lo que ya trae `DashboardState`. Ningún comando IPC nuevo ni
  cambio en `src/types.ts`, `bridge.ts` o Rust.
- Cambiar qué hacen las acciones (abrir, detener, editar, borrar, transferir, actualizar, escanear): solo
  dónde están y cómo se ven.
- Gráficas históricas de uso: no hay historial guardado.
- Cambiar la paleta, la tipografía o la identidad de `DESIGN.md`.

## Decisiones por defecto (★)

- ★ **D-1 · Tailwind entra en la app y el CSS propio se retira.** Las pantallas se rehacen con el catálogo;
  lo que queda sin uso en `src/styles/` y `src/components/` se borra. `ui-theme.css` pasa a ser el tema de
  la app. *Por qué:* dos sistemas a la vez duplican primitivas. *Alternativa:* convivencia, migrando por
  partes en varias historias.
- ★ **D-2 · El sidebar es el componente `sidebar` del catálogo**, plegable a iconos, sin la cookie
  `sidebar_state` ni el atajo global Cmd/Ctrl+B que trae; el estado plegado se guarda con las preferencias de
  apariencia. *Por qué:* la app no usa cookies y el atajo choca con los de la app. *Alternativa:* un sidebar
  propio.
- ★ **D-3 · Rutas:** `#/` dashboard, `#/original` y `#/instancias/<id>`. Un id que no existe, o una instancia
  borrada mientras se mira, vuelve al dashboard. Los diálogos (editor, transferir, borrar, actualizar,
  apariencia) siguen siendo diálogos. *Por qué:* una página por cosa que se mira, y un diálogo por cosa que
  se hace. *Alternativa:* pestañas dentro de cada página.
- ★ **D-4 · El tema va en `<html>`**, de modo que menús, diálogos y avisos flotantes (que Radix pinta en
  `body`) siguen el tema claro u oscuro. *Por qué:* es la deuda de la HU-0014. *Alternativa:* un contenedor
  de portales dentro del shell.
- ★ **D-5 · Iconos:** lucide en toda la interfaz; se conservan los iconos propios de cada instancia y la
  marca. *Por qué:* un solo juego de iconos. *Alternativa:* mantener `components/Icons.tsx` en la app.
- ★ **D-6 · Resumen del dashboard:** instancias totales y en marcha; uso de sesión y semanal por instancia,
  ordenado de más a menos; avisos de actualización y sincronización; almacenamiento total; y accesos a
  «Nueva instancia» y «Escanear sistema». *Por qué:* es lo que hoy hay que reunir mirando tarjeta a tarjeta.
  *Alternativa:* lo decide la persona al probar.

## Criterios de aceptación

### AC-01 · Sidebar con todo lo navegable

Al abrir la app hay un sidebar con «Dashboard», la aplicación original y una entrada por cada instancia
clonada con su nombre, su icono y si está en marcha o detenida. Pulsar una entrada abre su página. Una
instancia nueva, editada o borrada aparece, cambia o desaparece del sidebar sin recargar. El sidebar se
pliega a iconos y conserva el estado al reabrir la app.

### AC-02 · Dashboard con el resumen global

`#/` muestra cuántas instancias hay y cuántas están en marcha, el uso de sesión y semanal de cada una
ordenado de más a menos, el almacenamiento total, y los avisos de actualización oficial, sincronización,
escaneo y resultados que hoy salen en el panel. Desde ahí se puede crear una instancia y escanear.

### AC-03 · Página de cada instancia

`#/instancias/<id>` muestra el estado, la versión, el uso y las sesiones de esa instancia con su contexto, y
permite todo lo que hoy permite su tarjeta: abrir, detener, abrir la carpeta, editar, borrar (detenida) y
copiar, mover o devolver sesiones. Un id desconocido vuelve al dashboard.

### AC-04 · Página de la aplicación original

`#/original` muestra la aplicación original con su versión, su estado y sus sesiones, y permite lo que hoy
permite su sección: transferir sesiones, desvincular y actualizar la original.

### AC-05 · Con los componentes del catálogo y el aspecto de la app

La app usa los componentes de `src/components/ui` con la tipografía, los colores, los radios y la densidad
de `DESIGN.md`, en oscuro, claro y sistema, también en menús, diálogos y avisos. Se usa con la ventana al
mínimo (980×680) y respeta los controles de ventana de macOS, Windows y Linux.

### AC-06 · No se pierde nada

Cada acción, atajo y aviso de la app actual sigue disponible. Al volver a la ventana tras «Actualizar
original» solo se refrescan las versiones, sin abrir el panel de escaneo, como hoy. `pnpm build` y todas las
pruebas pasan.

## Reglas de negocio afectadas

Ninguna: cambian la navegación y el aspecto, no lo que la app hace con los perfiles.

## Para la persona usuaria

1. **D-1**: el CSS propio se retira en esta misma historia en lugar de convivir con el catálogo.
2. **D-6**: qué cifras lleva el resumen del dashboard.
3. **D-5**: lucide en toda la interfaz en lugar de los iconos propios.
4. El dial de diseño está apagado, así que no hay maqueta previa: el aspecto se decide al probar.

**Pendiente humano:** recorrer la app en macOS, Windows y Linux, y valorar si el nuevo uso «se siente»
mejor.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [x] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [x] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [x] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [x] Revisión técnica pasada, si la historia es riesgosa
- [x] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [x] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [x] Commits en cada repo tocado con `HU: HU-0016`. **Sin push, sin publicar, sin desplegar**
- [x] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

2026-10-28, cerrada por el orquestador sobre el veredicto «Aprobado, cierra» de Braiyan Rodriguez.

SHA por repositorio, con una línea de qué hace cada uno (code-ai-profiles, rama `hu-0016-rediseno-sidebar`):
- `a8091c2`: macOS 13.3 como mínimo y requisitos de motor web (P-1, opción b).
- `eaac80d`, `c4c584f` (E1): Tailwind en la app, tema en `<html>`, aviso de motor, `test:ui`; shell con sidebar, titlebar, statusbar y rutas.
- `358823a`, `f45efe9`, `0a83abd` (E2): página de instancia, página de la original y dashboard; avisos en el layout y búsqueda en el sidebar.
- `40d5400`, `08bd8b2` (E3): diálogos con el catálogo; `tokens.css`; fuera el CSS propio e `Icons.tsx`; documentación.
- `d06c006`, `bc04d0a`, `ed8b3b1`, `378f41d`, `6583100`, `8caf37f`, `e70b58a` y el de cierre: historia, arquitectura, bitácora, guías, revisión técnica, regla de procesos, verificación, CHANGELOG y rendimiento.

★ aceptadas tal como estaban: D-1 a D-6, más las desviaciones aceptadas en la revisión técnica, R-2 (las confirmaciones no se cierran con un clic fuera) y R-3 (con `busy`, X deshabilitada y Escape sin efecto).

Pendientes humanos (nadie los vio; no se dan por hechos):
- Windows y Linux reales: controles de ventana, esquinas transparentes con el velo de los diálogos (R-7), WebKitGTK y el aviso de motor en una Ubuntu 22.04 sin actualizar.
- La vuelta tras «Actualizar original» con una actualización oficial disponible, si no la hubo al probar.
- Iconos personalizados reales con el selector de archivo, y que el `.dmg` declare `LSMinimumSystemVersion` 13.3.
- Lector de pantalla y `prefers-reduced-motion`.

Deuda declarada:
- R-4: la skill `code-ai-profiles-frontend-react-vite` pesa 12,3 KB; el detalle debe pasar a archivos aparte dentro de la skill.
- R-1 (opcional): un paso de CI que cuente los `addEventListener` de foco en `dist/` y exija 5.
- R-6: la comprobación del motor corre después de importar `App`; con `import()` dinámico avisaría antes.
- Peso: CSS y JS más grandes y aviso de chunk > 500 kB (`docs/rendimiento.document.md`).
- Declarar `libwebkit2gtk-4.1-0 (>= 2.40)` en el `.deb` (`bundle.linux.deb.depends`): decisión del mantenedor.
- Incidente de E1: se mató un proceso de red de la instancia «Claudio Personal» en marcha; Electron lo relanzó. Regla nueva en `.metodo/reglas/frontend.md` (R-8).
