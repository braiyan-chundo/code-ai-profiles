# Vista · HU-0022 · Configuración unificada con apariencia y permisos

Maqueta estática: [`maqueta.html`](maqueta.html). Se abre con doble clic y no necesita servidor. Usa el marco, los tokens, las
fuentes y los iconos de la maqueta aprobada de HU-0019 (barra de 52 px, sidebar flotante de 240 px, escala `--fs-*`).
Solo añade la sección 5 de estilos y sus plantillas, sin ningún color nuevo. `--ui-overlay` es el velo de los diálogos de `ui-theme.css`.
Ejes: pantalla, estado, 1440×920 / 980×680, variante (A ★ pestañas / B índice), sidebar desplegado, plegado o con
tooltip, plataforma macOS / Windows / Linux y tema. Las capturas de [`capturas/`](capturas/) se hicieron con Chrome sin interfaz sobre
el mismo documento que pinta el marco.

## Pantallas

| Pantalla | Qué muestra | Capturas |
| --- | --- | --- |
| **Configuración › Apariencia** | Lo mismo que el diálogo de hoy: Tema (Sistema, Claro, Oscuro, con su muestra y su descripción), Tamaño del texto (Compacto, Cómodo, Grande) y la sesión de ejemplo. Cada bloque va en una tarjeta. No hay botón «Listo» porque los cambios se aplican y se guardan al momento. | 03, 04, 11, 12 |
| **Configuración › Permisos (macOS)** | Tres tarjetas: **Gestión de apps**, **Archivos y carpetas** y **Cuenta de administrador**. Cada una tiene icono, nombre, chip «Opcional», botón de info, una línea de para qué, su estado y «Abrir Ajustes del Sistema» (la de administrador no lleva botón). Al pie dice: «Entrar aquí no pide ningún permiso». | 00, 01, 02, 05, 06, 09, 10 |
| **Permisos (Windows / Linux)** | Un estado vacío: «Esta plataforma no necesita permisos adicionales». | 07, 08 |
| **Editor de instancia (D-4)** | El aviso «Permiso de Gestión de apps» de hoy, sin cambios, más el enlace «Ver en Configuración › Permisos» junto a «Reintentar». El borde discontinuo marca lo nuevo. En Windows y Linux el aviso no aparece. | 15 |
| **Alternativa D-1** | La alternativa a la página: un diálogo grande de 760 px con las pestañas Apariencia / Permisos. Se ve en una sola vista y lleva la marca «Alternativa · no recomendada». | 16, 17 |

Estados de Permisos (eje «Estado»):

- **Lo necesita**: «Gestión de apps» tiene el borde y el estado en `--ui-warning` («Lo necesita: 2 instancias · Work Profile y Personal Dev»). La pestaña Permisos lleva un punto del mismo color. El popover de Gestión de apps está abierto.
- **Sin uso todavía**: punto `--quiet`, sin borde de color. El popover de «Archivos y carpetas» está abierto.
- **Info de Cuenta de administrador**: el popover de la tarjeta informativa.
- **Sin info abierta**: la página en reposo.

## Textos

| Permiso | Para qué (línea visible) | Estado | Popover: sin él |
| --- | --- | --- | --- |
| Gestión de apps | Pone el icono de cada instancia en el Dock cuando Claude se actualiza solo. | Lo necesita: N instancias / Sin uso todavía | Esas copias enseñan el icono original en el Dock. Dentro de la app el icono se sigue viendo. |
| Archivos y carpetas | Deja que Proyectos lea carpetas en Escritorio, Documentos o Descargas. | No se puede comprobar | Los proyectos de esas carpetas no aparecen. Los de otras carpetas, sí. |
| Cuenta de administrador | «Descargar e instalar» copia la versión nueva de Claude en Aplicaciones. | Solo informativo: no hay nada que activar | La instalación se para con un aviso y Claude sigue en la versión que tenías. |

Cada popover tiene cuatro partes: **Para qué**, **Sin él**, «Opcional: la app funciona sin él» (en `--ui-success`) y la ruta del panel en
Ajustes del Sistema. El de Archivos y carpetas añade **Estado**: macOS no deja saber si el permiso está activo sin mostrar un aviso, así que la app no lo comprueba.

## Decisiones (★ = la que propongo)

