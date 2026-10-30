import { lazy } from "react";

/**
 * El diálogo de anclar se carga al abrirlo: no entra en el JS principal (R-7 de la revisión). Quien lo monta lo envuelve
 * en un `Suspense`; el selector nativo ya tardó más que el `import()`.
 */
export const PinProjectDialog = lazy(() => import("./PinProjectDialog").then(({ PinProjectDialog: Dialog }) => ({ default: Dialog })));

export { ProjectsProvider } from "./ProjectsProvider";
export { useProjects } from "./useProjects";
export { usePinProject } from "./usePinProject";
export type { PickResult, ProjectsContextValue } from "./projects-context";
export { ProjectsView, PinProjectButton, RefreshProjectsButton } from "./ProjectsView";
export { ProjectPage } from "./ProjectPage";
export { ProjectBrokenPage } from "./ProjectBrokenPage";
export { ProjectInitial } from "./ProjectInitial";
export {
  findProject,
  inProgressCount,
  isReadable,
  projectName,
  selectProtectedProjects,
  sortProjects,
  STATUS_LABEL,
  type ProtectedProjectsUse,
  type ReadableProject,
} from "./projects-selectors";
