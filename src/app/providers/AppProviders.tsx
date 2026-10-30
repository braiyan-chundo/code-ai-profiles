import type { ReactNode } from "react";
import { AppearanceProvider } from "../../features/appearance";
import { DashboardProvider } from "../../features/dashboard";
import { ProjectsProvider } from "../../features/projects";
import { DashboardRuntime } from "./DashboardRuntime";
import { DialogsProvider } from "./DialogsProvider";

/**
 * El estado compartido, encima del router: navegar no lo reinicia ni recrea los controladores. `ProjectsProvider` (HU-0023)
 * va dentro de `DashboardRuntime` y fuera de `DialogsProvider`: no registra listeners de ventana.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <DashboardProvider>
        <DashboardRuntime>
          <ProjectsProvider>
            <DialogsProvider>
              {children}
            </DialogsProvider>
          </ProjectsProvider>
        </DashboardRuntime>
      </DashboardProvider>
    </AppearanceProvider>
  );
}
