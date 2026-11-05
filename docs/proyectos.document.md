# Proyectos

Documento funcional de [HU-0023](../hu/HU-0023-proyectos-resumen-de-proyectos-con-metod/hu.md) y
[HU-0025](../hu/HU-0025-proyectos-datos-incompletos-y-lector-de-/hu.md) y
[HU-0027](../hu/HU-0027-icono-personalizado-de-proyecto/hu.md). Reglas de negocio:
[RN-02 a RN-04](producto/reglas/proyectos.md).

Proyectos muestra el estado de las carpetas de proyectos que siguen la metodología agéntica v4, sin abrirlas a mano.
Es una vista de solo lectura: no se cruza con las instancias de Claude ni escribe en el proyecto.

## Anclar y desanclar

- **Anclar proyecto** (en Proyectos o en el sidebar) abre el selector de carpetas del sistema. El diálogo enseña lo que
  detectó (nombre, perfil, fase, historias) antes de confirmar.
- Solo se anclan carpetas con `.metodo/config.json` y `version: 4`. Cualquier otra carpeta se rechaza con el motivo.
- Los anclados se ven en Proyectos y en su sección del sidebar, y siguen ahí al reabrir la app. El máximo es 100.
- **Desanclar** quita el proyecto de la lista; la carpeta no se toca.
- **Abrir carpeta** lo abre en Finder, el Explorador o el gestor de archivos.

## Icono del proyecto

Cada proyecto se identifica con su inicial, o con una imagen propia si la persona la eligió:

- En la página del proyecto, el avatar es un botón: al pasar el ratón o con el foco muestra un lápiz y «Cambiar icono».
  Abre «Icono del proyecto», con vista previa, «Seleccionar imagen» (o «Reemplazar imagen» y «Quitar»), «Cancelar» y
  «Guardar».
- La imagen es PNG o JPEG, de hasta 5 MiB y 4096 × 4096. Se recorta al centro y se guarda una copia de 512 px en los
  datos de Code AI Profiles (`project-icons/`); el proyecto no se toca. Una imagen no válida deja el error bajo los
  botones y «Guardar» desactivado.
- El icono sale en el sidebar (desplegado y plegado), en la tarjeta de la lista y en la página. «Quitar» y desanclar
  borran la copia y vuelve la inicial.
- Un proyecto roto se ve roto, sin su icono, y su avatar no abre el diálogo. Al arreglarse, el icono vuelve.

## Qué muestra

| Bloque | Contenido |
| --- | --- |
| Lista | Una tarjeta por proyecto: nombre, fase, perfil, historias en curso y terminadas, y última actividad |
| Cabecera | Nombre, resumen, perfil (S/M/L), fase, quién aprueba y ruta |
| Cifras | Historias por estado, «Desde» (días entre la primera historia y la última actividad), «Tiempo en fases» (horas) y tokens |
| Tecnologías | Lenguajes y frameworks de los manifiestos de cada repo y los packs de la config, con su versión mayor |
| Repos | Número y lista, con la rama, el commit corto y la fecha en que llegó a la rama |
| Historias | La lista con estado y fase, filtrable por estado; las terminadas con su tiempo y sus tokens; las descartadas atenuadas. Pulsar una historia abre el lector |

**Cifras.**

- «Tiempo en fases» es la suma de `minutosTotales` de las métricas: reloj entre fases, esperas incluidas.
- Los tokens son el total, con el porcentaje de caché, y como cifra secundaria entrada + salida.
- Solo suman las historias terminadas. Las descartadas enseñan sus cifras tachadas y no cuentan (RN-03).

**Datos incompletos.** Una historia sin `minutosTotales` lleva la etiqueta «Sin tiempo» y una terminada sin
`metricas.json`, «Sin métricas»; ninguna suma a las cifras que le faltan. La cabecera muestra el chip «N historias con
datos incompletos · Ver» (con los avisos de lectura, si los hay), que abre un modal agrupado:

| Grupo | Causa | Cómo se completa |
| --- | --- | --- |
| Avisos | Archivos ilegibles, encabezados rotos, permisos o nube | Según el aviso |
| Sin métricas | La historia se cerró sin generar `metricas.json` | En el proyecto, con `node .metodo/scripts/metricas.mjs hu HU-####`; el modal da el comando de cada una para copiarlo. La app no lo ejecuta |
| Sin tiempo | Se cerró sin transiciones de fase, así que el método no pudo medir su tiempo | No se recupera; los tokens sí cuentan |

