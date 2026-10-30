import { useProjectsContext, type ProjectsContextValue } from "./projects-context";

/** El estado de Proyectos y sus acciones (HU-0023, A-4). Las acciones son estables entre renders. */
export function useProjects(): ProjectsContextValue {
  return useProjectsContext();
}
