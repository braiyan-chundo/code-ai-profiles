# Vista · HU-0025 · Proyectos: datos incompletos y lector de historias

Maqueta estática: [`maqueta.html`](maqueta.html). Se abre con doble clic, sin servidor ni red (las fuentes van
incrustadas). Parte del armazón, los tokens y los componentes de la maqueta de HU-0023, ya en el sistema armónico de
HU-0022. **No hay colores ni tokens nuevos**: neutros, `--ui-warning` y los de estado que ya existen. No se toca `src/`.

Las historias, los títulos y el Markdown de `happy-office` son **inventados** (verosímiles). Las cifras de la historia
(46 historias, 4 repos, 11 días, 19 h, 1.040 M tokens, 18 incompletas: 13 + 5) son las reales del contexto.

Enlace directo: `maqueta.html#pantalla=lector&estado=hu&ancho=1440&variante=chip&tema=oscuro`.

## Qué hay

| Pantalla | Estados | Capturas |
| --- | --- | --- |
| **Página del proyecto** (`happy-office`) | Datos reales (chip, sin lista de avisos) · con 2 avisos (ejemplo) · lista de historias desplazada (etiquetas en las filas) | 01, 02 |
| **Modal «Datos incompletos»** | Datos reales · con 2 avisos (ejemplo) · comando copiado | 03, 04 |
| **Lector de historia** | `hu.md` · `arquitectura.md` · `seguimiento.md` · solo `hu.md` y `seguimiento.md` (los que existen) · pestaña ilegible · cargando | 05, 06 |

Ejes: 1440×920 o 980×680, tema claro u oscuro, sidebar, tamaño de texto y plataforma. Variantes (D-1): **Chip ★** y
**Tarjeta plegada**. Las capturas, hechas con Chrome sin interfaz sobre cada plantilla, están en [`capturas/`](capturas/).
Nota: «Consumo» no cambia y no se dibuja; Tecnologías y Repos son los de HU-0023.

## Decisiones de diseño

1. **Chip en la cabecera (D-1 ★).** «18 historias con datos incompletos · Ver», en la fila de chips del encabezado
   (24 px de alto, el objetivo táctil mínimo). Es neutro: informa, no alarma. Si hay avisos reales cambia el icono a
   triángulo, el borde a `--ui-warning` y añade «· 2 avisos». Sin incompletas ni avisos, no aparece. La variante
   *Tarjeta plegada* es una franja de una línea bajo la cabecera, con el desglose («13 sin tiempo · 5 sin métricas») y
   «Ver detalle»; ocupa 48 px y 8 más de separación, el único coste de espacio.
2. **La etiqueta va donde falta el dato.** «Sin tiempo» sustituye al «—» de la columna *Tiempo* (sus tokens sí se ven);
   «Sin métricas» ocupa las dos columnas de cifras. Así el título de la historia conserva todo su ancho a 1440 y a 980
   (una primera prueba con la etiqueta junto al título lo reducía a cuatro letras a 980). Es un borde discontinuo y
   texto gris: «falta» sin parecer un error.
3. **Modal «Datos incompletos».** Diálogo de 640 px con cabecera y pie fijos y cuerpo con `ScrollArea` (carril visible,
   fundido abajo). Grupos, de más a menos accionable:
   - **Avisos** (solo si hay): ámbar, con el archivo y el mensaje de cada uno.
   - **Sin métricas (5):** explica que están terminadas pero sin `metricas.json` y que se genera *en el proyecto*; cada
     historia lleva su comando `node .metodo/scripts/metricas.mjs hu HU-0001` en un recuadro monoespaciado y su botón
     «Copiar» (pasa a «Copiado» en verde). «Copiar todos» junta los cinco, uno por línea.
   - **Sin tiempo (13):** explica que se cerraron sin fases, que **el dato no se puede recuperar** y que sus tokens sí
     suman (se ven a la derecha de cada fila). No tiene acción.
   - Pie fijo: «Solo lectura: la app no ejecuta ni escribe nada en el proyecto» (RN-02).
4. **Lector.** Diálogo grande (960 × alto de la ventana − 48). Cabecera con `HU-0023`, el título, el estado, la fase, el
   área, la fecha y la misma etiqueta de datos incompletos. Debajo, las pestañas (las `Tabs` segmentadas del filtro de
   historias, con el nombre del archivo en monoespaciado) en el orden de D-3: hu → arquitectura → verificación →
   seguimiento, solo las que existen. El cuerpo es lo único que se desplaza. Pie: «Solo lectura · ruta del archivo».
