# El diseño

> Estado: versión 4 (borrador), 2026-10-24.

Cómo trabaja `product-design`: primero el sistema, después las pantallas. Existe si `diseno` no es
`off` y el producto tiene interfaz.

## 1. Lo que cambia frente a la v3

| v3 | v4 |
| --- | --- |
| Maqueta por historia desde el principio | **Fundación de diseño** antes de la primera maqueta |
| HTML a mano | **Claude Design** para sistema y maquetas |
| Se suponía la marca | Se pregunta si hay marca, referencias o idea, o si se arma de cero |
| Fichas de componente cuando aparecían | **Showcase** con todos los componentes, **una skill por componente** y un índice de uso |
| Sin guías de estructura | **Guías** de layout, niveles de vista y navegación |
| Mismas reglas para todo | **Skills de diseño propuestas** según el tipo de proyecto |
| Maqueta con formas distintas cada vez | **Estructura fija**: barra lateral de navegación de la maqueta y pantalla a la derecha |
| Maquetas en `hu/design/` | En la carpeta de su historia: `hu/HU-####/diseno/` |

## 2. La herramienta

Con `herramientaDiseno: claude-design` el sistema de diseño y las maquetas se construyen en
**Claude Design**, que ahora vive dentro de Claude: un proyecto de tipo *Design System* para tokens,
componentes y showcase, y artefactos de tipo *Design* para prototipos y maquetas. La librería de
componentes del repo y el sistema de Claude Design se mantienen alineados con `/design-sync`,
componente a componente.

- **El repositorio es la fuente de verdad.** Toda maqueta aprobada se exporta (HTML autocontenido y
  capturas) a la carpeta de su historia, con el enlace a Claude Design en `vista.md`.
- **Dónde corre**: comprobado el 2026-10-24, **un subagente tiene la herramienta `Artifact`**, con la
  que se crean los diseños y los sistemas de diseño en Claude: `product-design` trabaja como subagente
  (hereda las herramientas de la sesión). Lo que **no** tiene es `DesignSync`: alinear la librería del
  repo con un proyecto de Design System se hace desde la sesión principal con `/design-sync`, que inicia
  la persona. Si en otra instalación el agente no tuviera `Artifact` (por ejemplo, sin sesión de
  claude.ai), lo dice al devolver y el orquestador diseña en la sesión principal.
- Claude Design como aplicación aparte (claude.ai/design) cierra el 14 de diciembre de 2026: se
  trabaja con el que vive dentro de Claude.

Con `html-local`: HTML autocontenido escrito por el agente, con la misma estructura de maqueta.

## 3. La fundación de diseño

Es **la primera historia con pantalla** (con `diseno: sistema`). Nadie maqueta una vista antes de
que esté aprobada.

### La pregunta inicial

Se hace en el arranque y se repite al abrir la historia si no hay respuesta:

> ¿El cliente tiene marca (logo, colores, tipografía), un manual, referencias de apps o sitios que le
> gusten, o una idea de cómo quiere que se vea? ¿O armamos el sistema de diseño completo de cero?

| Respuesta | Qué se hace |
| --- | --- |
| Tiene marca o manual | Se respeta; se completa lo que falte (estados, oscuro, densidad) y se marca como propuesta |
| Tiene referencias o una idea | Dos o tres **direcciones visuales** con su porqué; elige la persona |
| De cero | Dos o tres direcciones desde el tipo de producto y su público; elige la persona |
| Hay un lienzo aprobado (pantallas firmadas) | Se extrae el sistema del lienzo; el lienzo no se edita |

### Lo que entrega

1. **Dirección visual** (`docs/diseno/direccion.md`): personalidad, referencias, lo que se evita.
2. **Tokens**: color (con escala de estados y claro/oscuro), tipografía, espaciado de una sola escala,
   radios, sombras, movimiento. En Claude Design y en el paquete de UI del repo.
3. **El showcase**: **una vista con todos los componentes que el proyecto va a usar**, en todas sus
   variantes, estados, tamaños y temas, agrupados como el índice y con enlace directo a cada uno
   (`/showcase?c=<id>`). Pueden ser de shadcn/ui, de otra librería o propios; dice el origen y la versión
   de cada uno. Vive en Claude Design (Design System) y en el repo (una ruta `/showcase` o Storybook,
   según el stack); la del repo es código y la construye `frontend` con la librería.
