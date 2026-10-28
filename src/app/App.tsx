import { AppearanceProvider } from "../features/appearance";
import { DashboardProvider } from "../features/dashboard";
import AppView from "./AppView";
import { DashboardRuntime } from "./providers/DashboardRuntime";
import { DialogsProvider } from "./providers/DialogsProvider";

export default function App() {
  return (
    <AppearanceProvider>
      <DashboardProvider>
        <DashboardRuntime>
          <DialogsProvider>
            <AppView />
          </DialogsProvider>
        </DashboardRuntime>
      </DashboardProvider>
    </AppearanceProvider>
  );
}
