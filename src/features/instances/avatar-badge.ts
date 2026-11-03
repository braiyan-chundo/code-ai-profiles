/**
 * HU-0028: ¿el avatar lleva el distintivo de la aplicación original? Solo si la instancia tiene icono propio y hay
 * distintivo, y mientras la imagen del distintivo no haya fallado al cargar (la ruta que falló no se reintenta).
 */
export function showsProviderBadge(iconSrc: string | null, badgeSrc: string | null, failedSrc: string | null): boolean {
  return Boolean(iconSrc && badgeSrc) && failedSrc !== badgeSrc;
}
