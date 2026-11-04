# Reglas de negocio · instancias

### RN-01 · ~~El icono personalizado solo se ve dentro de Code AI Profiles en macOS~~ → ~~En macOS el icono personalizado de una instancia se ve también en el Dock~~ → En macOS el icono del Dock de una instancia es su imagen con el distintivo de la original
Cambiada en HU-0028 (antes: en el Dock se veía solo la imagen elegida, con la plantilla de macOS). El distintivo se
compone al aplicar el icono; la imagen guardada no cambia y la firma de Anthropic sigue igual.

Cambiada en HU-0020 (antes: la verificación estricta de firma retiraba el icono del bundle y solo se veía en la
app). La copia administrada conserva el icono de Finder y se comprueba con una verificación equivalente a la
estricta que no admite otro cambio; la firma de Anthropic no cambia. Si macOS lo exige, se pide el permiso
«Gestión de apps» y la persona reintenta.

### RN-05 · Una instancia con icono propio lleva el icono de la aplicación original en la esquina inferior derecha
Nace en HU-0028 (se cerró como RN-02 por error: ese id es de proyectos). Se ve en el Dock (macOS) y en la app (avatares de 32 y 64 px y vista previa del editor; no en 16 px,
donde el punto de estado sigue abajo). La imagen que eligió la persona no cambia: el distintivo se añade al mostrarla.
El distintivo es el icono real de la original instalada; si no se puede leer, no hay distintivo y nada falla. La
original y las instancias sin icono propio no lo llevan. En Windows y Linux solo se ve dentro de la app.
