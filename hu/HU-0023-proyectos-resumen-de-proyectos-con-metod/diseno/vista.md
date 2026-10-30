# Vista · HU-0023 · Proyectos: resumen de proyectos con metodología v4

Maqueta estática: [`maqueta.html`](maqueta.html). Se abre con doble clic, sin servidor ni red: las fuentes van
incrustadas. Parte del armazón, los tokens y los componentes de la maqueta aprobada de HU-0019, llevados al sistema
armónico común con HU-0022 (sección «Sistema armónico» al final de `<style id="tokens">`). No hay colores nuevos.

- **Pantallas:** Proyectos, Anclar (tras elegir la carpeta) y Página del proyecto.
- **Estados:** con datos, vacía, carpeta v4, no es v4, filtro «en curso», perfil M con 3 repos, carpeta no encontrada.
- **Ejes:** 1440×920 o 980×680; sidebar desplegado, plegado o plegado con tooltip; tamaño de texto; plataforma; tema.
- **Variantes:** «Con git ★» y «Sin git», que corresponden a D-5.

Capturas en [`capturas/`](capturas/), hechas con Chrome sin interfaz sobre la plantilla, sin el panel de la maqueta.
Las de nombre `-completo` estiran la ventana para que se vea toda la página.

Enlace directo: `maqueta.html#pantalla=proyecto&estado=con-datos&ancho=1440&variante=con-git&tema=oscuro&sidebar=desplegado`.

## Pantallas

| Pantalla | Qué muestra | Capturas |
| --- | --- | --- |
| **Sidebar** | Debajo de Instancias aparece la sección **Proyectos**, con «Todos los proyectos», un proyecto por fila y «Anclar proyecto». Cada proyecto lleva su inicial y, a la derecha, el número de historias en curso (el mismo contador que las sesiones de las instancias). Un proyecto roto lleva la inicial en rojo y un triángulo. Plegado, solo quedan las iniciales; el tooltip dice «Code AI Profiles · 4 en curso». A 680 px de alto la lista se desplaza y el final se funde para indicarlo. | 01, 06, 22 |
| **Proyectos** (`#/proyectos`) | Tarjetas en 2 columnas de 6/12 con la inicial, el nombre, la ruta, el perfil y la fase, el reparto de historias por estado (barra y leyenda), 4–5 tecnologías, la última actividad y los repos. Las tarjetas de una fila miden lo mismo y el pie queda siempre abajo. Se ordenan por la última actividad y las rotas van al final. | 01, 02, 05, 06 |
| **Proyectos vacía** | Llamada a «Ancla tu primer proyecto». Explica que solo admite la metodología v4 (`.metodo/config.json`) y que la app no cambia ni ejecuta nada. | 03, 04 |
| **Tarjeta rota** | Se muestra con el **último nombre leído** («Panel Finanzas») y la ruta debajo. Lleva «Carpeta no encontrada», qué hacer, «Leído por última vez el 17 oct» y «Desanclar». | 01, 02 |
| **Anclar · carpeta v4** | Diálogo que aparece tras el selector nativo. Muestra lo encontrado: config versión 4 (con perfil y fase), número de historias y repos. Aclara que se guardan la ruta y el nombre. Ofrece «Elegir otra carpeta» y «Anclar». | 07, 08 |
| **Anclar · no es v4** | La misma comprobación con el paso que falla en rojo, el aviso «No es un proyecto v4» y «No se ancló nada». Ofrece «Cancelar» y «Elegir otra carpeta». | 09, 10 |
| **Página del proyecto** (`#/proyectos/<id>`) | **Cabecera:** inicial, perfil, fase, «Metodología v4», resumen en 2 líneas, quién aprueba, ruta, «Leído a las…», y los botones «Actualizar», «Abrir carpeta» y «Desanclar».<br>**Cifras:** historias por estado, repos, «Desde», «Tiempo en fases» y tokens.<br>**Tecnologías y Repos** (5/12 y 7/12, con la misma altura).<br>**Historias:** tabla filtrable por estado.<br>**Consumo:** por historia y por rol. | 11–20 |
| **Página de un proyecto roto** | Cabecera en rojo con el último nombre, la ruta y cuándo se leyó por última vez, las causas posibles, «Reintentar» y «Desanclar», y la aclaración de que desanclar no toca ninguna carpeta. | 21 |

La página de **Code AI Profiles** usa los datos reales de este repo. **Vetcare** (perfil M, 3 repos), **Lumen Tienda**,
**Agenda Citas**, **landing-2024** y **Panel Finanzas** son inventados.

## Decisiones del mantenedor ya aplicadas

