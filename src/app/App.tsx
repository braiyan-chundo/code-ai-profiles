import { DashboardProvider } from "../features/dashboard";
import AppView from "./AppView";
import { DashboardRuntime } from "./providers/DashboardRuntime";

export default function App() {
  return (
    <DashboardProvider>
      <DashboardRuntime>
        <AppView />
      </DashboardRuntime>
    </DashboardProvider>
  );
}
