# Vista · HU-0022 · Configuración unificada con apariencia y permisos

La maqueta es [`maqueta.html`](maqueta.html): se abre con doble clic y no necesita servidor. Usa el marco, los tokens, las
fuentes y los iconos de la maqueta aprobada de HU-0019 (barra de 52 px, sidebar flotante de 240 px, escala `--fs-*`).

- **Sección 5:** la página de Configuración, sobre el sistema armónico.
- **Sección 6:** corrige con el mismo sistema lo heredado de HU-0019 (sidebar, barra, botones, chips, sesión y barra de estado).
- **Paleta:** no hay colores nuevos. `--ui-overlay` es el velo de los diálogos de `ui-theme.css`.
- **Ejes del marco:** pantalla, estado, 1440×920 / 980×680, variante (A ★ pestañas / B índice), sidebar desplegado, plegado o con tooltip, plataforma macOS / Windows / Linux, y tema.
- **Capturas:** las de [`capturas/`](capturas/) se hicieron con Chrome sin interfaz sobre el mismo documento que pinta el marco.

## Pantallas

| Pantalla | Qué muestra | Capturas |
| --- | --- | --- |
| **Configuración › Apariencia** | Lo mismo que el diálogo de hoy, en tres tarjetas: Tema (Sistema, Claro, Oscuro, cada uno con su muestra y su descripción), Tamaño del texto (Compacto, Cómodo, Grande) y la sesión de ejemplo. No hay «Listo»: los cambios se aplican y se guardan al momento. | 03, 04, 11, 12 |
| **Configuración › Permisos (macOS)** | Tres tarjetas: **Gestión de apps**, **Archivos y carpetas** y **Cuenta de administrador**. Cada una lleva icono, nombre, botón de info, «Opcional», una línea de para qué, su estado y «Abrir Ajustes del Sistema» (la de administrador, sin botón). Al pie: «Entrar aquí no pide ningún permiso». | 00, 01, 02, 05, 06, 09, 10 |
| **Permisos (Windows / Linux)** | Un estado vacío: «Esta plataforma no necesita permisos adicionales». | 07, 08 |
| **Editor de instancia (D-4)** | El aviso «Permiso de Gestión de apps» de hoy, más el enlace «Ver en Configuración › Permisos» junto a «Reintentar». Lo nuevo va marcado con un borde discontinuo. En Windows y Linux el aviso no aparece. | 15 |
| **Alternativa D-1** | Diálogo de 760 px con pestañas, marcado «Alternativa · no recomendada». | 16, 17 |

Estados de Permisos (eje «Estado»):

- **Lo necesita:** borde y estado en `--ui-warning`, punto en la pestaña y popover de Gestión de apps abierto.
- **Sin uso todavía:** punto `--quiet`, con el popover de Archivos y carpetas abierto.
- **Info de Cuenta de administrador.**
- **Sin info abierta.**

## Textos

| Permiso | Para qué (línea visible) | Estado | Popover: sin él |
| --- | --- | --- | --- |
| Gestión de apps | Pone el icono de cada instancia en el Dock cuando Claude se actualiza solo. | Lo necesita: N instancias / Sin uso todavía | Esas copias enseñan el icono original en el Dock. Dentro de la app el icono se sigue viendo. |
| Archivos y carpetas | Deja que Proyectos lea carpetas en Escritorio, Documentos o Descargas. | No se puede comprobar | Los proyectos de esas carpetas no aparecen. Los de otras carpetas, sí. |
| Cuenta de administrador | «Descargar e instalar» copia la versión nueva de Claude en Aplicaciones. | Solo informativo: no hay nada que activar | La instalación se para con un aviso y Claude sigue en la versión que tenías. |

Cada popover tiene:

- **Para qué**.
- **Sin él**.
- «Opcional: la app funciona sin él», en `--ui-success`.
- La ruta del panel en Ajustes del Sistema.
- Solo el de Archivos y carpetas: **Estado** (macOS no deja saberlo sin mostrar un aviso, así que la app no lo comprueba).

## Decisiones (★ = la que propongo)

1. **D-1 · Dónde vive.** ★ Página propia, `#/configuracion`.
   - «Configuración» sustituye a «Apariencia» en el pie del sidebar y queda activa (`aria-current="page"`).
   - La barra muestra «Configuración › Permisos».
   - La alternativa es el diálogo con pestañas. Tapa la app, el aviso del editor (D-4) no puede enlazar directo a él y a 980×680 va justo.