1. **D-1 · Dónde vive.** ★ Una página propia, `#/configuracion`. En el pie del sidebar, «Configuración» sustituye a «Apariencia» y queda activa con `aria-current="page"`; la barra muestra «Configuración › Permisos». La alternativa es el diálogo grande con pestañas (pantalla «Alternativa D-1»). Lo descarto porque tapa la app, no tiene enlace directo para el aviso del editor (D-4) y con tres tarjetas de permisos queda justo a 980×680.
2. **Cómo se pasa de una sección a otra.** ★ **A · pestañas** encima del contenido (Tabs del catálogo, variante default), con una subruta por sección: `#/configuracion/apariencia` y `#/configuracion/permisos`. Así las migas y el enlace del editor llevan directo a Permisos. La alternativa es **B · índice lateral**: con solo dos secciones repite el sidebar y, a 980 px, deja unos 445 px a las tarjetas, que se apilan mal (captura 14).
3. **D-2.** ★ Solo los permisos de la plataforma actual. En Windows y Linux, el estado vacío.
4. **D-3.** ★ Se muestra el estado cuando se puede saber. Gestión de apps dice «Lo necesita: N instancias» si alguna tiene `systemIssue: appManagement` y «Sin uso todavía» si no; Archivos dice «No se puede comprobar»; Administrador, «Solo informativo». El estado sale del registro de instancias y nunca se fuerza un aviso del sistema.
5. **D-4.** ★ El aviso del editor se queda y gana el enlace «Ver en Configuración › Permisos», que abre `#/configuracion/permisos`.
6. **Info.** ★ Es un popover, no un tooltip: se abre con clic, Intro o Espacio y se cierra con Esc (AC-03, accesible con teclado). El botón de 24 px tiene `aria-label="Más información sobre <permiso>"` y `aria-expanded`. Un tooltip solo de hover no cumple AC-03.

Detalles que vienen con la ★ (sí o no a cada uno):

- El icono del pie cambia de `settings-2` (deslizadores) a `settings` (engranaje), el habitual para «Configuración».
- Un punto en la pestaña Permisos cuando algún permiso «Lo necesita».
- El chip «Opcional» en cada tarjeta, además de la frase de la cabecera.

## Medidas

- **Página:** empieza bajo la barra de 52 px, en x = 288 a 1440 (columna del sidebar de 256 + margen de 32). El ancho máximo es de **880 px**, alineado a la izquierda bajo el título. A 980 desplegado quedan 676 px; plegado, 868.
- **Pestañas:** alto `--h-ctl` (36), padding 3, radio 14 y fondo `--surface-soft`. La activa va en `--surface`, con borde `--line-strong`. Icono de 16 px.
- **Tarjeta de permiso:** padding 14/16, radio 16 (`--radius-xl`) y anillo `--text` al 10 %. Tres columnas: tile de 36 px (radio 12, icono de 18), texto y acción. Huecos de 14 px entre columnas y de 10 px entre tarjetas. Nombre en `--fs-heading`; para qué y estado en `--fs-small`; chip en `--fs-micro`.
- **Botón «Abrir Ajustes del Sistema»:** outline sm (32 px, `--h-ctl-sm`) con `external-link` y centrado en vertical.
- **Popover:** 340 px (300 por debajo de 1071), a 10 px del botón, radio 14, fondo `--ui-popover` y flecha de 10 px.
- **Apariencia:** tres tarjetas con opciones en rejilla de 3 y una muestra del tema de 51 px. Las medidas de las opciones son las del diálogo actual: padding de 10 y radio de 12.
- **Diálogo de la alternativa:** 760 px (el de hoy mide 580), radio 24 y padding 28.
- Ningún texto baja de 11 px. Todo usa la escala `--fs-*`, así que también sigue el tamaño Compacto o Grande.

## Dudas abiertas (para el architect)

1. **Archivos y carpetas** depende de HU-0023. Propongo que la tarjeta aparezca solo cuando exista Proyectos.
2. **Cuenta de administrador:** la app podría saber sin avisos si la cuenta es de administrador (pertenencia al grupo `admin`). Si se decide así, el estado pasaría a «Tu cuenta es de administrador» o «Tu cuenta no es de administrador». En la maqueta se queda en informativo.
3. **El enlace exacto a cada panel** de Ajustes del Sistema (`x-apple.systempreferences:…?Privacy_AppBundles` / `Privacy_FilesAndFolders`) se cierra en arquitectura (AC-04).
4. **Apariencia a 980×680:** la vista previa queda bajo el pliegue y el contenido se desplaza.
