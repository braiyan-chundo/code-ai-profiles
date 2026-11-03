# Verificación · HU-0027 · Icono personalizado de proyecto

Preparada por el orquestador el 2026-11-03. Verifica la persona; el orquestador no corrige lo que encuentra.
Lleva revisión técnica porque el dial `revisionTecnica` es `siempre` (riesgo contrato): `revision.md`, PASS; R-1 y
R-2 corregidas antes de entregar, junto con O-2 y O-3.

## Qué se entregó

| Repo | Commits | Qué |
| --- | --- | --- |
| code-ai-profiles | backend · `3b3092a`, `adf610e`, `3e982eb` | Contrato `ProjectSummary.icon` y mocks; `set_project_icon` / `clear_project_icon`; copia normalizada (PNG 512 px) en `<datos de la app>/project-icons/<id>.png`; desanclar la borra; scope del asset protocol solo para `project-icons/*.png`; `normalized_icon_png` compartido en `icon_image.rs`; R-2 |
| code-ai-profiles | frontend · `66a318d`, `75688d2` | Avatar de la página como botón (velo, lápiz, «Cambiar icono»); diálogo «Icono del proyecto»; icono en sidebar, tarjetas y página; un proyecto roto no lo muestra; R-1, O-2, O-3 |
| code-ai-profiles | historia, maqueta, arquitectura, revisión, grafo, evidencias y esta verificación | Gobierno |

Rama `ajustes-windows-y-sidebar` (desde `develop` `80a51d6`), junto con dos arreglos fuera de la historia: el borde de la
ventana en Windows (`27751bc`) y el botón único de plegar el sidebar (`5aaac3c`).

## Comprobaciones

| Comprobación (2026-11-03) | Resultado |
| --- | --- |
| Suite, tipos y build (`pruebas.mjs suite todos`), una vez | en verde sobre `77b2677` |
| `cargo test` | 218 pasan, 2 ignoradas (11 nuevas del icono: poner, inválida, quitar dos veces, desanclar, copia ausente o enlace, `projects.json` antiguo, proyecto roto, ids no válidos, restauración si falla el registro, copia huérfana) |
| `test:projects` | 44 de 44 (`visibleIcon`, `project/loaded` pone, cambia y quita el icono) |
| `test:ui` | 20 de 20 |
| DMG (macOS Apple Silicon) | `Code AI Profiles_0.4.0_aarch64.dmg` (código de `77b2677`), SHA-256 `bae700a6ca57e3a109eecca7b22fa5dd3b9b13f08c9a72a0d592ef12110b0f8e` |
| Configuración fuera del código y guarda de producción | en orden |
| Grafo (`graph:check`) | al día |
| Capturas con mocks | `evidencias/` (reposo, hover, foco, diálogo vacío, con icono, listo, error, todos, plegado, roto, guardando, guardado; oscuro y claro, 1440 y 980) |

## Decisiones tomadas

1. Imagen elegida por la persona, copia en los datos de la app (tu elección).
2. Maqueta aprobada con sus ★: velo con lápiz centrado, aro fino sobre la imagen, textos de error de las instancias, sin
   pista en reposo.
3. ★ D-1: el avatar de la página es el botón; no hay un cuarto botón en la cabecera.
4. ★ D-2: PNG y JPEG, sin SVG.
5. ★ D-3 y D-4: un proyecto roto enseña su estado, no su icono, y su avatar no abre el diálogo.
6. El webview puede leer `project-icons/*.png` de los datos de la app (el mismo mecanismo que los iconos de instancia).

## Guía de prueba

Dónde: la app instalada desde el `.dmg` de esta entrega, con `happy-office` y otro proyecto anclados en Proyectos. Ten a
mano un PNG o JPEG (un logo) y un archivo que no sea imagen.

1. **AC-01 · Poner.** Abre `happy-office`. Pasa el ratón por su avatar de 64 px: aparece un lápiz y «Cambiar icono».
   Púlsalo: se abre «Icono del proyecto» con la inicial. «Seleccionar imagen», elige el PNG: cambia la vista previa y
   «Guardar» se activa. Guarda: el icono sale en la cabecera, en el sidebar (despliégalo y pliégalo) y en «Todos los
   proyectos».
2. **AC-02 · Quitar.** Vuelve a abrir el diálogo: ahora dice «Reemplazar imagen» y «Quitar». «Quitar» y «Guardar»:
   vuelve la inicial en los tres sitios. Repite con «Cancelar»: no cambia nada.
3. **AC-03 · No válida.** Elige el PNG y después el archivo que no es imagen: sale «Selecciona una imagen PNG o JPEG
   válida.», la vista previa vuelve a la de antes y «Guardar» queda desactivado.
4. **AC-04 · Persiste y no toca el proyecto.** Con el icono puesto, pulsa «Actualizar», cierra y abre la app: sigue.
   `git status` en `happy-office` sigue limpio. Desancla el proyecto y vuelve a anclarlo: sale la inicial.
5. **AC-05 · Roto.** Pon icono a un proyecto de prueba y renombra su carpeta: en sidebar, tarjeta y página se ve roto,
   sin icono, y el avatar no abre el diálogo. Devuelve el nombre y pulsa «Actualizar»: vuelve el icono.
6. Con Tab llegas al avatar: anillo de foco, tooltip «Cambiar icono» y Enter abre el diálogo.
7. **Fuera de la historia, en el mismo `.dmg`:** el sidebar ocupa toda la altura, los semáforos quedan sobre su
   cabecera sin tapar la marca y el único botón de plegar está antes de las migas. La ventana se arrastra desde la
   franja de arriba del sidebar y desde la barra de la página.

**Solo tú puedes comprobar:** cómo se ve una imagen real a 16 px; Windows y Linux reales (el icono y el nuevo borde de
la ventana en Windows 11, solo CI).

## Veredicto

Pendiente.
