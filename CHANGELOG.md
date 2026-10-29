# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- En macOS, el icono personalizado de cada instancia se ve también en el Dock, con la forma de los iconos de macOS y sin tocar la firma de Anthropic. Para las copias que Claude actualizó por su cuenta, macOS pide el permiso «Gestión de apps»; el editor lo explica y ofrece «Reintentar».
- Catálogo de 63 componentes shadcn/ui con el tema de la app y un showcase local en `/showcase.html` (`pnpm dev`), fuera del build y de los instaladores. Skill `code-ai-profiles-ui` con una ficha por componente y la prueba `test:ui`, que vigila que nada del catálogo entre en la app.

### Changed

- Cabecera compacta de una sola barra (el contenido empieza a 60 px del borde, antes 193 px en macOS), sidebar flotante plegable a iconos y escala tipográfica global: el tamaño de Apariencia (Compacto, Cómodo, Grande) escala toda la interfaz y ningún texto baja de 11 px.
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