1. **«Tiempo en fases».** Es reloj entre cambios de fase, esperas incluidas. Pista «de N historias cerradas». Para Code
   AI Profiles: 56 h de 7 historias.
2. **Tokens.** El total (572 M) con «98 % caché» y, debajo, la cifra secundaria entrada + salida (2,7 M).
3. **Las descartadas no suman.** Quedan fuera del tiempo, de los tokens, del consumo por historia y por rol. En la
   tabla siguen, con su tiempo y sus tokens tachados en gris, y el pie lo dice: «Suman las 7 terminadas: 56,4 h ·
   571,5 M. Las descartadas, en gris, no suman». Antes daban 114 h y 892 M.
4. **La app guarda la ruta y el último nombre leído.** Un proyecto roto se ve con ese nombre y la ruta debajo. El
   diálogo de anclar dice «Se guardan la ruta y el nombre». **Esto cambia la regla de negocio nueva de la historia:**
   antes decía «la app guarda solo la ruta».

## De dónde sale cada dato (todo de archivos, sin ejecutar nada)

| Dato en pantalla | Archivo | En la maqueta (Code AI Profiles) |
| --- | --- | --- |
| Nombre, resumen, perfil, fase | `.metodo/config.json` → `proyecto.nombre`, `proyecto.resumen`, `perfil`, `fase` | Code AI Profiles · S · desarrollo |
| Aprueba | `figuras.aprueba` | Braiyan Rodriguez (mantenedor) |
| Repos, tipo y ruta | `repos[]` | 1 · `otro` · `.` |
| Validación v4 | `.metodo/config.json` existe y `version === 4` | 4 |
| Tecnologías | `stack.gestor`, `stack.packs` y los manifiestos de cada repo (`package.json`, `Cargo.toml`) | pnpm 12, frontend-react-vite, React 19, Vite 6, Tailwind CSS 4, React Router 7, TypeScript 5.7, Tauri 2, Rust |
| Historias: título, estado, fase, área, creada | Frontmatter de `hu/HU-####-*/hu.md`; las cuentas coinciden con `hu/INDEX.md` | 14 · 4 en curso · 1 en espera · 7 terminadas · 2 descartadas |
| Tiempo en fases | Suma de `minutosTotales` de las **terminadas** | 3383 min = 56,4 h (7 historias) |
| Tokens | Suma de `agentes[].tokens.total` + `orquestador.porFase[].tokens.total` de las terminadas | 571,5 M |
| % caché y entrada + salida | `cacheLectura / total` y `entrada + salida` de los mismos tokens | 98 % · 2,7 M |
| Consumo por rol | `agentes[].rol` sumado; el orquestador desde `porFase` (`aproximado: true`), sin descartadas | orquestador ≈ 327,0 · frontend 143,5 · architect 65,6 · backend 25,6 · general-purpose 9,9 M |
| Desde | El `creada` más antiguo → la última línea de cualquier `seguimiento.md` (días de calendario, contando ambos extremos) | 27 oct → 29 oct = 3 días |
| Última actividad | La última fila con fecha de todos los `seguimiento.md` | 29 oct 00:27 |
| Rama y último commit (D-5) | `.git/HEAD` y la fecha del objeto al que apunta (o `logs/HEAD`), sin red ni `git` | `hu-0022-configuracion-unificada` · `6421f84` |
| Último nombre (proyecto roto) | Lo guarda la app al anclar y al refrescar | Panel Finanzas |

No se lee nada de `~/.claude`, ni de los perfiles, ni el código fuente aparte de los manifiestos.

## Decisiones de diseño

- **Cuatro colores de estado, siempre iguales**, en la barra, la leyenda, la tabla y las pestañas. Todos son tokens que
  ya existen. Además, «en espera» lleva **trama a 45° y marcador hueco** (ver la auditoría).

  | Estado | Oscuro | Claro |
  | --- | --- | --- |
  | En curso | `--primary` | `--primary-bright` |
  | En espera | `--ui-warning` | `--ui-warning` |
  | Terminada | `--ui-success` | `--ui-success` |
  | Descartada | `--quiet` | `--quiet` |

  Las barras de consumo son de un solo color neutro. No hay gráficos decorativos, tortas ni colores por proyecto.
- **La inicial como identidad del proyecto**, en un cuadrado neutro de 16 (sidebar), 40 (tarjeta) o 64 (página, igual
  que el avatar de la página de instancia).
- **El contador del sidebar es «en curso»**, igual que el de sesiones en las instancias. No se usa el punto de estado
  porque en las instancias significa «en marcha».
