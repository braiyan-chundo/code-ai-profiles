# Vista · HU-0026 · Arrancar y detener instancias desde el sidebar y el dashboard

La maqueta es [`maqueta.html`](maqueta.html): se abre con doble clic y no necesita servidor. Reproduce el sidebar
(`AppSidebar`, `SidebarMenuButton`, `SidebarMenuAction`, `MenuCount`) y el dashboard (`UsageRanking`, `InstanceStatusBadge`,
`UsageBar`) con los tokens de `src/styles/tokens.css` y `ui-theme.css`, las medidas del catálogo y las fuentes locales.
No se ha tocado `src/`.

- **Ejes** (barra superior): escena, tema oscuro/claro, 1440×920 / 980×680 y sidebar desplegado/plegado. Enlace directo:
  `#escena=reposo&tema=oscuro&ancho=1440&sb=abierto` (con `&solo=1` se ve solo la ventana a tamaño real).
- **Instancias de ejemplo:** Claudio Happy (detenida), Claudio Personal (ejecutándose), Claudio Karibu (abriéndose),
  Claudio Josued (detenida, sin sesiones) y la Claude original, sin botón.
- Los componentes son los del catálogo: `Button` (outline `sm` e `icon-sm`), `Badge`, `Item` outline `sm`, `Card sm`,
  `Progress`, `Spinner`, `Alert` (vía `NoticeAlert`), `Tooltip` (sidebar plegado) y `SidebarMenuAction`. Ninguno es nuevo.

## Escenas y capturas

| Escena | Qué enseña | Capturas |
| --- | --- | --- |
| **Reposo** | Sidebar: punto de estado y contador, sin botón. Dashboard: «Abrir» (neutro) y «Detener» (tono naranja) en cada fila. | 01 |
| **Hover y foco** | Sidebar: «Abrir» sobre Claudio Happy (hover) y «Detener» con anillo de foco sobre Claudio Personal. Dashboard: lo mismo en sus filas. Plegado: tooltip, sin botón. | 02, 05 |
| **Abriendo** | Spinner en el botón (desactivado) y punto que late; insignia «Abriendo…»; el resto de botones, desactivados. | 03 |
| **Deteniendo** | Igual, con «Deteniendo…» y el punto en el tono suave de hoy. | 04 |
| **Error** | Aviso en el área de avisos con el nombre de la instancia; la fila no cambia. | 06 |

## Decisiones (★ = la que propongo)

1. **Sidebar: el botón sustituye al contador al pasar el ratón o con foco (D-2 ★).** Los dos ocupan la misma caja de
   24 × 24 a la derecha de la fila (4 px del borde), así que la fila no se mueve ni se ensancha. En reposo solo se ve el
   punto y el contador. Con foco de teclado dentro de la fila (`group-focus-within`) también aparece. Alternativa: botón
   siempre visible; ensucia una lista de cuatro o más filas y compite con el contador.
2. **Sidebar plegado: no hay botón ★.** El panel de 48 px deja entradas de 32 px, sin sitio para un segundo control, y el
   catálogo ya oculta `SidebarMenuAction` plegado. El punto de estado se sigue viendo y el tooltip da «nombre · estado».
   Para actuar: desplegar el sidebar o usar el dashboard o la página de la instancia. Alternativa: un menú contextual con
   «Abrir/Detener»; añade un patrón nuevo y no es descubrible.
3. **Dashboard: botón siempre visible, al final de cada fila.** Es una tabla de uso, no una lista de navegación, así que
   la acción no necesita esconderse. En más de 1070 px lleva icono y etiqueta («Abrir», «Detener»; 104 px fijos); en
   ≤ 1070 px queda solo el icono (32 × 32) con `aria-label` y tooltip, el mismo corte que «Escanear sistema» en la cabecera.
4. **Jerarquía del botón.** «Abrir» es `outline` y «Detener» es el tono naranja suave (`primary/10`, borde `primary/30`)
   de la página de la instancia. No uso el relleno naranja de «Abrir» de la página: cuatro botones rellenos en una lista
   gritarían más que «Nueva instancia». Alternativa: igual que la página (relleno en «Abrir»).
5. **En curso.** El botón se queda desactivado pero a plena opacidad, con el spinner en lugar del icono y `aria-busy`.
   En el sidebar el spinner reemplaza al contador y se ve sin hover. La etiqueta del botón del dashboard no cambia (la
   insignia ya dice «Abriendo…»/«Deteniendo…»), así que el ancho no salta.