2. **Secciones.** ★ **A · pestañas** sobre el contenido, con subrutas `#/configuracion/apariencia` y `#/configuracion/permisos`.
   - **B · índice lateral:** con dos secciones repite el sidebar y, a 980 px, deja 4 de 12 columnas al índice y las tarjetas se apilan mal (captura 14).
3. **D-2.** ★ Solo los permisos de la plataforma actual. En Windows y Linux, el vacío.
4. **D-3.** ★ Estado cuando se puede saber, sacado del registro de instancias. Nunca se fuerza un aviso del sistema.
5. **D-4.** ★ El aviso del editor se queda y gana el enlace a `#/configuracion/permisos`.
6. **Info.** ★ Popover, no tooltip.
   - Se abre con clic, Intro o Espacio y se cierra con Esc.
   - El botón mide 24 × 24 y lleva `aria-label` y `aria-expanded` (AC-03).

Detalles que vienen con la ★ (sí o no a cada uno):

- El icono del pie pasa de `settings-2` a `settings` (engranaje).
- Un punto en la pestaña Permisos cuando algo «Lo necesita».

## Sistema armónico aplicado

El mismo que usará la maqueta de HU-0023.

- **Retícula de 4 px.** Espaciado solo de la escala **4 · 8 · 12 · 16 · 24 · 32 · 48** (tokens `--s1`…`--s12` en la sección 5).
- **Ritmo vertical:**
  - Dentro de un componente, 4–12. Ejemplos: nombre → para qué → estado, 4; cabecera de tarjeta → opciones, 12.
  - Entre componentes, 16: tarjeta → tarjeta y texto de entrada → tarjetas.
  - Entre bloques de la página, 24: pestañas → cuerpo. Dentro del diálogo, cabecera → pestañas → lista → pie también van a 24.
  - Las tarjetas del mismo nivel (ajuste y permiso) llevan el mismo padding (16) y el mismo radio (16).
- **Retícula de página:** 12 columnas de 68 px con gutter de 24, en total 1080 px, que caben en los 1120 útiles a 1440.
  - A ★ ocupa 10 columnas (896 px), alineada a la izquierda bajo el título.
  - B: índice de 3 columnas (252) y cuerpo de 9 (804).
  - Por debajo de 1071 px, las 12 columnas son fluidas: A ocupa todo el ancho y B reparte 4 + 8.
  - Diálogos: 576 = 6 columnas (528) + 2 × 24, y 760 = 8 columnas (712) + 2 × 24.
- **Radios por tamaño:** control de 24–32 px → 8; control de 36–40 → 12; tarjeta, panel y popover grande → 16; ventana de Windows → 20; diálogo → 24.
  - **Anidado:** un hijo de todo el ancho dentro de un contenedor con padding *p* y radio *R* toma `max(8, R − p)`.
  - Por eso las opciones de tema y tamaño (dentro de una tarjeta de p 16 / R 16) llevan 8, la sesión de ejemplo 8, las tarjetas de permiso dentro del diálogo (p 24 / R 24) 8, y los ítems del sidebar (panel p 8 / R 16) 8, concéntricos.
  - Mínimo de 4 para lo decorativo, como las barras de la muestra de tema.
- **Controles:** alturas de la escala `--ctl`: 24 (info, chips, kbd, contadores), 32 (botón sm, ítem del sidebar, buscador), 36 (pestañas, botón), 40 (tile del permiso, entrada, botón lg).
  - Los chips pasan de 20 a 24, porque 20 no está en la escala de controles.
- **Iconos:** 12 con `--fs-micro`, 16 con `--fs-small` y `--fs-body`, 20 con `--fs-heading` y `--fs-title`.
  - El tile del permiso es de 40 con icono de 20 (1:2), como el avatar.
- **Interlineado:** siempre múltiplo de 4, con los tokens `--lh-*`.
  - Normal: micro 16, small 16 (prosa 20), body 20, heading 20, title 24, figure 28, diálogo 28.
  - En un control de una línea, la caja de línea es el alto − 16 (o − 8 en los de 24): 40 → 24, 36 → 20, 32 → 16, 24 → 16. Así el texto cae en la retícula.
  - En la barra de 52, el título va a 20 de línea y queda en y 16.
- **Bordes que no mueven la retícula:** los bordes de 1 px de opciones, sesión, alerta, buscador, sidebar, barra de estado y ventana de Windows pasan a anillo (`box-shadow inset`) o a contorno. El vacío de Windows y Linux usa un contorno discontinuo.

## Auditoría UX

Marco de evaluación:

- Los fundamentos de composición, espaciado y jerarquía de la skill `artifact-design`: elementos repetidos coherentes, tarjetas solo donde marcan un objeto, la estructura como información y textos desde el lado de la persona.
- Las 10 heurísticas de Nielsen.