- **Confirmación al anclar**, para enseñar lo detectado antes de guardar. *Alternativa:* anclar directamente.
- **Desanclar no pide confirmación**, porque no toca la carpeta y se deshace anclando otra vez.
- **La columna «Creada» sale de la tabla.** Así las columnas encajan en la retícula (4/2/2/2/1/1). La fecha queda en el
  título emergente de cada fila, y el orden por número ya es el orden de creación.

## ★ Lo que propongo para cada decisión de la historia

1. **D-1 · Solo leer archivos ★.** Todo sale de la tabla de arriba; no se ejecuta `metodo.mjs` ni `metricas.mjs`.
2. **D-2 · Tecnologías de los manifiestos y de los packs ★**, agrupadas y con su origen; con varios repos, cada repo
   lleva las suyas.
3. **D-3 · Dos cifras ★:** «Desde» en días y «Tiempo en fases» en horas.
4. **D-4 · Refresco al entrar y con «Actualizar» ★**, con «Leído a las…» visible.
5. **D-5 · Con git ★:** rama y SHA corto con la fecha relativa, sin el mensaje del commit. La variante «Sin git»
   enseña la alternativa.

## Auditoría UX

Marco: la skill `artifact-design` (composición, espaciado, jerarquía), la skill `dataviz` (cifras, barras por estado y
consumo) y las 10 heurísticas de Nielsen. Las medidas son estilos calculados con Chrome sin interfaz sobre 8 pantallas
(lista, vacía, los dos diálogos, Code AI Profiles, Vetcare, 980×680 y la rota). Cada elemento visible se comprobó
contra la escala; no son estimaciones.

### Sistema armónico aplicado (común con HU-0022)

- **Retícula de 4 px.** Espaciado solo de la escala: 4, 8, 12, 16, 24, 32, 48.
- **Ritmo vertical:**
  - dentro de un componente, 4–12;
  - entre componentes de una sección y en las retículas, 16–24;
  - entre secciones de la página, 32.
- **Padding de tarjeta por nivel:** 24 en las tarjetas de sección y en las de la lista; 16 en las cifras.
- **Interlineado:** 16 (micro y small), 20 (cuerpo y títulos de tarjeta), 24 (título de página), 28 (cifras y diálogo).
- **Controles y badges:** controles de 24, 32, 36 y 40; badge de 20 (`--ctl-badge`).
- **Iconos:** 16 con el texto y 20 en los títulos de tarjeta (32 solo en el cuadrado de 64 de la página rota).
- **Excepciones medidas y justificadas:**
  - los 84 px a la izquierda de la barra en macOS, fijados por los semáforos;
  - los bordes de 1 px;
  - el hueco de 2 px entre segmentos de la barra, que es una especificación de dataviz.

### Medidas antes y después

| Medida | Antes | Después |
| --- | --- | --- |
| Valores fuera de la escala (8 pantallas) | **274 distintos en 3772 elementos** (gaps de 2/3/5/6/10/14/20; paddings de 3/5/6/10/28; márgenes de 2/6/10) | **1**: los 84 px de los semáforos (justificado) |
| Interlineados que no son múltiplo de 4 | 15,95 · 17,4 · 20,3 · 21,75 · 11 · 13,2 … | 16 · 20 · 24 · 28 |
| Texto por debajo de 11 px | 1 (`small` de 10 px en el consumo por rol) | 0 |
| Cifras: anchos, 1440 | 355,3 + 4 × 171,7, sin proporción; gutter 12 | **4/12 + 4 × 2/12**: 347,3 + 4 × 161,7; gutter 24 |
| Cifras: alturas | 138 todas; a 980, 116,6 y 110,8 | 148 todas; a 980, 12/12 (124) arriba y 4 × 3/12 de 148 |
| Tarjetas de la lista | 544,5 × 202,3; gap 16; padding 16 | 2 × 6/12 de 226 de alto en cada fila; gap 24; padding 24 |
| Tecnologías / Repos (Code AI Profiles) | 447,5 × 262,5 y 626,5 × 156,4: alturas distintas, sin proporción | **5/12 y 7/12**: 440,2 × 276 y 625,8 × 276 |
| Ídem, Vetcare | 277,1 y 305 | 330 y 330 |
| Columnas de la tabla, 1440 | 414 / 132 / 140 / 132 / 76 / 76 / 88 (7 columnas a mano) | 355,3 / 177,7 / 177,7 / 177,7 / 88,8 / 88,9 = **4/2/2/2/1/1** de 12 |
| Columnas de la tabla, 980 | 214 / 124 / 112 / 76 / 88 | 207,3 / 103,7 × 4 = **4/2/2/2/2** (Área oculta) |
| Separación entre secciones de la página | 16 | 32 (lista: 16 dentro de la misma sección) |
| Padding de las tarjetas | 16 en todas | 24 en las de sección; 16 en las cifras |
| Inicial del proyecto | 18 × 18 (sidebar), 40, 64 | **16** (igual que los iconos), 40, 64 |
| Iconos | 14, 16, 20, 22, 30 | 16 y 20 (32 en el cuadrado de 64) |
| Filas del sidebar a 980×680 | **25,5 px, aplastadas** por el flex | 32 px; la lista se desplaza con un fundido abajo |
| Pestañas de filtro | contenedor de padding 3, pestaña de 28, radio 9 | padding 4, pestaña de 24, radio 8 (= 12 − 4) |
| Diálogo | padding 28, gap 20, radio 26 | 24, 24, 24 |
| Radios en uso | 2, 5, 9, 10, 12, 14, 16, 20, 26 | 4, 8, 12, 16, 20, 24 |

