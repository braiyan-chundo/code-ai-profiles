# Vista · HU-0028 · Distintivo de la app original en el icono de instancia

La maqueta es [`maqueta.html`](maqueta.html), solo HTML y CSS con los tokens de la app. El distintivo se lee de
`original-icon.png` junto a la maqueta (el `.icns` de la original pasado a PNG con `sips`), que no se versiona porque el
icono es de su autor; sin él sale un marcador neutro. Para verla con el icono real: `pnpm dev` y
`http://localhost:1420/hu/HU-0028-distintivo-de-la-app-original-en-el-icon/diseno/maqueta.html`. Ejes: `#tema=oscuro|claro`
y `#d=28|36|44` (tamaño del distintivo). No se ha tocado `src/`.

## Secciones

| Sección | Qué enseña |
| --- | --- |
| 1 · Dock | La plantilla de macOS actual (cuerpo de 824/1024 con radio 185 y sombra) con el distintivo encima, abajo a la derecha, montado sobre la esquina del cuerpo y con sombra suave; en el Dock junto a la original y a 256, 128, 64 y 32 px. |
| 2 · Página de la instancia | `InstanceAvatar` de 64 px: distintivo abajo a la derecha, punto de estado arriba a la derecha (abierta y detenida). |
| 3 · «Uso por instancia» y sidebar | 32 px con distintivo y punto arriba; una instancia sin icono propio no cambia; sidebar de 16 px sin distintivo y con el punto abajo, como hoy. |
| 4 · Editor | La vista previa de 96 px lleva el distintivo; «Quitar» vuelve al icono de la original. |
| 5 · Tamaños | 28, 36 ★ y 44 % del lado. |

Capturas en [`capturas/`](capturas/): la página entera a 1200 px en oscuro y claro, con el marcador neutro en lugar del
icono de la original (la persona aprobó la versión con el icono real, en local).

## Medidas

- Distintivo: 36 % del lado del icono, medido sobre el cuerpo visible del icono de la original (su `.icns` trae un
  margen transparente de ≈10 %, que se recorta).
- Dock: el distintivo sobresale del cuerpo y queda a ≈3,5 % del borde del lienzo de 1024; sombra de ≈1 % de desplazamiento.
- App: en 64 y 32 px sobresale 4 y 3 px de la esquina, con un halo de 1,5 px del color de la superficie; el punto de estado
  pasa a `top`/`right` con las mismas medidas que hoy tiene abajo.

## Decisiones (★)

Las de `hu.md`: D-1 icono real de la original, D-2 se añade al mostrar, D-3 36 %, D-4 punto arriba, D-5 sin distintivo
en 16 px, D-6 Windows y Linux solo en la app, D-7 sin icono legible no hay distintivo.
