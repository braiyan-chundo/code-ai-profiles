---
name: {{SLUG}}-diseno
description: Sistema de diseño de {{PROYECTO}} - dirección visual, tokens, guías de layout y niveles de vista, estructura fija de maqueta, oficio de UX/UI y textos. Cárgala antes de diseñar o construir cualquier pantalla.
---

# Diseño · {{PROYECTO}}

<!-- La rellena product-design en la fundación de diseño (o, sin fundación completa, en la primera historia
     con pantalla). Hasta entonces, cada sección conserva su
     texto guía y la línea «Pendiente: fundación de diseño». -->

## La regla de oro

Ni un color, un tamaño ni un componente fuera del sistema. Si algo falta, se añade al sistema (con su
skill `{{SLUG}}-ui-<id>` y su línea en el índice `{{SLUG}}-componentes`) antes de usarlo.

## Dirección visual

Pendiente: fundación de diseño. (Resumen de `docs/diseno/direccion.md`: personalidad, referencias, lo
que se evita.)

## Tokens

Pendiente: fundación de diseño. (Dónde viven en el repo y en Claude Design; color con escala de
estados; claro y oscuro; tipografía; escala de espacio; radios; sombras; movimiento.)

## Guías

Resumen de `docs/diseno/guias.md`: niveles de vista N0–N4 y cómo se arma cada uno, rejilla, densidad,
formularios, tablas, estados vacíos, teléfono.

## La maqueta

Estructura fija desde `.metodo/metodologia/plantillas/diseno/maqueta-shell.html`: barra lateral con
pantallas, estados, tamaños, variantes (★) y tema; la pantalla a la derecha; enlace directo a cada
combinación. Vive en `hu/HU-####-*/diseno/`.

**Es estática**: HTML y CSS por pantalla × estado × variante, sin lógica, sin el stack del proyecto, sin
servidor. Una interacción es otro estado estático; entre pantallas, `data-ir`. Cada ★ con dos o tres
variantes y su nota, comparables lado a lado.

## El oficio

- Nielsen; Fitts, Hick, Jakob; una acción principal por vista.
- WCAG 2.2 AA: contraste, foco, teclado, objetivos de 44 px, nunca el color solo.
- Un nivel de contenedor; bordes como excepción; una escala de espacio; datos en lenguaje humano.

## Textos

Tono, tratamiento, formatos ({{IDIOMA_INTERFAZ}}).

## Skills de diseño del proyecto

Las elegidas en la fundación (packs de diseño), por nombre.
