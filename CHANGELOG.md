# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Página **Configuración** (⌘, / Ctrl+,) con Apariencia y Permisos. En macOS, una tarjeta por permiso opcional («Gestión de apps», «Archivos y carpetas» y «Cuenta de administrador») con su explicación, su estado cuando se puede saber sin avisos del sistema y un acceso directo al panel de Ajustes. Las direcciones de los paneles salen de `.env.example`.
- **Proyectos**: ancla carpetas con la metodología agéntica v4 y muestra su resumen (fase, perfil, tecnologías, repos con rama y último commit, historias por estado, «Desde», «Tiempo en fases» y tokens de `metricas.json`), con una sección en el sidebar. Solo lectura: no ejecuta nada del proyecto, no escribe en él, no usa la red ni lee fuera de la carpeta. Añade `tauri-plugin-dialog` 2.7 (selector de carpetas, solo desde Rust) y los textos de los avisos de macOS en `Info.plist`.

- En macOS, la versión nueva de Claude se detecta en la publicación oficial (`downloads.claude.ai`), también durante un despliegue escalonado, y el dashboard pregunta «Hay una nueva versión de Claude (X). ¿Deseas instalarla?». «Instalar» usa el flujo verificado de «Descargar e instalar» sin abrir la original. Las instancias por detrás muestran «Actualizar» y el botón «Actualizar instancias obsoletas». Nueva variable `CAP_UPDATE_RELEASES_URL`.
- **Proyectos**: los datos incompletos ya no ocupan la página como avisos. Cada historia lleva «Sin tiempo» o «Sin métricas», y el chip «N historias con datos incompletos · Ver» abre un modal agrupado con la causa y, para las que no tienen métricas, el comando que las genera en el proyecto, listo para copiar.
- **Lector de historias**: al pulsar una historia se abren sus `hu.md`, `arquitectura.md`, `verificacion.md` y `seguimiento.md` en pestañas, renderizados como Markdown. Sin HTML embebido ni imágenes; los enlaces `http`/`https` se abren en el navegador del sistema. Añade `react-markdown` 10.1.0 y `remark-gfm` 4.0.1, cargados solo al abrir el lector.
- **Abrir y detener** cada instancia desde el sidebar (al pasar el ratón o con el foco) y desde «Uso por instancia» del dashboard, sin entrar en su página.

### Changed

- Backend reorganizado sin cambios de comportamiento (ADR-0003): `lib.rs` se parte en módulos por dominio (`commands`, `contract`, `storage`, `processes`, `scan`, `instances`, `sessions`, `versions`) y por plataforma (`platform/`); estado compartido en `tauri::State`; errores tipados internos que distinguen los fallos de red reintentables; «Detener» y el arranque de una instancia enumeran menos veces los procesos del sistema.

- Sistema armónico en toda la interfaz: escala de espaciado de 4 px, alturas fijas de controles por tamaño de texto, interlineados múltiplos de 4, radios 4/8/12/16/20/24 y anillo de foco de 2 px.
- El botón principal lleva texto oscuro (contraste 6:1, antes 3:1) y el verde de éxito del tema claro es algo más oscuro (4,77:1).
- «Configuración» sustituye al diálogo «Apariencia» en el pie del sidebar. El aviso de «Gestión de apps» del editor enlaza a Configuración › Permisos.

### Fixed

- «Actualizar» en la página de un proyecto indica que está trabajando y termina en «✓ Actualizado» con la hora; antes no daba ninguna respuesta visible.
- Una historia con `minutosTotales` nulo ya no cuenta como 0 minutos en «Tiempo en fases».
- En la página de una instancia, Abrir y Detener se desactivan mientras corre otra operación.
- El registro de instancias (`instances.json`) se guarda de forma atómica: un cierre o un fallo a mitad ya no lo deja a medias ni hace desaparecer las instancias de la app.
- Los enlaces de sesión, la caché de versiones y los índices de sesión se reemplazan en un solo paso y forzados a disco, sin un momento en que el archivo falte.
- Una instancia con icono personalizado que Claude actualizó por su cuenta ya no queda bloqueada como «cambió fuera de Code AI Profiles»: si sigue firmada por Anthropic y su versión es mayor que la registrada, se acepta, se vuelve a registrar y puede usarse como fuente para sincronizar las demás.
- El diálogo «Transferir sesión de Code» es compacto: modos del mismo alto, un destino por fila y el pie siempre visible.

## [0.3.0] - 2026-10-28

### Added