Medido con Chrome sin interfaz: un script recorre los estilos calculados de diez pantallas (Permisos oscuro y claro a 1440 y a 980, Apariencia oscuro y claro, Windows, variante B, editor oscuro y claro, y diálogo).

### Resultado global (diez pantallas)

| Medida | Antes | Después |
| --- | --- | --- |
| Márgenes, paddings y gaps fuera de 4·8·12·16·24·32·48, y radios fuera de 4·8·12·16·20·24 | 1493 casos (237 valores distintos) | **10 casos (2 valores)**, ambos excepciones de posición (ver abajo) |
| Textos con interlineado que no es múltiplo de 4 | 494 de 497 | **0** de 488 |
| Líneas de texto cuyo borde superior no cae en la retícula de 4 px | 473 | **0** |
| Textos por debajo de 11 px | 0 | 0 |
| Textos por debajo de AA (4,5:1) | 6 | **2** (el botón primario, abierto) |

### Medidas clave, antes → después (1440×920, oscuro, salvo indicación)

| Elemento | Antes | Después |
| --- | --- | --- |
| Lista de pestañas | 36 alto · padding 3 · gap 2 · radio 14 | 36 · padding 4 · gap 4 · radio 12 |
| Pestaña | 30 alto · padding 0/14 · gap 6 · radio 12 · línea 20,3 | 28 · 0/12 · gap 8 · radio 8 (12 − 4) · línea 20 |
| Pestañas → cuerpo | 16 | 24 (entre bloques) |
| Ancho del cuerpo | 880 (sin retícula) | 896 = 10 columnas de 68 + 9 × 24 |
| Tarjeta de permiso | 96,8 alto · padding 14/16 · gap 14 | **96** · 16 por los cuatro lados · gap 12 |
| Tile del permiso | 36 · radio 12 · icono 18 | 40 · radio 12 · icono 20 (1:2) |
| Entre tarjetas de permiso | 10 | 16 (igual que entre tarjetas de Apariencia) |
| Chip «Opcional» | 19,4 alto · padding 1/7 | Texto «Opcional» de 12/24, sin chip (H4 y H8) |
| Botón «Abrir Ajustes del Sistema» | 32 · padding 0/10 · gap 6 · radio 10 | 32 · 0/12 · gap 8 · radio 8 |
| Popover | 340 ancho · padding 14 · gap 10 · radio 14 · a 10 px | 336 · 16 · gap 12 · radio 12 · a 8 px; flecha centrada en el botón |
| Línea de estado | 17,4 alto · gap 6 · punto 7 · icono 14 | 16 · gap 8 · punto 8 · icono 16 |
| Tarjeta de ajuste (Tema) | 184,3 alto | 176 |
| Opción de tema | 118,6 alto · padding 10 · gap 10 · radio 12 · borde 1 px | 112 · 12 · gap 8 · radio 8 (anidado) · anillo |
| Muestra del tema | 51 alto · radio 10 · padding 7 | 48 · radio 8 · padding 8 |
| Sesión de ejemplo | 121,6 alto · gap 14 · radio 12 | 120 · gap 12 · radio 8 (anidado) |
| Ítem del sidebar | radio 10 · gap 10 · y 184,6 | radio 8 (16 − 8, concéntrico) · gap 8 · y 180 |
| Panel del sidebar | radio 14 | 16 |
| Separación entre ítems del sidebar | 2 | 4 |
| Kbd, BETA y contador | 20 alto, o sin alto fijo · padding 3/5 · radio 5 | 24 · padding 0/4 · radio 4 |
| Diálogo del editor | 580 × 582,7 · padding 28 · gap 20 · y 168,6 | 576 × 592 · 24 · 24 · y 164 |
| Entrada del editor | 44 alto · padding 0/14 · radio 9 | 40 · 0/12 · radio 8 |
| Alerta del editor | padding 12/14 · gap 2/10 | 12/16 · gap 4/8 |
| Diálogo alternativo | 760 × 611,8 · padding 28 · gap 20 | 760 × 632 · 24 · 24 |
| Índice (B), entrada | 53,7 alto · padding 8/10 · radio 10 | 52 · 8/12 · radio 8 |
| Vacío de Windows/Linux | 218,5 alto · gap 10 · desplazado 1 px por el borde de la ventana | 220 · gap 12 · ventana con contorno: x 288 / y 120 exactos |

**Excepciones que se quedan:** `padding-left` de 84 px en la barra de macOS (semáforos en x 20, 3 × 12 + 2 × 8 de semáforos y 12 de aire) y `padding-right` de 160 px en la cabecera de Windows (los tres controles nativos). Son huecos de posición para controles del sistema, no espaciado entre elementos. Están en la retícula de 4, pero no en la escala.