6. **Mientras una operación corre, los demás botones se desactivan.** El store tiene un solo `busy`, como «Nueva
   instancia» y «Escanear sistema» hoy. Visible solo al apuntarlos (media opacidad). Alternativa: operaciones en
   paralelo; requeriría un `busy` por instancia, y está fuera de alcance.
7. **Error (D-3 ★).** Área de avisos de siempre, `NoticeAlert` destructivo: título «No se pudo abrir Claudio Happy» y,
   debajo, el mensaje de Rust tal cual. No se inventa texto nuevo.
8. **Sin confirmación al detener (D-1 ★).**

## Para quien construya

- **`UsageRanking`:** hoy la fila es un `<a>` y un botón dentro de él es HTML inválido y roba el clic. La fila pasa a ser
  un contenedor `relative`; el `Link` ocupa toda la fila con `after:absolute after:inset-0` y el botón va con
  `relative z-10`. Así la fila sigue navegando y el botón no.
- **Anchos de las barras:** el botón quita sitio a la fila; en la maqueta las barras bajan de 34 % a 26 % (24 % a 980 px)
  y el hueco entre elementos sube de 8 a 12 px. Ajústalo en el código si algo no cabe.
- **`SidebarMenuAction`** mide hoy 20 px y se coloca con `top-1.5`; para ocupar la caja de 24 px del contador pide
  `size-(--ctl-badge)`, `top-1/2 -translate-y-1/2`, `rounded-sm` e iconos de 16. Es un ajuste del componente y va en su
  ficha («Diferencias con el registro»). El contador se oculta con `group-hover/menu-item` y `group-focus-within/menu-item`.
- **Estado «abriendo»:** `InstanceStatusBadge`, `InstanceAvatar` y `instanceStatusLabel` solo conocen «deteniendo». Hace
  falta el equivalente para `launch:<id>`.
- **Accesibilidad (AC-05):** `aria-label` «Abrir Claudio Personal» / «Detener Claudio Personal»; en curso,
  «Abriendo Claudio Karibu…» con `aria-busy`. El botón del sidebar es hermano del `Link` dentro del `<li>`.
- `prefers-reduced-motion`: el spinner y el latido se paran.
- Omitido en la maqueta por no cambiar: el grupo «Proyectos» del sidebar.

## Autoevaluación de espaciado y proporción

No hay una skill de UX dedicada en este entorno; se revisó contra la retícula y la escala de `DESIGN.md` (HU-0022).

| Punto | Medida | Veredicto |
| --- | --- | --- |
| Caja del botón del sidebar | 24 × 24 en una fila de 32: 4 px arriba, abajo y a la derecha; la misma que el contador | Correcto, cae en la retícula de 4 px |
| Icono del botón del sidebar | 16 px en 24 (`ctl-badge`) | Correcto; legible. Un icono de 12 (`icon-xs`) quedaba pequeño |
| Objetivo de clic del sidebar | 24 × 24 | Aceptable en escritorio; ampliable con un área invisible de 8 px, ya prevista en `SidebarMenuAction` |
| Fila del dashboard | 8 px de relleno vertical, 12 horizontal, hueco de 12; alto 60 con la insignia en una línea | Correcto; sube a unos 84 si la insignia salta de línea (980 px) |
| Botón del dashboard | 32 de alto (`btn sm`), radio 8, 104 de ancho, 12 de relleno | Correcto; mismo alto que el avatar (32), alineados al centro |
| Escala de texto | Todo en `--fs-*` / `--lh-*`, sin tamaños nuevos | Correcto |
| Contraste del foco | Anillo de 2 px en `--ui-primary-text` (7,1:1 oscuro, 5,3:1 claro) | Correcto |
| 980 × 680 | Cifras en 3 + 2; la lista se desplaza dentro de `PageContent` | Correcto; la cuarta fila queda bajo el pliegue, como hoy |
| Riesgo | En 980 px un nombre largo más la insignia ocupan dos líneas | Ya ocurre hoy; el botón de solo icono lo limita |

## A decidir

- Sidebar plegado sin botón (2).
- «Abrir» neutro y «Detener» en tono naranja en el dashboard (4).
- Botones desactivados mientras corre cualquier operación (6).
- Botón en ≤ 1070 px solo con icono (3).