- En macOS, «Descargar e instalar» actualiza la aplicación original con un clic cuando el feed oficial anuncia una versión posterior: descarga solo desde el host permitido, verifica tamaño, `sha256`, firma de Anthropic y Gatekeeper, la sustituye de forma atómica con vuelta atrás si algo falla y sincroniza después las instancias detenidas; las abiertas quedan como «Sincronización pendiente». Windows y Linux siguen con el canal oficial.
- Sidebar permanente con el dashboard, la aplicación original y cada instancia clonada; dashboard con el resumen global y los avisos, y una página propia para cada instancia y para la original.
- En macOS, el icono personalizado de cada instancia se ve también en el Dock, con la forma de los iconos de macOS y sin tocar la firma de Anthropic. Para las copias que Claude actualizó por su cuenta, macOS pide el permiso «Gestión de apps»; el editor lo explica y ofrece «Reintentar».
- Catálogo de 63 componentes shadcn/ui con el tema de la app y un showcase local en `/showcase.html` (`pnpm dev`), fuera del build y de los instaladores. Skill `code-ai-profiles-ui` con una ficha por componente y la prueba `test:ui`, que vigila que nada del catálogo entre en la app.

### Changed

- Cabecera compacta de una sola barra (el contenido empieza a 60 px del borde, antes 193 px en macOS), sidebar flotante plegable a iconos y escala tipográfica global: el tamaño de Apariencia (Compacto, Cómodo, Grande) escala toda la interfaz y ningún texto baja de 11 px.
- La interfaz se construye con el catálogo shadcn/ui y Tailwind 4, con los tokens de `DESIGN.md`.
- Las URL del feed, de descarga y de las guías se fijan en la compilación desde `.env.example` (`config.rs` y `build.rs`), no en el código.
- La interfaz se organiza por funcionalidades (`src/app`, `src/features`, `src/components`, `src/lib`, `src/styles`), con React Router 7 por hash y estado compartido con Context y `useReducer`. No cambia nada visible.
- Requisitos mínimos: macOS 13.3 o posterior (antes 12.0) y WebKitGTK 2.40 o posterior en Linux, porque la interfaz necesita un motor web de nivel Safari 16.4.
- El proyecto usa pnpm en lugar de npm: `pnpm-lock.yaml`, versión fijada en `packageManager` y CI con `pnpm install --frozen-lockfile`.

## [0.2.2] - 2026-10-27

### Fixed

- La diferencia entre una instancia local con versión superior y la instalación original ya no se presenta por sí sola como una actualización oficial disponible.
- Al volver del flujo de actualización de la aplicación original, se refrescan únicamente la versión y la topología; el proceso no abre un escaneo manual ni relee sesiones, uso o almacenamiento.
- En macOS, el handoff valida y abre exclusivamente la aplicación original, y guía a usar `Claude > Check for Updates` en lugar de abrir un DMG fijo.

### Changed

- La comprobación oficial queda ligada a la versión instalada y sus resultados tardíos no reemplazan la información de otra instalación.
- La validación continua incluye las pruebas del controlador de actualización.

## [0.2.1] - 2026-10-13

### Fixed

- El refresco automático actualiza el dashboard con `dashboard()` sin abrir un panel de escaneo, ocupar `busy` ni mostrar errores visibles.
- Focus e intervalo comparten un cooldown de 60 segundos y se deduplican; el foco inicial no inicia otro escaneo completo.
- Una solicitud manual durante trabajo de fondo queda visible y se ejecuta de forma determinista después de ese trabajo.
- Los listeners, timers y callbacks tardíos quedan asociados a su lifecycle y generación, evitando que reabran o pisen un escaneo nuevo.

### Changed

- El escaneo manual es el único que muestra progreso. Se autocierra tras éxito y permite ocultar resultados terminales sin ofrecer una falsa cancelación mientras corre.

## [0.2.0] - 2026-10-11

Esta versión está en validación dentro de la rama de desarrollo.

### Added

- Comandos `release:version` y `release:check` para sincronizar y verificar versiones SemVer del frontend y Tauri.
- Versión runtime expuesta a la interfaz mediante `SystemInfo.appVersion`.
- Alcances de refresco para evitar volver a recorrer sesiones, versiones o almacenamiento cuando una acción no modifica esas áreas.
- Inventario de procesos compartido y cachés de almacenamiento e inspección de aplicaciones con invalidación.

### Changed

- El escaneo manual deja de imponer una demora mínima visual de 1.150 ms.
- La aplicación se identifica como versión `0.2.0` en sus fuentes canónicas.
- El spike opt-in de icono por instancia en macOS falló al ser rechazado por `NSWorkspace`. Producción conserva el fallback de UI y deja `systemApplied=false`; esta entrada no declara el icono de Dock como verificado ni prevé más experimentos en esta iteración.
