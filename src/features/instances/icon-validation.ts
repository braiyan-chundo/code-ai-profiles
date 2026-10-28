export const ICON_ACCEPTED_TYPES = ["image/png", "image/jpeg"];
export const ICON_MAX_BYTES = 5 * 1024 * 1024;
export const ICON_MIN_SIZE = 32;
export const ICON_MAX_SIZE = 4096;

/** Tipo y tamaño del archivo. Devuelve el mensaje de error o `null` si es válido. */
export function iconFileError(file: { type: string; size: number }): string | null {
  if (!ICON_ACCEPTED_TYPES.includes(file.type)) {
    return "Selecciona una imagen PNG o JPEG válida.";
  }
  if (file.size > ICON_MAX_BYTES) {
    return "La imagen supera el límite de 5 MiB.";
  }
  return null;
}

/** Dimensiones de la imagen decodificada. Devuelve el mensaje de error o `null` si son válidas. */
export function iconDimensionsError(width: number, height: number): string | null {
  const dimensionsValid = width >= ICON_MIN_SIZE && height >= ICON_MIN_SIZE && width <= ICON_MAX_SIZE && height <= ICON_MAX_SIZE;
  return dimensionsValid ? null : "Usa una imagen entre 32×32 y 4096×4096 píxeles.";
}
