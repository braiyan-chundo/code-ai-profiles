# Changelog

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

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
