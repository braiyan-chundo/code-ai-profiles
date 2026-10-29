import { useProjectsContext } from "./projects-context";

/**
 * Lo que necesita quien anclará un proyecto (HU-0023, A-4): abrir el selector, anclar la carpeta elegida y saber si hay
 * algo en curso. El diálogo (`PinProjectDialog`) y quien abre el selector comparten este estado: vive en el proveedor.
 */
export function usePinProject() {
  const { picking, pinning, pinError, pickFolder, pinFolder, clearPinError } = useProjectsContext();
  return { picking, pinning, busy: picking || pinning, pinError, pickFolder, pinFolder, clearPinError };
}
