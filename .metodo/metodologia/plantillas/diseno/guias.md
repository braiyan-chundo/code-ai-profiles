# Guías de diseño de {{PROYECTO}}

> Las escribe product-design en la fundación de diseño y las aprueba {{APRUEBA}}. Hasta que estén
> aprobadas, ninguna historia maqueta una vista. Estado: **pendiente de la fundación**.

Dirección visual: `docs/diseno/direccion.md` · Sistema en Claude Design: <enlace> · Showcase en el repo: <ruta>

## Niveles de vista

| Nivel | Qué es | Cómo se arma en este proyecto |
| --- | --- | --- |
| N0 · Marco | Navegación, cabecera, área de contenido | <barra lateral colapsable en escritorio; barra inferior en teléfono> |
| N1 · Colección | Listados, tableros, paneles | <título + acción principal; filtros; tabla o tarjetas; vacío, cargando, error> |
| N2 · Detalle | Un elemento y lo relacionado | <cabecera con estado y acciones; secciones o pestañas; historial> |
| N3 · Edición | Crear o editar | <página si es largo; panel lateral si es corto; validación en línea> |
| N4 · Confirmación | Diálogos, avisos, deshacer | <diálogo solo para lo destructivo; lo demás, aviso con deshacer> |

## Rejilla y espacio

Anchos máximos, columnas, cortes (1440 · 1280 · 768 · 390), la escala de espacio.

## Densidad

Cómoda o compacta, y dónde se usa cada una.

## Patrones

- **Formularios**: etiqueta arriba, ayuda debajo, error en el campo, acción principal a la derecha o abajo.
- **Tablas**: …
- **Estados vacíos**: ocupan poco; dicen qué hacer.
- **Retroalimentación**: cargando (esqueleto o indicador), éxito, error accionable.
- **Navegación y migas**: …

## Teléfono

Qué se quita (no se encoge la letra), objetivos de 44 px, una mano.

## Accesibilidad

WCAG 2.2 AA como mínimo: contraste, foco, teclado, no solo color.

## Textos

Tono, tratamiento (tú/usted), formatos de fecha, moneda y números en el idioma de la interfaz ({{IDIOMA_INTERFAZ}}).