**Lector de historias.** Muestra los `.md` de la historia, uno por pestaña y solo los que existen, en este orden:
`hu.md`, `arquitectura.md`, `verificacion.md` y `seguimiento.md`. Se leen al abrirlo y se renderizan como Markdown
(títulos, listas, tablas, casillas, código y citas). No pinta HTML embebido ni imágenes (muestra su texto
alternativo). Los enlaces `http`/`https` se abren en el navegador del sistema; los demás se muestran como texto. Un
`.md` ilegible o demasiado grande lo dice dentro de su pestaña, con «Reintentar».

**Cuándo se lee.** Al abrir la app, al entrar en un proyecto y al pulsar «Actualizar». No hay vigilancia de la carpeta
en segundo plano.

## Lo que se lee y lo que no

Se leen solo los archivos del método (`.metodo/config.json`, el encabezado de cada `hu/HU-*/hu.md`, `metricas.json`,
las fechas de `seguimiento.md`), los manifiestos de la raíz de cada repo y, de `.git`, `HEAD`, la referencia de la rama
y la última línea del reflog, de la que se toman solo el SHA y la fecha.

- No se ejecuta nada del proyecto: ni los scripts del método ni `git`.
- No se escribe nada en la carpeta y no se usa la red.
- No se lee nada fuera de la carpeta, aunque un repo o un enlace simbólico apunte fuera. Tampoco `~/.claude`, los
  perfiles ni los datos de Code AI Profiles.
- Los archivos que están solo en la nube (iCloud, OneDrive) no se descargan: se saltan con un aviso.
- Los archivos tienen tamaños máximos y los avisos se limitan a 20.
- El lector solo lee los cuatro `.md` de la carpeta de esa historia, hasta 512 KiB cada uno, y no sigue enlaces
  simbólicos que lleven a otra parte del proyecto (RN-02).

Code AI Profiles guarda en su carpeta de datos (`projects.json`) solo la ruta, el último nombre leído y las fechas de
anclado y de última lectura de cada proyecto, más la copia del icono si se eligió uno (`project-icons/`, RN-04). No
guarda cifras, historias ni personas.

## Maqueta de la historia

El lector de una historia muestra una pestaña «Maqueta», la última, solo si existe `hu/<carpeta>/diseno/maqueta.html`
(HU-0031, RN-09). Se lee con las mismas defensas que los `.md` (sin seguir enlaces simbólicos fuera de la carpeta de la
historia) y un tope propio de 1 MiB.

- **Dentro de la app** se pinta en un `<iframe sandbox="">` con `srcdoc`, sin scripts y con una CSP propia en `<meta>`
  (`default-src 'none'`, estilos en línea e imágenes `data:`): no puede hablar con la app ni cargar nada de internet. Las
  maquetas que se dibujan con JavaScript se ven incompletas; sus botones de estado y tema no funcionan aquí.
- **«Abrir en el navegador»** abre ese mismo archivo, re-validado en Rust, en el navegador del sistema (`file://`, sin
  shell). La interfaz nunca envía una ruta. Fuera de la app la maqueta corre con sus scripts como cualquier página local,
  y se abre con el programa asociado a `.html`.
- **Más de 1 MiB:** no se pinta; la pestaña lo dice y ofrece solo «Abrir en el navegador». Ilegible por otro motivo: el
  aviso de siempre con «Reintentar».

## Proyectos con problemas

Un proyecto roto sigue en la lista con un aviso y la opción de desanclarlo, con el último nombre leído:

| Caso | Cuándo |
| --- | --- |
| Carpeta no encontrada | La carpeta se movió, se renombró o se borró |
| No es una carpeta | La ruta apunta a un archivo |
| Sin metodología | Falta `.metodo/config.json` |
| No es v4 | La config es de otra versión del método |
| Config dañada | `.metodo/config.json` no se puede leer como JSON válido |
| Falta el permiso | macOS no deja leer la carpeta (ver abajo) |
| Ubicación excluida | La carpeta está dentro de `~/.claude`, de los perfiles o de los datos de la app |

## Permisos en macOS

Leer una carpeta en Escritorio, Documentos, Descargas, iCloud Drive o un disco externo o de red puede mostrar un aviso de
macOS («Archivos y carpetas»). La app no pide el permiso por adelantado ni lo consulta: si macOS lo niega, el proyecto
dice que falta el permiso y Configuración › Permisos › Archivos y carpetas pasa a «Lo necesita», con el acceso directo
a su panel. Ver [Configuración](configuracion.document.md).

Como los proyectos se leen al abrir la app, los avisos pueden salir al arrancar, uno por tipo de carpeta. Code AI
Profiles se firma ad hoc, sin certificado de Apple, así que **macOS vuelve a pedirlos tras cada actualización** de la
app. La alternativa, leer solo al entrar en Proyectos, queda registrada como deuda.

En Windows y Linux no hay avisos: se aplican los permisos normales de archivos.
