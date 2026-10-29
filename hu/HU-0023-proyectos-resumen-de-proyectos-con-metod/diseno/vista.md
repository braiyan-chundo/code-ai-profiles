# Vista · HU-0023 · Proyectos: resumen de proyectos con metodología v4

Maqueta estática: [`maqueta.html`](maqueta.html). Se abre con doble clic, sin servidor ni red: las fuentes van
incrustadas. Usa el armazón, los tokens y los componentes de la maqueta aprobada de HU-0019, más los estilos de esta
historia al final de `<style id="tokens">`. No hay colores nuevos.

- **Pantallas:** Proyectos, Anclar (tras elegir la carpeta) y Página del proyecto.
- **Estados:** con datos, vacía, carpeta v4, no es v4, filtro «en curso», perfil M con 3 repos y carpeta no
  encontrada.
- **Ejes:** 1440×920 o 980×680; sidebar desplegado, plegado o plegado con tooltip; tamaño de texto; plataforma; tema
  oscuro o claro.
- **Variantes:** «Con git ★» y «Sin git», que corresponden a D-5.

Las capturas están en [`capturas/`](capturas/) y se hicieron con Chrome sin interfaz sobre la plantilla, sin el panel
de la maqueta. Las de nombre `-completo` estiran la ventana para que se vea toda la página.

Enlace directo: `maqueta.html#pantalla=proyecto&estado=con-datos&ancho=1440&variante=con-git&tema=oscuro&sidebar=desplegado`.

## Pantallas

| Pantalla | Qué muestra | Capturas |
| --- | --- | --- |
| **Sidebar** | Debajo de Instancias aparece la sección **Proyectos**, con «Todos los proyectos», un proyecto por fila y «Anclar proyecto». Cada proyecto lleva su inicial y, a la derecha, el número de historias en curso (el mismo contador que las sesiones de las instancias). Un proyecto roto lleva la inicial en rojo y un triángulo. Plegado, solo quedan las iniciales; el tooltip dice «Code AI Profiles · 4 en curso». | 01, 06, 22 |
| **Proyectos** (`#/proyectos`) | Una tarjeta por proyecto con la inicial, el nombre, la ruta, el perfil y la fase, el reparto de historias por estado (barra y leyenda), 4–5 tecnologías, la última actividad y los repos. Las tarjetas se ordenan por la última actividad y las rotas van al final. Encima, «Solo lectura · leídos a las 02:31». | 01, 02, 05, 06 |
| **Proyectos vacía** | Llamada a «Ancla tu primer proyecto». Explica que solo admite la metodología v4 (`.metodo/config.json`) y que la app no cambia ni ejecuta nada. | 03, 04 |
| **Tarjeta rota** | «Carpeta no encontrada», qué hacer en una frase y «Desanclar». El nombre es el de la carpeta de la ruta, porque la app solo guarda la ruta. | 01 |
| **Anclar · carpeta v4** | Diálogo que aparece tras el selector nativo. Muestra lo encontrado: config versión 4 (con perfil y fase), número de historias y repos. Ofrece «Elegir otra carpeta» y «Anclar». | 07, 08 |
| **Anclar · no es v4** | La misma comprobación con el paso que falla en rojo («`.metodo/config.json` es de la versión 3 · se necesita la 4»), el aviso «No es un proyecto v4» y «No se ancló nada». Ofrece «Cancelar» y «Elegir otra carpeta». | 09, 10 |
| **Página del proyecto** (`#/proyectos/<id>`) | **Cabecera:** inicial, perfil, fase, «Metodología v4», resumen en 2 líneas, quién aprueba, ruta, «Leído a las…», y los botones «Actualizar», «Abrir carpeta» y «Desanclar».<br>**Cifras:** historias (barra y leyenda por estado), repos, «Desde», «Tiempo registrado» y tokens.<br>**Tecnologías** por grupo, con su origen.<br>**Repos** con tipo, ruta, tecnologías del repo y (D-5) rama y último commit.<br>**Historias:** tabla filtrable por estado.<br>**Consumo:** por historia y por rol. | 11–20 |
| **Página de un proyecto roto** | Cabecera en rojo, la ruta, las causas posibles, «Reintentar» y «Desanclar», y la aclaración de que desanclar no toca ninguna carpeta. | 21 |

