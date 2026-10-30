import { useCallback } from "react";
import { useNavigate } from "react-router";
import { usePinProject } from "../../features/projects";
import { useDialogs } from "./dialogs-context";

/**
 * «Anclar proyecto» (HU-0023, A-4): abre el selector nativo y, si la persona elige una carpeta, levanta la bandera
 * `pinCandidate` para que `DialogHost` enseñe lo que se encontró. Cancelar el selector no hace nada. Si falla, el motivo
 * queda en el aviso de Proyectos y la persona va allí para verlo, desde donde esté.
 */
export function useStartPinProject() {
  const { busy, pickFolder } = usePinProject();
  const { setPinCandidate } = useDialogs();
  const navigate = useNavigate();
  const start = useCallback(async () => {
    const result = await pickFolder();
    if (result.status === "picked") setPinCandidate(result.candidate);
    else if (result.status === "failed") navigate("/proyectos");
  }, [navigate, pickFolder, setPinCandidate]);
  return { start, busy };
}
