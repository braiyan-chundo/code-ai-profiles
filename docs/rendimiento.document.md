# Rendimiento del dashboard

Documento funcional y técnico relacionado con [HU-0005](hu/HU-0005-recuperar-respuesta-de-la-interfaz-y-versionado-semver.md) y [HU-0006](hu/HU-0006-escaneo-automatico-silencioso-y-ciclo-manual-controlado.md). HU-0005 conserva sus propios gates pendientes; HU-0006 está completada.

## Refrescos por alcance

El dashboard separa sus lecturas en alcances para que una acción no espere trabajo que no necesita:

| Alcance | Cuándo se usa | Datos que puede actualizar |
| --- | --- | --- |
| `FULL` | Inicio o lectura completa | Procesos, uso, sesiones, versiones/topología y almacenamiento. |
| `FULL_SCAN` | Escaneo manual | Lo mismo que `FULL`, forzando el recálculo del almacenamiento administrado. |
| `LIGHT` | Inicio, detención, edición e icono | Estado de instancias y datos directamente afectados, conservando sesiones, topología y tamaño existentes. |
| `SESSIONS` | Copiar, mover, devolver o desvincular | Sesiones, el catálogo global de transcripts necesario para resolverlas y el estado asociado a la transferencia. |
| `VERSIONS` | Sincronizar o actualizar aplicaciones | Versiones y topología de instalaciones. |

Los alcances conservan el último valor válido de áreas no consultadas. Por ejemplo, el uso de disco no se vuelve a recorrer para editar un nombre. Una transferencia no vuelve a validar versiones ni calcula el tamaño administrado, pero sí reconstruye deliberadamente el catálogo global de transcripts requerido para actualizar las sesiones.

## Procesos y almacenamiento

Cada refresco obtiene un inventario local de procesos que se comparte entre las instancias y validaciones de esa operación. Durante un cierre, cada tick de espera puede obtener un inventario nuevo para confirmar el fin del proceso; no se hace un inventario anidado por proceso o por instancia.

El tamaño administrado se conserva temporalmente en caché. Las operaciones que crean, reemplazan, sincronizan o eliminan datos lo invalidan. El escaneo manual fuerza un cálculo nuevo para que siga siendo la forma de confirmar el tamaño real tras cambios externos.

La metadata de aplicaciones y versiones usa una caché vinculada a su ruta canónica y fingerprint de metadata. Crear, sincronizar, reemplazar o eliminar una aplicación invalida esa entrada. La validación profunda de firma y provenance se ejecuta fresca en los preflights que aceptan una fuente; no se convierte en un resultado válido solo porque exista metadata en caché.

## Progreso y privacidad

El indicador de escaneo refleja la operación real; ya no mantiene una espera mínima artificial de 1.150 ms después de que el backend termine. El cierre visual breve, si se utiliza, no bloquea la siguiente acción.

Las pruebas de rendimiento emplean contadores y fixtures sintéticos. El dashboard no registra prompts, respuestas, razonamientos, resultados de herramientas ni contenido de transcripts para medir la respuesta.

## Escaneo automático y manual

El refresco de fondo usa `dashboard()` y no abre el panel de escaneo, no ocupa el estado visual `busy` ni muestra errores. La carga inicial marca un cooldown de 60 segundos; foco e intervalo comparten ese periodo y solo pueden iniciar un trabajo de fondo. El foco inicial no fuerza otro escaneo completo, y un estado stale inicia como máximo un refresco.

El escaneo manual usa `scan()` y es el único que instala un listener de progreso. Muestra el avance real y se autocierra 900 ms después de un éxito. Un resultado success o error permite «Ocultar»; mientras está running no ofrece una falsa cancelación.

Si el usuario solicita un escaneo manual mientras hay un refresco de fondo, la solicitud queda visible como espera y se ejecuta después. El controlador conserva una generación y un lifecycle por operación: listeners, timers, resultados o eventos viejos no pueden reabrir el panel ni sobrescribir un ciclo más reciente, y se limpian al desmontar.

## Peso del frontend

Desde [HU-0015](hu/HU-0015-frontend-escalable-componentes-features-/hu.md) la interfaz usa React Router 7 en modo datos (`createHashRouter`). El JavaScript comprimido pasa de 85,0 a 119,6 kB; el router aporta unos 33 kB. La app carga su código desde el disco, así que el coste es de memoria y de análisis, no de red. Si hiciera falta recortarlo, `<HashRouter>` con `<Routes>` pesa 15,5 kB, a cambio de perder la carga diferida y el `errorElement` por ruta.

## Límites

El alcance reduce lecturas redundantes, pero no fija un tiempo máximo. El rendimiento de una operación aún depende del filesystem, de la cantidad de sesiones, de procesos del proveedor y de las copias físicas de aplicaciones. Crear o sincronizar una aplicación puede tardar de forma perceptible porque copia archivos por diseño. Las pruebas de state machine son sintéticas; no sustituyen una medición temporal dependiente de cada equipo.