4. **Una skill por componente**, `.claude/skills/<slug>-ui-<id>/SKILL.md`, desde
   `<slug>-componentes/plantilla.md`: para qué, cuándo sí y cuándo no, variantes, estados, accesibilidad
   y ejemplo, con cómo se importa y dónde se ve en el showcase. Lo común a todos (tokens, tamaños, foco,
   estados) se dice una vez, en `<slug>-componentes/forma.md`. **Y el índice de uso**,
   `<slug>-componentes`: «**N componentes**» y una línea por skill en su grupo
   (`<slug>-ui-button` · Botón — para qué). Quien diseña o construye carga el índice y **solo** las
   skills de lo que usa.

   Se hace en ese orden (showcase, skills, índice) y así funcionó en proyectos reales: una skill índice
   con todas las fichas dentro no se usaba bien. El costo es que la descripción de cada skill va en cada
   turno: por eso es corta (hasta 200 caracteres, «Cárgala antes de usarlo»). `hu.mjs check` avisa si el
   índice y las skills no cuadran, si a una skill le falta una sección o si su descripción es larga, y
   `metodo.mjs validar` si las descripciones suman demasiado.
5. **Las guías** (`docs/diseno/guias.md`, [plantilla](plantillas/diseno/guias.md)): cómo se construye
   una pantalla en este proyecto (ver §4).
6. **La skill de diseño** del proyecto (`<slug>-diseno`): tokens, reglas visuales, textos, las guías
   resumidas. La carga `product-design` siempre y `frontend` al construir una pantalla.

La persona aprueba la fundación viendo el showcase y una pantalla de ejemplo construida con él.

## 4. Las guías: niveles de vista y estructura

Las guías dicen **cómo se arma una pantalla** para que todas las historias se parezcan entre sí.

| Nivel | Qué es | Patrón por defecto |
| --- | --- | --- |
| **N0 · Marco** | El esqueleto de la app: navegación, cabecera, área de contenido | Barra lateral colapsable en escritorio; barra inferior o cajón en teléfono |
| **N1 · Colección** | Listados, tableros, paneles | Título + acción principal arriba; filtros; tabla o tarjetas; vacío, cargando, error |
| **N2 · Detalle** | Un elemento y lo relacionado | Cabecera con estado y acciones; secciones o pestañas; historial |
| **N3 · Edición** | Crear o editar | Página completa si es largo; panel lateral si es corto y se edita en contexto; validación en línea |
| **N4 · Confirmación** | Diálogos, avisos, deshacer | Diálogo solo para lo destructivo o irreversible; lo demás, aviso con deshacer |

Más: rejilla y anchos máximos, densidad (cómoda o compacta), formularios, tablas, estados vacíos,
retroalimentación (cargando, éxito, error), navegación y migas, y adaptación a teléfono.

## 5. Skills de diseño según el proyecto

`product-design` las propone **en la fundación de diseño**; **quien decide el método y el cliente
eligen**. Si existe su pack, entra en `stack.packs`; si no, la elección se anota en la skill de diseño
del proyecto y se forja el pack solo si alguien va a mantenerlo.

| Si el proyecto es… | Propone |
| --- | --- |
| Panel con muchos datos | Tablas densas, filtros, visualización de datos, exportación |
| Comercio electrónico | Catálogo, ficha de producto, carrito y pago, confianza |
| App de campo o de calle | Táctil grande, una mano, sol directo, sin conexión |
| Landing o marketing | Narrativa, conversión, rendimiento, movimiento |
| SaaS B2B | Incorporación, permisos visibles, multi-organización, configuración |
| Sector público, salud o educación | Accesibilidad reforzada (WCAG 2.2 AA como mínimo), lenguaje claro |
| Varios idiomas | Internacionalización, textos largos, derecha a izquierda |
| Formularios complejos | Pasos, guardado de borrador, validación, ayuda contextual |

## 6. La maqueta

**Siempre con la misma estructura**, desde la plantilla
[plantillas/diseno/maqueta-shell.html](plantillas/diseno/maqueta-shell.html):

```text
┌──────────────────┬─────────────────────────────────────────────┐
│ HU-0012 Checkout │                                             │
│                  │                                             │
│ Pantallas        │                                             │
│  › Carrito       │          la pantalla, al tamaño elegido     │
│    Pago          │                                             │
│ Estados          │                                             │
│  › Con datos     │                                             │
│    Vacío · Error │                                             │
│ Tamaños          │                                             │
│  1440 · 768 · 390│                                             │
│ Variantes (★)    │                                             │
│  A · B           │                                             │
│ Tema ◐           │                                             │
└──────────────────┴─────────────────────────────────────────────┘
```

**La maqueta es estática.** Sirve para decidir cómo se ve y cómo se usa, no para demostrar que funciona:
un conjunto de pantallas en HTML y CSS, una por pantalla × estado × variante. Construir una versión que
funciona (formularios que validan, datos que cambian, simulación de la API, React o Vite, un servidor)
tarda mucho más y no se aprueba mejor; eso le toca a `frontend`.

