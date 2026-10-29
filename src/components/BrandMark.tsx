import type { SVGProps } from "react";

type BrandMarkProps = SVGProps<SVGSVGElement> & { size?: number };

/**
 * La marca de Code AI Profiles: la nube con la marca de verificación. También es el icono por defecto de una instancia
 * sin icono propio (HU-0016, A-14). El resto de iconos de la interfaz son de lucide.
 */
export function BrandMark({ size = 20, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6.5 19h11a4.5 4.5 0 0 0 .68-8.95A6.6 6.6 0 0 0 5.5 8.6 5.2 5.2 0 0 0 6.5 19Z" />
      <path d="m9.4 13.4 1.7 1.7 3.8-4" />
    </svg>
  );
}
