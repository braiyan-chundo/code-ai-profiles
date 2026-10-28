import type { ReactNode } from "react";
import { AppearanceProvider } from "../../features/appearance";
import { DashboardProvider } from "../../features/dashboard";
import { DashboardRuntime } from "./DashboardRuntime";
import { DialogsProvider } from "./DialogsProvider";

/** El estado compartido, encima del router: navegar no lo reinicia ni recrea los controladores. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <DashboardProvider>
        <DashboardRuntime>
          <DialogsProvider>
            {children}
          </DialogsProvider>
        </DashboardRuntime>
      </DashboardProvider>
    </AppearanceProvider>
  );
}
