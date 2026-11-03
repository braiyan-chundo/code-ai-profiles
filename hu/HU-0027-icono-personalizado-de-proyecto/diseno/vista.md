# Vista · HU-0027 · Icono personalizado de proyecto

La maqueta es [`maqueta.html`](maqueta.html): se abre con doble clic y no necesita servidor ni red. Reproduce la página
del proyecto (`ProjectHero`), «Todos los proyectos» (`ProjectCard`, `BrokenProjectCard`), el grupo «Proyectos» del sidebar
(`ProjectsSidebarGroup`) y el diálogo «Icono del proyecto» (sección «Icono de la instancia» de `InstanceEditor`) con los
tokens de `src/styles/tokens.css` y `ui-theme.css`, las medidas del catálogo y las fuentes locales. No se ha tocado `src/`.
El layout es el actual de la rama: sidebar flotante a toda la altura (cabecera con 32 px arriba para los semáforos de
macOS) y el botón de plegar en la cabecera de página, antes de las migas.

- **Ejes** (barra superior): escena, tema oscuro/claro, 1440×920 / 980×680 y sidebar desplegado/plegado. Enlace directo:
  `#escena=reposo&tema=oscuro&ancho=1440&sb=abierto` (con `&solo=1` se ve solo la ventana a tamaño real; `&sbdesplaza=N`
  desplaza la lista del sidebar).
- **Proyectos de ejemplo:** happy-office (con icono), Code AI Profiles (inicial C), Vetcare (con icono tipo foto) y Panel
  Finanzas (roto). Las dos imágenes son SVG incrustados, no archivos ni URL.
- Todo son componentes del catálogo: `Button` (outline `sm` y `lg`, destructivo `sm`, `ghost icon-sm`), `Dialog`, `Badge`,
  `Card`, `Tooltip` y `FieldError`. Ninguno es nuevo; el avatar-botón es un `<button>` sobre `ProjectInitial`.

## Escenas y capturas

| Escena (`escena=`) | Qué enseña | Capturas |
| --- | --- | --- |
| **reposo** | Página de happy-office: icono de 64 px en la cabecera, junto a Actualizar · Abrir carpeta · Desanclar. Sidebar con las imágenes de 16 px (mismo radio 4 que la inicial), la inicial C y la inicial roja con triángulo. | 01 |
| **hover** | El avatar con el ratón encima: velo y lápiz centrado, tooltip «Cambiar icono» debajo. | 02 |
| **foco** | Lo mismo con el foco de teclado: anillo de 2 px en `--ring` además del velo y el lápiz. (Escena extra.) | 03 |
| **dialogo-vacio** | «Icono del proyecto» sobre Code AI Profiles: vista previa con la inicial, el texto «Se guarda en los datos de Code AI Profiles; el proyecto no se modifica.», «Seleccionar imagen» y «Guardar» desactivado. | 04 |
| **dialogo-con-icono** | Sobre happy-office: vista previa con su imagen, «Reemplazar imagen» y «Quitar»; «Guardar» desactivado hasta que haya cambio. | 05 |
| **dialogo-listo** | Imagen nueva elegida: la vista previa cambia y «Guardar» se activa. (Escena extra.) | 06 |
| **error** | «El icono debe ser PNG o JPEG.» bajo los botones; el icono no cambia y «Guardar» sigue desactivado. | 07 |
| **todos** | «Todos los proyectos» con avatar de 40 px: dos con imagen, una con inicial y la rota con la carpeta tachada. | 08 |
| **plegado** | Sidebar de 48 px: los proyectos con icono enseñan su imagen de 16 px; el resto, su inicial; tooltip «Vetcare · 1 en curso». | 09 |

Capturas en [`capturas/`](capturas/): `NN-escena-ancho-tema.png`; las 9 escenas en 1440 oscuro y variantes en claro (01, 02,
05, 08, 09) y en 980 (02, 04, 08, 09).

## Decisiones (★ = la que propongo)

1. **Hover: velo y lápiz centrado ★.** El velo es `--surface` al 70 % (sin colores nuevos) y el lápiz, de 24 px, va en
   `--text`: se lee igual sobre una imagen clara u oscura y en los dos temas (en oscuro el velo oscurece; en claro, aclara).
   Alternativa: insignia de 24 px en la esquina inferior derecha, que deja ver la imagen entera pero tapa una parte del
   icono en 64 px y choca con su aro.
2. **Sin pista en reposo (D-1).** Nada marca el avatar como pulsable hasta que se apunta o se enfoca; el botón tiene
   `aria-label` «Cambiar icono del proyecto» y el tooltip sale también con el foco de teclado. Alternativa: lápiz
   pequeño siempre visible; ensucia la cabecera cuando no se quiere cambiar nada.
