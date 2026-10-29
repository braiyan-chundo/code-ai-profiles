---
id: HU-0019
titulo: "Header compacto, sidebar flotante y tipografía legible"
estado: terminada
fase: cierre
area: interfaz
entrega: 1
prioridad: media
creada: 2026-10-28
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: []
reglas: []
depende: [HU-0016]
---

# Header compacto, sidebar flotante y tipografía legible

Como mantenedor de Code AI Profiles
quiero una cabecera que ocupe menos, un sidebar separado del borde como un panel flotante y textos que se lean
bien y crezcan de verdad con «Grande»
para tener más espacio útil y no forzar la vista.

## Petición original

> «me gustaria que ajustaramos un poco algo de las vistas: el header me gustaria que no ocupe tanto espacio; el sidebar me gustaria que tuviera un diseño mas separado (ver imagen1) manteniendo el colapsable en tamaño icono; mejorar la typografy ya que el tamaño de algunas letras estan demasiado pequeñas a pesar de que en aparicencia se colocan grandes; importante si hacer maquetas de lo pedido antes de desarrollar» — Braiyan Rodriguez (mantenedor), 2026-10-28

Referencia del sidebar: `diseno/referencia-sidebar.png` (imagen 1 de la conversación): un panel con bordes
redondeados separado del borde de la ventana, secciones con contadores, un grupo con avatares y el usuario al
pie.

**Maqueta primero:** el dial de diseño del proyecto está apagado, pero el mantenedor pide maquetas para esta
historia. La maqueta (`diseno/maqueta.html`) se aprueba antes de implementar.

## Problema

- **Cabecera:** la barra de título (94 px en macOS desde HU-0016) y la cabecera de cada página suman mucha altura
  antes del contenido.
- **Sidebar:** va pegado al borde de la ventana y se lee como una columna más, no como un panel.
- **Tipografía:** el ajuste de tamaño de Apariencia solo cambia las variables `--session-*` (título 10/12/14 px,
  metadatos 7/9/11 px, pistas 6 px en compacto), es decir, solo el texto de las sesiones. El resto de la interfaz
  no cambia con «Grande», y varios textos quedan por debajo de lo legible.

## Alcance

- Una maqueta estática con las tres pantallas (dashboard, instancia, original) en sus estados principales,
  oscuro y claro, a 1440×920 y 980×680, con el sidebar desplegado y plegado y los tres tamaños de texto.
- Tras su aprobación: cabecera compacta, sidebar flotante plegable a iconos y una escala tipográfica que
  respete un mínimo legible y crezca con el ajuste de Apariencia en toda la interfaz.
- Actualizar `DESIGN.md`, `tokens.css`, la skill de UI y las guías de diseño.

## Fuera de alcance

- Cambiar qué hace cada pantalla, acción o aviso.
- Nuevas pantallas o datos.
- La paleta y la identidad de `DESIGN.md`, salvo la escala tipográfica.

## Decisiones por defecto (★)

- ★ **D-1 · Una sola barra superior.** La barra de título y la cabecera de la página se funden en una franja
  baja (≈48–56 px) que deja libres los controles de ventana de cada plataforma. *Alternativa:* mantener las dos
  y reducir sus alturas.
- ★ **D-2 · Sidebar flotante.** Un panel con margen respecto al borde, esquinas redondeadas y su propia
  superficie, como en la referencia; plegado a iconos sigue siendo un panel estrecho. *Alternativa:* sidebar
  pegado con un separador más marcado.
- ★ **D-3 · Escala tipográfica global.** El ajuste de Apariencia (compacto, normal, grande) escala toda la
  interfaz desde una base (13, 14 y 16 px) y ningún texto baja de 11 px. *Alternativa:* solo subir los
  mínimos y dejar el ajuste para las sesiones.

## Criterios de aceptación

### AC-01 · Maqueta aprobada antes de construir

Existe `diseno/maqueta.html` con las pantallas, estados, temas, tamaños y variantes de esta historia, y la
persona la aprueba antes de que empiece la implementación.

### AC-02 · Cabecera compacta

La altura desde el borde superior de la ventana hasta el primer contenido de cada página es menor que hoy, con
los controles de ventana de macOS, Windows y Linux sin solaparse.

### AC-03 · Sidebar flotante y plegable

El sidebar se ve como un panel separado del borde, como en la referencia, y se pliega a iconos con tooltips,
conservando el estado al reabrir.

### AC-04 · Textos legibles que crecen con «Grande»

Ningún texto de la app baja de 11 px en el tamaño normal, y al elegir «Grande» en Apariencia crece todo el texto
de la interfaz, no solo el de las sesiones. «Compacto» lo reduce sin bajar del mínimo.

### AC-05 · Nada se pierde

Cada acción, aviso y atajo sigue igual, en los tres temas y con la ventana al mínimo.

## Reglas de negocio afectadas

Ninguna: cambia el aspecto, no lo que la app hace.

## Para la persona usuaria

1. **D-1**: una sola barra superior o dos más bajas.
2. **D-3**: el ajuste de tamaño escala toda la interfaz.
3. **D-2**: el sidebar flotante como en la referencia.

**Pendiente humano:** aprobar la maqueta; después, recorrer la app en macOS, Windows y Linux.

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
- [x] Commits en cada repo tocado con `HU: HU-0019`. **Sin push, sin publicar, sin desplegar**
- [x] Lo que solo comprueba una persona, declarado como pendiente humano

## Cierre

2026-10-28, cerrada por el orquestador sobre el veredicto «Aprobado, cierra» de Braiyan Rodriguez.

SHA por repositorio, con una línea de qué hace cada uno (code-ai-profiles, rama `hu-0019-ajustes-visuales`):
- `4a612d3`: semáforos de macOS en (20, 19).
- `00ca976`…`6788ed1`: escala tipográfica, barra única de 52 px, sidebar flotante, Apariencia, documentación.
- `5ba9af8`: correcciones R-3..R-8 de la revisión técnica.
- `39f4f05`, `a2f0533`, `42b8661`, `3cdcb4d`, `bebded6`, `6634a43`, `e36b1bc` y el de cierre: historia, maqueta, arquitectura, revisión, verificación y CHANGELOG.

★ aceptadas tal como estaban: D-1 (variante A), D-2 (sidebar flotante) y D-3 (escala global), con los detalles de A.

Pendientes humanos (nadie los vio; no se dan por hechos):
- Windows y Linux reales: controles, arrastre y la esquina del panel frente al arco del marco de Windows.
- El dashboard vacío y el tema «Sistema».

Deuda declarada:
- La rama sale de `hu-0017-actualizar-original-macos`, que aún no está fusionada: el PR de esta historia va después del de la HU-0017.
- Iconos y avatares no crecen con «Grande».
