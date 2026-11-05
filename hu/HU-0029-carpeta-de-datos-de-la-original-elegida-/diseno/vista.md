# Vista · HU-0029 · Carpeta de datos de la original

La maqueta es [`maqueta.html`](maqueta.html), solo HTML y CSS con los tokens de la app. Ejes:
`#estado=aviso|elegida|rechazo|desaparecida` y `#tema=oscuro|claro`. No se ha tocado `src/`.

| Estado | Qué enseña |
| --- | --- |
| 1 · No encuentra sesiones | AC-01: `NoticeAlert` de aviso encima de la cabecera con «Elegir carpeta»; «Perfil local» dice «Sin sesiones» («Sin detectar» si no hay carpeta). |
| 2 · Carpeta elegida | AC-02 y D-6: sin aviso; «Perfil local» dice «Elegido»; nueva fila «Carpeta de datos» al pie de la tarjeta de cabecera con la ruta, la marca «Elegida», «Cambiar carpeta» y «Usar la detectada». |
| 3 · Carpeta rechazada | AC-03: el aviso de error de siempre (`FeedbackArea`) con el motivo; la página queda como estaba. |
| 4 · La elegida ya no existe | AC-06 y D-5: aviso con la ruta perdida, «Elegir carpeta» y «Usar la detectada». |

Con las sesiones en su carpeta habitual (macOS, por ejemplo) la página no cambia: ni aviso ni fila de carpeta (AC-01).