### Heurísticas de Nielsen

| # | Heurística | Hallazgo | Estado |
| --- | --- | --- | --- |
| H1 | Visibilidad del estado del sistema | Cada permiso dice su estado en texto, con punto o icono, y la pestaña marca si algo «Lo necesita». Tras pulsar «Abrir Ajustes del Sistema» no hay confirmación, y el estado no cambia hasta que se reintenta el icono. | Estado: ok. Confirmación (aviso «Se abrió Ajustes del Sistema») y refresco al volver a la app: **abierto, para implementación**. |
| H2 | Relación con el mundo real | Los nombres coinciden con los paneles de macOS («Gestión de apps», «Archivos y carpetas») y el popover enseña la ruta exacta. «Cuenta de administrador» habla de la carpeta Aplicaciones, no de `/Applications`. | Ok. |
| H3 | Control y libertad | La página no bloquea: se sale por el sidebar y el popover se cierra con Esc o con clic fuera. El diálogo alternativo obliga a cerrar antes de seguir. | Ok. Refuerza D-1 ★. |
| H4 | Consistencia y estándares | Había radios de 9, 10, 12, 14 y 22 sin regla. El chip «Opcional» era una píldora en minúscula que no seguía ni el `Badge` de la app (mono, mayúsculas) ni los textos de estado. Los chips medían 20, fuera de la escala de controles. | **Corregido:** radios por tamaño y por anidado, «Opcional» como texto, chips de 24. |
| H5 | Prevención de errores | Ningún botón cambia el sistema: solo abre el panel, y su texto lo dice. La tarjeta de administrador no tiene botón, así que no lleva a un callejón sin salida. | Ok. |
| H6 | Reconocer antes que recordar | La ruta del panel está en el popover, y el aviso del editor lleva directo a Permisos (D-4). | Ok. |
| H7 | Flexibilidad y eficiencia | Las subrutas permiten enlazar a cada sección y las pestañas se recorren con flechas. Falta el atajo estándar de Configuración (⌘, en macOS; Ctrl + , en Windows y Linux). | **Abierto:** propongo el atajo, que es una decisión de producto. |
| H8 | Diseño estético y minimalista | «Opcional» se decía tres veces con tres pesos: frase de cabecera, chip en cada tarjeta y línea en el popover. «Lo necesita» se marcaba con anillo, punto, texto y punto en la pestaña. | **Corregido:** el chip pasa a texto discreto. El anillo de aviso se queda como franja de severidad, que la skill admite para el estado. |
| H9 | Reconocer y recuperarse de errores | Si el enlace al panel no abre nada, la persona no tiene a dónde ir salvo la ruta del popover. | **Abierto, para implementación:** si falla, un mensaje con la ruta del panel. |
| H10 | Ayuda y documentación | Popovers con para qué, qué deja de funcionar y que es opcional, accesibles con teclado. | Ok. |

Fundamentos de `artifact-design`:

- **Elementos repetidos coherentes:** las tres tarjetas comparten bordes, línea de nombre (24), línea de para qué (16), línea de estado (16) y columna de acción; la de administrador deja la columna vacía, pero el texto conserva su borde. Las tarjetas de la misma fila (opciones de tema y de tamaño) tienen el mismo alto.
- **Tarjetas con criterio:** la tarjeta marca objetos (ajuste, permiso). El chip, que repetía relleno, borde y radio sin aportar un estado nuevo, se quita.
- **Estructura como información:** no hay numeración decorativa. El punto de la pestaña solo aparece cuando hay un estado que atender.
- **Textos:** se nombra lo que la persona reconoce («Abrir Ajustes del Sistema», «Lo necesita: 2 instancias»), sin jerga del sistema.

### Contraste (WCAG 2.2, AA)

El texto se midió en el navegador, componiendo cada fondo translúcido sobre el extremo menos favorable del degradado de la ventana. Lo que no es texto se calculó con los tokens.

