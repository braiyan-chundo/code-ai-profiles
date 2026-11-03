import { localFileSource } from "../../lib/local-asset";
import type { ProjectSummary } from "../../types";
import { visibleIcon } from "./projects-selectors";

/** La URL de la imagen del proyecto para `ProjectInitial`, o `null` (sin icono, o proyecto roto: D-3). */
export function projectIconSource(project: ProjectSummary): string | null {
  const icon = visibleIcon(project);
  return icon ? localFileSource(icon.path, icon.revision) : null;
}