### Radios (propuesta para DESIGN.md, que no se toca)

La regla es radio interior = radio exterior − padding, con un mínimo de 8 (4 en piezas de 16 px o menos).

| Token | Hoy | Propuesta | Por qué |
| --- | --- | --- | --- |
| `--radius-sm` | 9 | **8** | chips, filas del sidebar (panel 16 − margen 8), pestañas (12 − 4), filas dentro de tarjetas y diálogos |
| `--radius-md` | 12 | 12 | controles de 36/40, tarjeta de 40 |
| `--radius-lg` | 14 | **16** | panel del sidebar y avisos sueltos; así 16 − 8 = 8 en sus filas |
| `--radius-xl` | 16 | 16 | tarjetas |
| `--radius-2xl` | 20 | 20 | la ventana en Windows |
| diálogo (`rounded-3xl`) | 26 | **24** | con padding 24, lo de dentro baja al mínimo de 8 |

Botones pequeños de 32: radio 10 → 8. `kbd` y la etiqueta BETA: radio 5 → 4.

### Heurísticas de Nielsen

| # | Heurística | Hallazgo | Estado |
| --- | --- | --- | --- |
| 1 | Visibilidad del estado del sistema | «Leído a las 02:31» en la lista y en la página. Contador «en curso» en el sidebar. La carpeta rota se ve en la lista, el sidebar y la página. | Ya estaba |
| 2 | Coincidencia con el mundo real | «Trabajo registrado» sugería esfuerzo, pero el dato es reloj con esperas. | **Corregido**: «Tiempo en fases» |
| 3 | Control y libertad | Desanclar no toca la carpeta y se deshace anclando otra vez. El diálogo de anclar tiene «Elegir otra carpeta» y cerrar. | Ya estaba |
| 4 | Consistencia y estándares | Había radios, gaps e iconos de tamaños sueltos (9/10/14/26, 14/22/30). | **Corregido** con la escala. Los colores de estado son iguales en todas partes. |
| 5 | Prevención de errores | El diálogo enseña qué se detectó antes de anclar; una carpeta no v4 no se ancla. | Ya estaba |
| 6 | Reconocer antes que recordar | Las pestañas llevan el número de cada estado. La tabla repite el estado en texto. Los títulos largos se cortan, pero el título emergente los muestra con la fecha de creación. | Ya estaba; tooltip añadido |
| 7 | Flexibilidad y eficiencia | Filtro por estado en un clic. Desde el sidebar se salta a cada proyecto. No hay atajo de teclado propio. | Abierto, menor |
| 8 | Diseño estético y minimalista | Pocos colores, sin gráficos decorativos. Tecnologías y Repos no casaban en altura, y las cifras no tenían proporción. | **Corregido**: 5/7 con la misma altura; 4 + 2 × 4 |
| 9 | Ayudar a reconocer y recuperarse de errores | «No es v4» dice qué paso falla (config de la versión 3, se necesita la 4). La carpeta rota da las causas y la salida. | Ya estaba |
| 10 | Ayuda y documentación | Cada bloque dice de qué archivo sale el dato. «≈» y una nota explican el orquestador aproximado. | Ya estaba |

### Lo que dice dataviz

- **Cifras (stat tiles):**
  - etiqueta, valor compacto en semibold («572 M», «56 h») y una pista; sin deltas, porque no hay periodo con el que
    comparar;
  - la cifra secundaria de tokens va debajo, en micro y sin color;
  - ningún número se pinta con el color de una serie: el texto usa siempre los tokens de texto.
- **Barra por estados:**
  - es una sola barra apilada, con segmentos separados por 2 px y extremos de 4 px de radio en 8 px de alto;
  - la leyenda siempre está y lleva los números, así que la identidad nunca depende solo del color;
  - la tabla hace de vista en datos;
  - cada segmento tiene su título emergente («4 en curso») y la barra, un `aria-label` con el reparto.
