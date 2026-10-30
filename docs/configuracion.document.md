# Configuración

Documento funcional de [HU-0022](../hu/HU-0022-configuracion-unificada-con-apariencia-y/hu.md).

Configuración reúne en una página los ajustes de la app. Se abre desde «Configuración» en el pie del sidebar o con
**⌘,** (macOS) / **Ctrl+,** (Windows y Linux), en `#/configuracion/apariencia` o `#/configuracion/permisos`.

## Apariencia

- **Tema:** claro, oscuro o el del sistema.
- **Tamaño del texto:** Compacto, Cómodo o Grande, con vista previa. Escala toda la interfaz y ningún texto baja de
  11 px.

Los cambios se aplican al momento y se conservan al reabrir la app. Sustituye al antiguo diálogo «Apariencia».

## Permisos

Una tarjeta por cada permiso del sistema que la app puede usar en la plataforma actual. **Todos son opcionales**: la
app funciona sin ellos, ninguno se pide al abrirla y entrar en Configuración no muestra ningún aviso del sistema. Cada
tarjeta tiene una «i» (con ratón o teclado) que explica para qué sirve y qué deja de funcionar sin él.

| Permiso (macOS) | Para qué | Estado | Acceso directo |
| --- | --- | --- | --- |
| Gestión de apps | Poner el icono de cada instancia en el Dock en las copias que Claude actualizó por su cuenta ([instancias](instancias.document.md)) | «Lo necesita» si macOS rechazó el icono de alguna instancia; si no, «Sin uso todavía» | Privacidad y seguridad › Gestión de apps |
| Archivos y carpetas | Que [Proyectos](proyectos.document.md) lea carpetas en Escritorio, Documentos, Descargas o discos externos | «Lo necesita» si a algún proyecto anclado le falta; si no, «No se puede comprobar» (macOS no lo deja saber sin un aviso) | Privacidad y seguridad › Archivos y carpetas |
| Cuenta de administrador | «Descargar e instalar» escribe la versión nueva en Aplicaciones | Si tu cuenta es de administrador o no; sin botón, porque no hay nada que activar | — |

- El estado sale de datos que la app ya tiene (el registro de instancias, los proyectos anclados y los grupos de tu
  usuario). No se lee nada de los perfiles y nunca se fuerza un aviso para averiguarlo.
- El acceso directo solo abre el panel de Ajustes del Sistema; no cambia ningún ajuste. Las direcciones de los paneles
  se fijan en la compilación desde `.env.example` (`CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL`,
  `CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL`).
- El aviso de «Gestión de apps» del editor de una instancia enlaza a esta sección; con cambios sin guardar, avisa y no
  navega.

En Windows y Linux la sección dice que la app funciona sin pedir accesos al sistema.

## Sistema armónico

Desde la misma historia, toda la interfaz sigue una escala de espaciado de 4 px, alturas fijas de controles por
tamaño de texto, interlineados múltiplos de 4, radios 4/8/12/16/20/24 y un anillo de foco de 2 px. El botón principal
lleva texto oscuro (contraste 6:1). El detalle está en `DESIGN.md`.