- **Sin lógica.** El único script es el del marco, que ya viene hecho en la plantilla: el agente solo
  rellena las pantallas, los tokens y la lista de lo que hay.
- **Sin el stack del proyecto.** Los componentes se dibujan con el aspecto de la librería (sus clases y
  estilos copiados), no se importan ni se compilan.
- **La interacción es otro estado**: «menú abierto», «confirmar borrado», «error en el correo»,
  «enviando». Entre pantallas, un enlace `data-ir="pantalla=pago&estado=con-datos"`: es toda la
  navegación que hace falta, también para el prototipo de producto primero.
- **Variantes de lo que se propone.** Cada ★ lleva dos o tres alternativas de la misma pantalla, cada una
  con su nota de una línea y la recomendada marcada. «Comparar variantes» las pone lado a lado.

- **Barra lateral simple**: pantallas, estados (solo los que la historia tiene: con datos, vacío,
  cargando, error, sin conexión, sin permiso, primera vez), tamaños, variantes (las ★ de diseño) y tema
  claro/oscuro. Se pliega para ver solo la pantalla.
- **A la derecha, la pantalla**, al tamaño real elegido.
- **Enlace directo a cada combinación** (`#pantalla=pago&estado=error&ancho=390&tema=oscuro`), para
  citarla en la guía de prueba.
- **Tokens reales y componentes con el aspecto de la librería.** Si la maqueta muestra algo que la librería no produce,
  `frontend` no podrá construirlo: se declara componente nuevo, con su skill y su línea en el índice.
- **Datos verosímiles** del lugar del cliente. Nada de «Lorem ipsum».
- Vive en `hu/HU-####/diseno/maqueta.html`, con `vista.md` (≤60 líneas: componentes, disposición,
  estados, interacción, textos exactos, accesibilidad) y `capturas/`.

## 7. El oficio de UX/UI

`product-design` es experto en experiencia y en interfaz. Revisa cada maqueta contra:

**Experiencia**
- Las diez heurísticas de Nielsen: estado visible, lenguaje del usuario, control y deshacer,
  consistencia, prevención de errores, reconocer antes que recordar, eficiencia, minimalismo, errores
  que dicen cómo salir, ayuda.
- Leyes de UX: Fitts (lo frecuente, grande y cerca), Hick (menos opciones por decisión), Jakob (como
  las apps que ya conocen), carga cognitiva, umbral de Doherty (respuesta en menos de 400 ms o
  indicador).
- Una acción principal por vista; el camino feliz en el menor número de pasos.

**Accesibilidad (WCAG 2.2 AA)**
- Contraste 4,5:1 en texto y 3:1 en componentes; foco visible; todo usable con teclado.
- Objetivos táctiles de 44 px (24 px como mínimo absoluto); nunca el color como única señal.
- Etiquetas en todos los campos, errores asociados al campo, textos alternativos.

**Interfaz** (lo que hace que se vea vieja)
1. Un solo nivel de contenedor; jerarquía con tamaño, peso, espacio y color, no con más cajas.
2. Bordes como excepción.
3. Espaciado de una sola escala.
4. Lo vacío ocupa poco.
5. Sin desplazamiento horizontal en la vista principal.
6. Datos en lenguaje humano: «hace 23 días», «$12,50».
7. Estados como píldora sobria con su etiqueta.
8. Mayúsculas y monoespaciada solo donde aportan.
9. En teléfono, si no cabe, se quita información; no se encoge la letra.
10. Guías de plataforma (Material 3, Human Interface) cuando la app es nativa o instalable.

## 8. Definición de hecho

- Fundación: dirección, tokens, showcase completo, una skill por componente con su índice de uso, guías,
  skill de diseño, aprobada.
- Maqueta: estática, con la estructura fija; los estados, tamaños y temas de la historia; cada ★ con sus
  variantes y la recomendada;
  checklist de UX/UI revisada; exportada a la carpeta de la historia.
- Vista ≤60 líneas; componentes nuevos con su skill y su línea en el índice.

## 9. Errores conocidos

- Recibir del orquestador una forma inventada y dibujarla sin comprobar lo ya decidido.
- Estilizar un componente dentro de la pantalla en vez de en la librería.
- Diseñar en texto lo que se puede dibujar.
- Construir una versión que funciona en lugar de pantallas estáticas: lógica, datos simulados, el stack
  del proyecto o un servidor. Tarda mucho más y no se aprueba mejor.
- Maquetar antes de tener la fundación aprobada: cada pantalla inventa su propio sistema.