La página de **Code AI Profiles** usa los datos reales de este repo. **Vetcare** (perfil M, 3 repos), **Lumen Tienda**,
**Agenda Citas**, **landing-2024** y **panel-finanzas** son inventados.

## De dónde sale cada dato (todo de archivos, sin ejecutar nada)

| Dato en pantalla | Archivo | En la maqueta (Code AI Profiles) |
| --- | --- | --- |
| Nombre, resumen, perfil, fase | `.metodo/config.json` → `proyecto.nombre`, `proyecto.resumen`, `perfil`, `fase` | Code AI Profiles · S · desarrollo |
| Aprueba | `figuras.aprueba` | Braiyan Rodriguez (mantenedor) |
| Repos, tipo y ruta | `repos[]` (`nombre`, `tipo`, `ruta`) | 1 · `otro` · `.` |
| Validación v4 | `.metodo/config.json` existe y `version === 4` | 4 |
| Tecnologías | `stack.gestor`, `stack.packs` y los manifiestos de cada repo (`package.json`: dependencias y `packageManager`; `Cargo.toml`) | pnpm 12, frontend-react-vite, React 19, Vite 6, Tailwind CSS 4, React Router 7, TypeScript 5.7, Tauri 2, Rust |
| Historias: título, estado, fase, área, creada | Frontmatter de `hu/HU-####-*/hu.md`; las cuentas coinciden con la cabecera de `hu/INDEX.md` | 14 · 4 en curso · 1 en espera · 7 terminadas · 2 descartadas |
| Tiempo y tokens de cada historia | `hu/HU-####-*/metricas.json` → `minutosTotales`; `agentes[].tokens.total` + `orquestador.porFase[].tokens.total` | 9 con métricas: 6853 min (114,2 h) y 892,2 M |
| Consumo por rol | `agentes[].rol` sumado; el orquestador desde `orquestador.porFase` (`aproximado: true`) | orquestador ≈ 647,6 M · frontend 143,5 · architect 65,6 · backend 25,6 · general-purpose 9,9 |
| % de caché | `tokens.cacheLectura / tokens.total` | 98 % |
| Desde | El `creada` más antiguo de `hu.md` → la última línea de cualquier `seguimiento.md` (días de calendario, contando ambos extremos) | 27 oct → 29 oct = 3 días |
| Última actividad | La última fila con fecha de todos los `seguimiento.md` | 29 oct 00:27 |
| Rama y último commit (D-5) | `.git/HEAD` y la fecha del objeto al que apunta (o `logs/HEAD`) de cada repo, sin red ni `git` | `hu-0022-configuracion-unificada` · `6421f84` |

No se usa ningún otro archivo. No se lee nada de `~/.claude`, ni de los perfiles, ni el código fuente aparte de los
manifiestos.

## Decisiones de diseño

- **Cuatro colores de estado y siempre los mismos**, en la barra, la leyenda, la tabla, las pestañas y los puntos del
  consumo. Todos son tokens que ya existen:

  | Estado | Color |
  | --- | --- |
  | En curso | terracota (`--primary`) |
  | En espera | `--ui-warning` |
  | Terminada | `--ui-success` |
  | Descartada | `--quiet` |

  Las barras de consumo son de un solo color neutro. No hay gráficos decorativos, tortas ni colores por proyecto.
- **La inicial como identidad del proyecto**, en un recuadro neutro. Sirve en el sidebar plegado y no añade colores.
- **El contador del sidebar es «en curso»**, igual que el de sesiones en las instancias. No se usa el punto de estado
  porque en las instancias significa «en marcha» y aquí confundiría. El único punto de color es el de la carpeta rota.
