---
id: HU-0023
titulo: "Proyectos: resumen de proyectos con metodología v4"
estado: en-proceso
fase: verificacion
area: proyectos
entrega: 1
prioridad: alta
creada: 2026-10-29
requiere: { arquitectura: true, diseno: true }
repos: [code-ai-profiles]
riesgo: [permisos]
reglas: []
depende: [HU-0022]
---

# Proyectos: resumen de proyectos con metodología v4

Como mantenedor que lleva varios proyectos con la metodología v4
quiero anclar la carpeta de cada proyecto y ver su resumen en Code AI Profiles
para saber de un vistazo en qué estado está cada uno, qué tiene en curso y cuánto ha costado.

## Petición original

> «luego necesitamos implmentar un feature de "Proyectos" aqui si voy a necesitar un poco mas de tu expertiz mi
> idea es teniendo en base la metodologia 4 (si no la encuentras me dices) necesito que tengamos una vista de
> Proyectos donde yo pueda anclar una carpeta de un proyecto y que me diga en que estado esta el proyecto,
> informacion del mismo, tecnologias, cantidad de repos, cuanto ha demorado su desarrollo, cuantas hu tiene cuales
> estan en curso cuales se terminaron es decir un resumen completo del mismo (por ahora solo compatibles con los
> proeyctos que usen la v4 (recuerda hacer maqueta» — Braiyan Rodriguez (mantenedor), 2026-10-29

Elecciones, en la misma conversación:

- Relación con las instancias: «Solo resumen (Recomendado)». Proyectos es una vista de lectura; no se cruza con
  las instancias de Claude por ahora.
- Tokens: «Sí, mostrarlos (Recomendado)», leídos solo de `metricas.json`, nunca de las transcripciones.
- Tras la primera maqueta, «para las decisiones de la vista de proyecto, voy con tus recomendadas» (2026-10-29):
  1. La cifra de tiempo se llama «Tiempo en fases»: `minutosTotales` es reloj entre fases, esperas incluidas.
  2. Tokens: el total con la parte de caché («98 % caché») y, como cifra secundaria, entrada + salida.
  3. Las historias descartadas no suman en los totales de tiempo ni de tokens (sus métricas recogen la espera).
  4. Se guarda la ruta y el último nombre leído, para reconocer un proyecto con la carpeta rota.
- Para las maquetas: «la ui debe seguir estándares armónicos de espaciado y relación de aspecto entre
  componentes», evaluada con una skill de UX.

**Maqueta primero:** el dial de diseño está apagado, pero el mantenedor la pide. `diseno/maqueta.html` se aprueba
antes de implementar.

## Problema

No hay forma de ver el estado de los proyectos v4 sin abrir cada carpeta y leer `hu/INDEX.md`, las bitácoras y
las métricas a mano.

## Lo que guarda un proyecto v4

Referencia: la metodología en `METODOLOGIAS/metodologia4` y este mismo repositorio, que es un proyecto v4.

| Dato | De dónde sale |
| --- | --- |
| Nombre, resumen, perfil (S/M/L), fase del proyecto, personas | `.metodo/config.json` (`proyecto`, `perfil`, `fase`, `figuras`) |
| Repos (nombre, ruta, tipo) y su número | `.metodo/config.json` → `repos` |
| Tecnologías | `stack` (gestor, packs) de la config y los manifiestos de cada repo (`package.json`, `Cargo.toml`…) |
| Historias: título, estado, fase, área, prioridad, fecha | Frontmatter de `hu/HU-####-*/hu.md` |
| Tiempo y tokens por historia, fase y rol | `hu/HU-####-*/metricas.json` (solo en historias cerradas o descartadas) |
| Primera y última actividad | Fechas de `hu.md` (`creada`) y de las bitácoras (`seguimiento.md`) |

## Alcance

- **Anclar** una carpeta con el selector nativo y **desanclarla**. La app guarda la ruta y el último nombre leído.
- Validar que es un proyecto v4 (`.metodo/config.json` con `version: 4`); si no, un aviso claro y no se ancla.
- **Vista Proyectos** (`#/proyectos`): una tarjeta por proyecto anclado con nombre, fase, perfil, historias en
  curso/terminadas y última actividad.
- **Página del proyecto** (`#/proyectos/<id>`), el resumen completo:
  - Información: nombre, resumen, perfil, fase, quién aprueba, ruta.
  - Tecnologías y repos (número y lista).
  - Duración: desde la primera historia hasta la última actividad, y el tiempo registrado en las métricas.
  - Historias: totales por estado (en curso, en espera, terminadas, descartadas) y la lista con su fase.
  - Consumo: tokens totales y por historia, desde `metricas.json`.
- Sección «Proyectos» en el sidebar con los anclados.
- Regla de negocio nueva en `docs/producto/reglas/` y documento funcional `docs/proyectos.document.md`, README y
  CHANGELOG.

## Fuera de alcance

- Proyectos que no sean v4 (v3 u otros).
- Escribir en el proyecto: ni historias, ni fases, ni comandos del método.
- Relacionar proyectos con instancias o abrir Claude en un proyecto.
- Leer transcripciones de `~/.claude`, el código fuente más allá de los manifiestos, o cualquier cosa por red.

## Decisiones por defecto (★)

- ★ **D-1 · Solo lectura de archivos, sin ejecutar nada del proyecto.** La app lee los archivos con su propio
  código; no corre `node .metodo/scripts/*.mjs` ni otros scripts del proyecto. *Alternativa:* llamar a los
  scripts del método (más fiel, pero ejecuta código ajeno).
- ★ **D-2 · Tecnologías de los manifiestos.** Se detectan frameworks y lenguajes principales de los manifiestos
  de cada repo, más los packs de la config. *Alternativa:* solo los packs de la config.
- ★ **D-3 · Duración en dos cifras.** «Desde» (primera historia → última actividad, en días) y «Trabajo
  registrado» (suma de `minutosTotales`). *Alternativa:* solo una de las dos.
- ★ **D-4 · Refresco al entrar y con «Actualizar».** Sin vigilar la carpeta en segundo plano. *Alternativa:*
  vigilar cambios en vivo.
- ★ **D-5 · Estado de git opcional.** Rama actual y fecha del último commit de cada repo, leídos de `.git` sin
  red. *Alternativa:* no mostrar git.

## Criterios de aceptación

### AC-01 · Maqueta aprobada antes de construir

Existe `diseno/maqueta.html` con la vista de proyectos (vacía, con varios, con uno no válido), la página de un
proyecto y el anclado, en oscuro y claro, a 1440×920 y 980×680, y la persona la aprueba antes de implementar.

### AC-02 · Anclar y desanclar

La persona elige una carpeta v4 y aparece en Proyectos y en el sidebar; al reabrir la app sigue ahí. Una carpeta
que no es v4 no se ancla y se explica por qué. Desanclar la quita sin tocar la carpeta.

### AC-03 · Resumen del proyecto

La página muestra nombre, resumen, perfil, fase, tecnologías, número y lista de repos, duración e historias por
estado, con las mismas cifras que dan `hu/INDEX.md` y las métricas del proyecto.

### AC-04 · Historias y consumo

La lista de historias muestra título, estado y fase; las cerradas, su tiempo y sus tokens. Los totales del
proyecto coinciden con la suma de sus `metricas.json`.

### AC-05 · Carpeta movida o rota

Si la carpeta anclada ya no existe o su config está mal, el proyecto sigue en la lista con un aviso y la opción
de desanclarlo; la app no falla.

### AC-06 · Solo lectura

Anclar, ver y refrescar un proyecto no cambia ningún archivo de su carpeta ni ejecuta nada de él.

## Reglas de negocio afectadas

- **Regla nueva:** los proyectos anclados se leen sin escribir ni ejecutar nada, solo de los archivos del
  método (`.metodo/config.json`, `hu/`) y los manifiestos; las métricas de tokens salen solo de `metricas.json`.
- **Amplía el producto:** hasta ahora Code AI Profiles solo gestionaba perfiles de la aplicación de IA. La
  privacidad de los perfiles no cambia: Proyectos no lee nada de ellos.
- Permiso: en macOS, leer carpetas de Escritorio, Documentos o Descargas puede pedir «Archivos y carpetas»; se
  explica en Configuración › Permisos (HU-0022).

## Para la persona usuaria

1. **D-1**: leer los archivos o ejecutar los scripts del método.
2. **D-5**: mostrar rama y último commit de cada repo.
3. **D-3**: las dos cifras de duración.

**Pendiente humano:** aprobar la maqueta; después, anclar tus proyectos reales.

## Definición de Preparado

- [x] Petición literal, problema, alcance y fuera de alcance escritos
- [x] Criterios numerados y observables desde la interfaz
- [x] Reglas de negocio afectadas nombradas

## Definición de Terminado

- [ ] Tipos, build y suite en verde una vez sobre los SHA finales (`pruebas.mjs estado`)
- [ ] Configuración fuera del código y guarda de producción en verde (`config.mjs check`, `entorno.mjs check`)
- [ ] Pruebas nuevas proporcionales al riesgo, o la razón de no añadirlas
- [ ] Revisión técnica pasada, si la historia es riesgosa
- [ ] La persona probó y aprobó; su veredicto está en `verificacion.md`
- [ ] Delta de reglas de negocio aplicado en `docs/producto/reglas/`
- [ ] Commits en cada repo tocado con `HU: HU-0023`. **Sin push, sin publicar, sin desplegar**
- [ ] Lo que solo comprueba una persona, declarado como pendiente humano
