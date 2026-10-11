# Ciclo de vida e identidad visual de instancias

Documento funcional relacionado con [HU-0004](hu/HU-0004-sincronizacion-desde-la-instancia-mas-reciente-cierre-robusto-artefactos-locales-e-identidad-visual.md).

## Inicio, detección y cierre

Al iniciar una instancia, Code AI Profiles guarda una identidad local del proceso: PID raíz, tiempo de inicio cuando el sistema lo proporciona, grupo de procesos en Unix, huella de la aplicación administrada y el argumento exacto de perfil. La identidad no persiste una línea de comandos completa ni contenido de perfiles.

Al detener, primero vuelve a comprobar que el proceso encontrado corresponde a esa aplicación y a ese directorio de perfil. Envía una petición de cierre normal y espera hasta cinco segundos. Solo si continúa verificado, escala al cierre forzado del grupo o árbol correspondiente y espera hasta dos segundos más.

- En Unix, cada lanzamiento crea su propio grupo de procesos; el cierre se dirige a ese grupo solo tras verificar la identidad.
- En Windows, el cierre usa el árbol de procesos verificado como alternativa de plataforma.
- Un watcher espera la salida del proceso. La generación de lanzamiento evita que un watcher viejo cambie el estado de un reinicio posterior.
- Si la identidad no se puede comprobar o aún quedan procesos después del cierre forzado, la instancia continúa como ejecutándose y la interfaz devuelve un error accionable. No se informa un éxito falso ni se cierra por nombre, bundle ID o un PID viejo.

La verificación local reduce el riesgo de reutilización de PID, pero la integración no puede asegurar el comportamiento de un updater o helper que escape de la identidad verificada. En ese caso la persona debe cerrar la ventana restante desde el sistema y volver a escanear.

## Iconos por instancia

Desde el editor de una instancia se puede seleccionar una imagen PNG o JPEG de hasta 5 MiB. La aplicación valida y normaliza el archivo a PNG cuadrado administrado fuera del bundle del proveedor. El icono aparece en la tarjeta y el editor, sobrevive a una sincronización de aplicación y se puede reemplazar o quitar sin modificar la aplicación original.

No se cambia `app.asar`, ejecutables, `Info.plist`, recursos sellados ni xattrs. Esto conserva la firma y reduce el riesgo de romper el actualizador de la aplicación compatible.

| Plataforma | Resultado del icono de sistema |
| --- | --- |
| macOS | El Dock conserva el icono oficial firmado. El personalizado identifica la instancia dentro de Code AI Profiles. |
| Windows | El ejecutable firmado conserva su icono. El personalizado se muestra dentro de Code AI Profiles. |
| Linux | Se crea un launcher opcional por instancia con el icono. Debe abrirse desde ese launcher y Wayland o el compositor pueden conservar el icono oficial. |

El estado que aparece en el editor indica si el sistema aplicó el icono o si está limitado a la aplicación. No se promete que el Dock, la barra de tareas o todos los compositores distingan las instancias.

## Privacidad y límites

El selector solo procesa la imagen elegida explícitamente. Los iconos se guardan en el espacio administrado de la instancia y no se envían por red. La información usada para ciclo de vida se limita a lo necesario para verificar la identidad del proceso; no registra credenciales, cookies, prompts, respuestas ni transcripts.