| Texto o estado | Oscuro | Claro | AA |
| --- | --- | --- | --- |
| Texto secundario (`--muted`) en página y tarjeta: intro, para qué, estado, pie | 6,35 | 4,54 – 5,17 | Sí |
| Pestaña inactiva | 7,17 | 4,54 (antes 4,13) | **Corregido:** la lista ya no se rellena con `--surface-soft` |
| Kbd «⌘ F» | 5,67 (antes 4,28) | 4,66 (antes 3,84) | **Corregido:** anillo en vez de relleno `--line` |
| «Lo necesita» (`--ui-warning`) en tarjeta | 6,45 | 5,29 | Sí |
| «Opcional: la app funciona sin él» (`--ui-success`) en el popover | 5,46 | 5,03 | Sí |
| Enlace «Ver en Configuración › Permisos» (`--ui-primary-text`) | 6,19 | 5,26 | Sí |
| Radio sin elegir (borde del control, 3:1) | 1,56 → **6,35** | 1,37 → **5,17** | **Corregido:** anillo `--muted` |
| Radio elegido (`--primary-bright`) | 5,31 | 3,01 | Sí (3:1) |
| Anillo de foco (3:1) | 2,79 → **7,10** | 1,50 → **5,31** | **Corregido:** 2 px de `--ui-primary-text` en vez de `ring/50` |
| Anillo de «Lo necesita» en la tarjeta | 2,16 | 1,77 | No hace falta: el estado lo dicen el texto y el punto (6,45 / 5,29) |
| Pestaña activa, su anillo | 1,54 | 1,36 | El estado lo dicen el texto (activa 11,3 / 14,2 frente a 7,2 / 4,5) y el relleno. Ver lo abierto |
| **Botón primario** («Guardar», «Listo»): blanco sobre `--primary-bright` | **3,03** | **3,03** | **No.** Abierto |

### Lo que queda abierto

1. **Botón primario a 3,03:1**, en toda la app. Con `--ui-on-primary` = `--surface` (texto oscuro sobre el naranja) daría 6,0:1 sin colores nuevos, pero cambia la identidad aprobada en HU-0019. Lo decide el mantenedor.
2. **¿Qué cambios heredados entran en HU-0022?** Las correcciones de la sección 6 afectan a toda la app:
   - Sidebar: separación de 4 entre ítems, radios de 16 / 8 y alineación del icono de la marca y del buscador con los ítems en x 16.
   - Chips y kbd de 24.
   - Barra de estado con anillo e interlineado de 20.
   - Anillo de foco.
   - Interlineados `--lh-*`.

   Propongo que entren aquí si la página lo necesita y, si no, en un `/fix` aparte. Lo decide el architect.
3. **`--esc` rompe la retícula en Compacto y Grande:** 36 × 0,93 = 33,5 y 36 × 1,143 = 41,1. Propuesta: alturas cuantizadas por tamaño (Compacto 32 / 28 / 36, Normal 36 / 32 / 40, Grande 40 / 36 / 44) y `--lh-*` por tamaño, como los de la sección 5.
4. **Centrado de los diálogos:** en vertical caen en la retícula porque su alto es múltiplo de 8 (592 y 632 en ventanas de 920 y 680). En horizontal, a 980 px el de 576 queda en x 202. Solo cuadraría eligiendo el ancho según la ventana; lo dejo así.
5. **Radios de DESIGN.md** (propuesta; DESIGN.md no se ha tocado):

   | Hoy | Propuesta |
   | --- | --- |
   | 9 (chips) | 8 (4 en kbd y BETA) |
   | 12 (controles) | 12 de 36–40 y 8 de 24–32 |
   | 14 (botones, tarjetas de opción, panel) | 12 en botones, 8 en opciones anidadas, 16 en el panel |
   | 16 (tarjetas) | 16 |
   | 20 (ventana de Windows) | 20 |
   | 26 (diálogos) | 24 |

   Más la regla de anidado `max(8, R − p)`.
6. **Las tres de antes, para el architect:**
   - La tarjeta «Archivos y carpetas» depende de HU-0023: propongo mostrarla solo cuando exista Proyectos.
   - Si se comprueba sin avisos la pertenencia al grupo `admin`, «Cuenta de administrador» pasaría de informativa a un estado real.
   - Falta cerrar el enlace exacto a cada panel (`x-apple.systempreferences:…?Privacy_AppBundles` / `Privacy_FilesAndFolders`).
7. **H1, H7 y H9:** el aviso tras abrir Ajustes del Sistema, el atajo ⌘, / Ctrl + , y el mensaje si el panel no abre.
8. **Apariencia a 980×680:** la vista previa queda bajo el pliegue y el contenido se desplaza.

### Cambios de producto que justifica la auditoría

- El chip «Opcional» pasa a texto «Opcional» junto al botón de info (H4, H8). El mensaje no cambia.
- La lista de pestañas pierde el relleno `--surface-soft` del catálogo y se queda con el anillo, por contraste (4,13 → 4,54 en claro).
- El anillo de foco y el borde del radio usan tokens con 3:1 o más.

Los textos, las secciones, los estados y las decisiones ★ no cambian.