- **Validador de paleta** (`validate_palette.js`, todos los pares), sobre los cuatro colores de estado:
  - Oscuro: en curso ↔ en espera da ΔE 8,8 (por debajo de 15) y **1,8 en protanopía**. No se distinguen solo por el
    color.
  - Claro: terminada ↔ en espera da ΔE 13,0 y 6,5 en deuteranopía.
  - Arreglo, la codificación secundaria que admite dataviz: «en espera» lleva **trama a 45°** en la barra y
    **marcador hueco** en la leyenda, las pestañas y la tabla; además van los huecos de 2 px y las etiquetas siempre
    visibles.
  - Son colores de estado, no de serie: la regla de «nunca solo color» se cumple porque siempre van con su texto.
- **Consumo:**
  - barras horizontales ordenadas de mayor a menor, de un solo color neutro;
  - valor directo al final y extremos de 4 px;
  - el orquestador lleva «≈»;
  - no hay segundo eje ni colores por historia.

### Contraste (WCAG 2; las superficies se compusieron sobre el fondo real)

| Color | Uso | Oscuro (tarjeta · ventana · diálogo) | Claro (tarjeta · ventana · diálogo) |
| --- | --- | --- | --- |
| `--text` | texto | 12,8 · 14,2 · 11,1 | 14,2 · 12,4 · 14,2 |
| `--muted` | texto secundario (11–12 px) | 6,4 · 7,1 · 5,5 | 5,1 · **4,5** · 5,1 |
| `--ui-primary-text` | badge «Metodología v4», enlaces | 7,1 · 7,9 · 6,2 | 5,3 · 4,6 · 5,3 |
| `--danger` | «Carpeta no encontrada» | 6,1 · 6,8 · 5,3 | 4,7 · 4,1 · 4,7 |
| `--ui-success` | «Proyecto v4» | 6,3 · 7,0 · 5,5 | 5,0 · 4,4 · 5,0 |
| `--ui-warning` | «No es v4» | 6,5 · 7,2 · 5,6 | 5,2 · 4,6 · 5,2 |
| En curso (marca) | barra y puntos | 7,1 | **3,0** (`#ff5f35`; con `#ff8d6c` daba 2,2) |
| En espera (marca) | barra y puntos | 6,5 | 5,2 |
| Terminada (marca) | barra y puntos | 6,3 | 5,0 |
| Descartada (marca) | barra y puntos | 3,1 | 3,0 |

- Todos los textos pasan AA (4,5:1) donde se usan.
- `--muted` en claro sobre la ventana queda justo en 4,5. Ahí solo va la línea «4 proyectos anclados…».
- `--danger` en claro sobre la ventana daría 4,1, pero solo se usa sobre tarjeta (4,7).
- `--quiet` no se usa para texto, solo para puntos y separadores.
- Las marcas llegan a 3:1, salvo «en curso» en claro: 2,98, lo que redondea a 3,0 (ver lo que queda abierto).

### Lo que queda abierto

- **«En curso» en claro da 2,98:1**, un pelo por debajo de 3:1. Lo alivian la leyenda con número y la tabla. Para
  pasar holgado haría falta un terracota más oscuro, que no es un token de la app.
- **El botón primario** (blanco sobre `#ff5f35`) da 3,0:1. No llega a AA para texto de 14 px. Es de toda la app
  (HU-0016), no de esta historia; conviene una historia de contraste.
- **La propuesta de radios** (9 → 8, 14 → 16, 26 → 24) se aplica en esta maqueta y en la de HU-0022. Pasarla a
  `DESIGN.md` y `ui-theme.css` es decisión del mantenedor.
- **A 980×680 el sidebar se desplaza.** Con 3 instancias y 4 proyectos no cabe. Antes las filas se aplastaban a
  25,5 px; ahora miden 32 y la lista se desplaza con un fundido. Si molesta, se pueden plegar los grupos.
- **Los títulos de historia se cortan más** (Historia ocupa 4/12) para que la tabla encaje en la retícula. El título
  completo está en el título emergente.
- **La regla de negocio nueva** debe decir «la app guarda la ruta y el último nombre leído» (decisión 4).
- **El pie del sidebar dice «Configuración»**, adelantando HU-0022.

## Nota del marco

Hay dos cambios genéricos en el marco de HU-0019, documentados en su cabecera:

- Si el estado elegido no existe en la pantalla, se usa el primero que sí.
- `aside button[hidden]` ahora se oculta.
