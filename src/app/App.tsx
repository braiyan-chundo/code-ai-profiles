import { DashboardProvider } from "../features/dashboard";
import AppView from "./AppView";

export default function App() {
  return (
    <DashboardProvider>
      <AppView />
    </DashboardProvider>
  );
}
