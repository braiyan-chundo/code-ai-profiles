import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppearanceContext, type AppearanceContextValue } from "./appearance-context";
import {
  loadAppearancePreferences,
  resolveTheme,
  saveAppearancePreferences,
  type AppearancePreferences,
} from "./appearance-preferences";

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearancePreferences>(loadAppearancePreferences);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    saveAppearancePreferences(appearance);
  }, [appearance]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  const resolvedTheme = resolveTheme(appearance.theme, systemDark);
  const value = useMemo<AppearanceContextValue>(
    () => ({ preferences: appearance, setPreferences: setAppearance, resolvedTheme }),
    [appearance, resolvedTheme],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