- **Confirmación al anclar.** Tras el selector nativo, un diálogo enseña lo detectado antes de guardar. Así un proyecto
  equivocado no llega a anclarse y el «no es v4» se explica paso a paso. *Alternativa:* anclar directamente y abrir su
  página.
- **Desanclar no pide confirmación**, porque no toca la carpeta y se deshace anclando otra vez. Se dice en la tarjeta
  rota y en su página.
- **La página se desplaza dentro de la ventana.** A 1440×920 se ven la cabecera, las cifras, Tecnologías y Repos, y el
  principio de Historias. Consumo queda al final (capturas 13, 14 y 17).
- **A 980** las cifras pasan a 1 + 4, Tecnologías y Repos se apilan, la tabla oculta Área y Creada, y el consumo se
  apila.
- **Mínimo de 11 px**: todo el texto usa la escala `--fs-*`, con el título del diálogo en `--fs-dialog`.

## ★ Lo que propongo para cada decisión de la historia

1. **D-1 · Solo leer archivos ★.** Todo lo de la tabla de arriba sale de JSON, del frontmatter, de Markdown y de
   `.git` en texto. No hace falta ejecutar `metodo.mjs` ni `metricas.mjs`.
2. **D-2 · Tecnologías de los manifiestos y de los packs ★.** La tarjeta muestra 4–5. La página las agrupa
   (Lenguajes, Interfaz, Escritorio, Servidor, Trabajos, Gestor y packs) y dice de qué archivos salen. En un proyecto
   con varios repos, cada repo lleva las suyas.
3. **D-3 · Dos cifras ★, con un matiz de nombre** (ver dudas): «Desde» en días y «Tiempo registrado» en horas, con
   la pista «reloj de N cerradas».
4. **D-4 · Refresco al entrar y con «Actualizar» ★.** La hora aparece como «Leído a las 02:31» en la cabecera y en
   la lista.
5. **D-5 · Con git ★** (variante «Con git»): rama y SHA corto con la fecha relativa del último commit. El mensaje
   del commit no se muestra. La variante «Sin git» enseña la alternativa: los repos con nombre, tipo, ruta y
   tecnologías.

## Dudas abiertas

- **«Tiempo registrado» no es tiempo de trabajo.** `minutosTotales` es tiempo de reloj entre cambios de fase e
  incluye las esperas humanas (`metricas-y-actividad.md`). En este repo suma 114 h en 3 días de calendario porque
  las historias se solapan. HU-0010 suma 31 h, casi todas en verificación esperando el PR. Propongo la etiqueta
  «Tiempo registrado» con la pista «reloj», o bien «Tiempo en fases». Decide el mantenedor.
- **Los tokens son sobre todo caché.** El 98 % es `cacheLectura`, así que el total impresiona más que el costo real.
  La pista «98 % de caché» lo aclara. Otra opción es mostrar solo entrada + salida.
- **Las descartadas cuentan en el tiempo y en los tokens.** HU-0012 y HU-0013 suman 320 M porque `metricas.json`
  también se genera al descartar. La maqueta las incluye y las marca con su punto gris. ¿Se excluyen?
- **El orquestador es aproximado:** se muestra con «≈» y una nota.
- **Nombre del proyecto roto:** la app solo guarda la ruta, así que se ve la carpeta (`panel-finanzas`). Guardar
  también el último nombre leído cambiaría la regla de «solo la ruta».
- **Lumen Tienda** no tiene página en la maqueta porque sería igual que las otras dos.
- **El pie del sidebar dice «Configuración»**, adelantando lo que plantea HU-0022 (todavía en requisitos). Si HU-0022
  cambia, este detalle no afecta a la historia.

## Nota del marco

Hay dos cambios genéricos en el script y el estilo del marco de HU-0019, documentados en su cabecera:

- Si el estado elegido no existe en la pantalla, se usa el primero que sí.
- `aside button[hidden]` ahora se oculta. Antes `display:block` lo pisaba y la barra mostraba estados que no existen
  en la pantalla.