5. **Markdown (D-2).** Columna de lectura de 720 px, texto de 14/24. Títulos con una línea bajo el h2, listas con
   anidado, tabla con borde y cabecera en versalitas, código en bloque con cabecera y copiar, código en línea, cita con
   filo en `--primary-bright`, casillas de tareas de solo lectura y un enlace externo con su icono. Sin imágenes ni HTML.
6. **Estados del lector.** *Cargando:* esqueleto de pestañas y de texto. *Ilegible:* la pestaña lleva un triángulo
   ámbar y el cuerpo dice qué pasó y ofrece «Reintentar»; el resto de pestañas sigue funcionando.
7. **Filas clicables.** La descripción de la tarjeta dice «Pulsa una historia para leerla»; la fila resalta al pasar el
   cursor. La fila entera abre el lector, con foco de teclado.

## Para que lo apruebe la persona

- **D-1.** Chip ★ o tarjeta plegada (se comparan con *Comparar variantes*).
- **Orden de los grupos del modal.** Propongo avisos → sin métricas → sin tiempo (lo accionable primero). La historia los
  nombra al revés (sin tiempo, sin métricas).
- **Grupo «Avisos» vacío.** Propongo que no aparezca si no hay avisos (mostrarlo con «Ningún aviso» es la alternativa).
- **«Copiar todos».** No estaba pedido; son cinco comandos y ahorra cinco clics. Se quita si sobra.
- **El `# título` del Markdown no se repite.** Si el primer h1 de `hu.md` es igual al título de la historia, el lector
  no lo pinta (ya está en la cabecera). El frontmatter tampoco se muestra: su estado, fase, área y fecha ya van en la
  cabecera.
- **Pista de «Tiempo en fases».** Con 13 historias sin tiempo, «de 41 terminadas» sería falso. La maqueta dice «de 23
  de 41 terminadas» y el pie de la tabla dice «Suman las 36 terminadas con métricas».
- **Enlaces externos.** Se pintan como enlace y se abren en el navegador del sistema (D-2); queda por confirmar si
  piden confirmación antes de salir.
- **Límite de lectura.** No se dibuja el caso «el archivo supera el límite»: se trata como *ilegible* (misma pantalla).

## Autoevaluación de espaciado y proporción

Marco: la escala de HU-0022 (retícula de 4 px; espaciado 4·8·12·16·24·32·48; interlineado múltiplo de 4; radios
4·8·12·16·24; controles de 24·32·36·40; iconos de 16 con el texto y 20 en los títulos). Las medidas son estilos
calculados por Chrome sin interfaz sobre cinco combinaciones (modal con avisos y lector `hu` a 1440 oscuro; lector
ilegible a 980 claro; lista de historias a 1440; página con la tarjeta plegada a 980), **1.685 elementos**.

| Comprobación | Resultado |
| --- | --- |
| `padding`, `margin` vertical y `gap` fuera de la escala | **0** |
| Radios fuera de 4·8·12·16·24·píldora | **0** |
| Interlineados que no son múltiplo de 4 | **0** (16, 20, 24 y 28) |
| Texto por debajo de 11 px | **0** (11, 12, 14, 15, 17, 22) |
| Radio interior = exterior − padding | Diálogo 24 con filas de 8; tarjeta de comando 8 con código de 4; tabla del Markdown 8 |
| Ritmo del Markdown | 16 entre bloques, 32 antes de un h2, 12 tras un título, 4 entre ítems de lista |
| Objetivos de pulsación | Chip 24, botones 32, filas de 40 (todos ≥ 24) |

Hallazgos de la revisión y lo que se hizo:

- La etiqueta junto al título lo aplastaba a 980 px → pasó a la columna del dato que falta (decisión 2).
- Los márgenes por defecto de `p`, `ul` y `pre` anulaban el ritmo del Markdown (el primer párrafo quedaba pegado al
  título) → reiniciados con `:where()` para que mande el ritmo de 16.
- El botón «Copiado» era más estrecho que «Copiar» y movía el recuadro del comando → ancho mínimo común de 112 px.
- Las variantes del marco se llamaron `A`/`B` y chocaban con el diseño de cabecera de HU-0019 → ahora `chip` y `franja`.

Abierto, menor: a 980 px el título de la historia se corta a unos 20 caracteres (la columna es 4/12, igual que en
HU-0023); el título completo está en el tooltip de la fila.

## Para construir (guía, no es parte de la maqueta)

Todo sale del catálogo: `Dialog` (con `DialogContent` sin padding y `ScrollArea` dentro), `Tabs`, `Badge`, `Button`,
`Item`/`Card`, `Empty`, `Skeleton` y `CodeBlock` para los bloques de código. El Markdown necesita un mapa de
componentes de `react-markdown` con utilidades de Tailwind (sin CSS propio) y `remark-gfm` para tablas y casillas.
