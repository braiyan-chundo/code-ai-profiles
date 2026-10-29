# Vista · HU-0019 · Header compacto, sidebar flotante y tipografía

Maqueta estática: [`maqueta.html`](maqueta.html) (se abre con doble clic, sin servidor). Pantallas: dashboard (con
datos, con avisos, vacío), instancia, original y la escala tipográfica. Ejes: variante A/B/C, 1440×920 y 980×680,
sidebar desplegado, plegado o plegado con tooltip, texto compacto/normal/grande, macOS/Windows/Linux y tema.
Capturas en [`capturas/`](capturas/): `01`–`18` de la propuesta y `hoy-*` de la app actual. Datos del mock de `bridge.ts`.

## Qué cambia frente a hoy (medido en px; hoy, con la app real a 1440×920)

| Medida | Hoy | A ★ | B |
| --- | --- | --- | --- |
| Borde superior → primer contenido, macOS | 193 (barra 94 + cabecera 89 + 10) | **60** (barra 52 + 8) | 96 (40 + 48 + 8) |
| Ídem, Windows y Linux | 163 (64 + 89 + 10) | **60** | 96 |
| Título de la página | 22 px en su propia franja | 17 px en la barra: «Sección › Página» | 17 px en franja de 48 |
| Semáforos de macOS (`trafficLightPosition`) | x 28, y 40 | x 20, y 19 | x 20, y 13 |

- **Sidebar (D-2):** hoy 260 px pegado al borde, de y 94 al pie, con borde derecho. Propuesta: columna de 256 px =
  panel de 240 + 8 de margen a cada lado; radio 14 (`rounded-lg`), superficie `--surface-raised`, anillo `--text` al
  10 %. Va de y 60 a 8 px del pie. Plegado: hoy 48 px pegado; propuesta: panel de 48 + 2 × 8 = 64 px de columna, con
  tooltip a 14 px del icono. El catálogo ya trae `Sidebar variant="floating"` (margen `p-2`, mismo cálculo plegado).
- **Panel como la referencia:** marca arriba (A y C), buscador, secciones y contador de sesiones (4, 3, 1); al pie, Escanear y Apariencia.
- **Contenido:** márgenes laterales de 38/25 a 32/24 px; ancho útil a 1440: de 1104 a 1120 px. Barra de estado de
  52/48 a 36/32 px.
- **Tipografía (D-3):** seis tokens y un factor `--esc` para el alto de los controles. Pantalla «Escala tipográfica»:

| Token | Uso | Hoy | Compacto | Normal | Grande |
| --- | --- | --- | --- | --- | --- |
| `--fs-micro` | etiquetas en mayúsculas, chips, kbd, barra de estado, contexto | 7–10 | 11 | 11 | 12 |
| `--fs-small` | metadatos, pistas, rutas, versiones, descripciones, tooltip | 8–12 | 11 | 12 | 14 |
| `--fs-body` | sidebar, botones, avisos, título de sesión | 12–14 | 13 | 14 | 16 |
| `--fs-heading` | títulos de tarjeta, vacíos, marca (B) | 13–14 | 14 | 15 | 17 |
| `--fs-title` | título de página, marca del panel | 22 | 15 | 17 | 19 |
| `--fs-figure` | cifras y porcentajes | 24 | 20 | 22 | 26 |
| `--esc` | botón 36, entrada 32, chip 20, icono 16 | fijo | ×0,93 | ×1 | ×1,143 |

  Equivalencia con `--session-*` (compacto/normal/grande): título 10/12/14 → 13/14/16; metadatos 7/9/11 → 11/12/14;
  contexto, pistas y chip 6–10 → 11/11/12; fila fija 90/104/120 → automática. Nada baja de 11 px. La barra no
  cambia de alto con el texto (los semáforos tienen posición fija).

## Enlaces directos

- A ★: `maqueta.html#pantalla=dashboard&estado=avisos&ancho=1440&variante=A&tema=oscuro&sidebar=desplegado&letra=normal&plataforma=macos`
- Cada eje se cambia en el enlace: `comparar=si` (A, B y C lado a lado), `sidebar=tooltip`, `plataforma=windows`,
  `letra=grande`, `ancho=980`, `tema=claro`, `pantalla=instancia|original|escala`, `estado=con-datos|vacio`.

## Lo que tienes que elegir

1. **D-1 · Cabecera:** A ★ (una sola barra de 52 px, −133 px en macOS) o B (dos barras de 40 + 48, −97 px).
2. **D-2 · Sidebar:** flotante como la referencia ★ (A) o pegado con un separador más marcado (C).
3. **D-3 · Texto:** escala global con la tabla de arriba ★ o solo subir los mínimos y dejar Apariencia para las sesiones.
4. **Detalles que vienen con A** (sí o no a cada uno): contador de sesiones en el sidebar (el dato ya existe y se
   muestra en otro sitio); la marca dentro del panel; «Escanear sistema» de la barra queda solo con icono por debajo
   de 1071 px (sigue en el pie del sidebar); barra de estado de 36 px.

## Notas para construir

- Textos pequeños de `--quiet` a `--muted`: `--quiet` da 3,4:1 en oscuro y 2,9:1 en claro (< 4,5:1); queda para
  puntos y separadores. La paleta no cambia. Acciones, avisos, atajos y estados, iguales. Windows: en A, 160 px
  reservados a la derecha; en B, los controles van en la barra de 40.
- El marco de la plantilla se amplió de forma genérica (`ejes`, `data-variante`, `altos`; ver su cabecera).