3. **Aro fino sobre la imagen.** Una línea de 1 px (`--line-strong`) pintada encima de la imagen, igual que el aro de la
   inicial. Sin él, un logo con fondo blanco (o transparente) se funde con la tarjeta en claro, sobre todo a 16 px.
   Alternativa: sin aro, como el avatar de las instancias.
4. **Mismo radio que la inicial en los cuatro tamaños** (4 / 12 / 16 / 16 en vista previa de 72): la imagen se recorta al
   centro dentro de él, como en las instancias.
5. **El diálogo copia la sección de `InstanceEditor`:** cuadro `surface-soft` con vista previa de 72 px (radio 16),
   texto de 12 px, «Seleccionar/Reemplazar imagen» outline `sm` y «Quitar» destructivo `sm`. Solo se quita el encabezado
   «Icono de la instancia» (aquí es el título del diálogo, con el nombre del proyecto debajo). Anchura 576 (la del
   catálogo) y pie con «Cancelar» y «Guardar» de 40 px (`lg`), como el editor de instancias.
6. **Proyecto roto (D-3, D-4).** Ni la tarjeta ni el sidebar ni la página usan el icono: inicial roja de 16 px con
   triángulo, o carpeta tachada en 40 y 64. En esa página el avatar no lleva velo ni lápiz (no hay escena aparte: es
   `ProjectBrokenPage`, sin cambios).
7. ★ **Texto del error.** La historia pide «El icono debe ser PNG o JPEG.»; las instancias dicen «Selecciona una imagen
   PNG o JPEG válida.» (`icon-validation.ts`). Hay que elegir uno: reutilizar los textos de las instancias mantiene una
   sola voz; el de la historia es más corto. Los otros dos errores (peso y dimensiones) irían igual, en el mismo sitio.

## Para quien construya

- **`ProjectInitial`:** gana una variante con imagen (`iconSrc`), con el mismo `SIZES`. La imagen va con `object-cover`
  y un `after` con `ring-1 ring-(--line-strong) ring-inset`; con imagen, `broken` sigue ganando (D-3).
- **`ProjectHero`:** el avatar pasa a ser `<button>` con `group`; el velo es `bg-(--surface)/70 opacity-0
  group-hover:opacity-100 group-focus-visible:opacity-100` con `PencilIcon` de `size-6`, y el foco `focus-visible:ring-2
  ring-ring`. Tooltip del catálogo, `side="bottom"`.
- **Sidebar:** `ProjectsSidebarGroup` pasa la imagen a `ProjectInitial size="sm"`; plegado no cambia nada más.
- **Diálogo:** `Dialog` + `DialogContent` por defecto; «Guardar» desactivado mientras no haya un cambio válido.
- Observación fuera de esta historia: a 980 px de ancho las tarjetas de «Todos los proyectos» recortan el nombre
  («ha…») porque las insignias de perfil y fase no se encogen; ya ocurre hoy con la inicial.

## Autoevaluación de espaciado y proporción

No hay una skill de UX dedicada en este entorno; se revisó contra la retícula y la escala de `DESIGN.md`.

| Punto | Medida | Veredicto |
| --- | --- | --- |
| Avatar de la página | 64 px, radio 16, a 24 px del borde de la tarjeta; el velo lo cubre entero | Correcto |
| Icono del lápiz | 24 px en 64 | Correcto: ni tapa la imagen por completo ni se pierde |
| Tooltip | 8 px de separación, relleno 8 × 12, radio 8 (catálogo) | Correcto |
| Icono en el sidebar | 16 px, radio 4, hueco de 8 px hasta el nombre | Correcto; a 16 px un logo complejo pierde detalle (pendiente humano de la HU) |
| Tarjeta de la lista | avatar 40, radio 12, hueco 12, relleno 24 | Correcto |
| Diálogo | relleno 24, hueco 24; sección con relleno 16 y hueco 12; vista previa 72 | Correcto |
| Escala de texto | todo en `--fs-*` / `--lh-*`; ningún tamaño nuevo | Correcto |
| Foco | anillo de 2 px en `--ring` (el mismo de todos los controles) | Correcto |
| 980 × 680 | la cabecera pasa los botones bajo el texto, como hoy; el diálogo se mantiene centrado | Correcto |
| Riesgo | el velo al 70 % sobre una imagen muy clara en tema claro deja el lápiz con menos contraste (no medido) | Aceptable a ojo; subir a 80 % si se ve flojo |

## A decidir

- Velo y lápiz centrado frente a insignia en esquina (1).
- Aro fino sobre la imagen (3).
- Texto del error: el de la historia o el de las instancias (7).
