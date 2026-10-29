import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
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
  const sessionTextSize = appearance.sessionTextSize;

  // HU-0016 (A-3): el tema y el tamaño del texto van en <html>, antes de pintar, para que los hereden también
  // los menús, diálogos y tooltips que Radix pinta en `body`. `body` sigue transparente (ventana de Windows).
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(`theme-${resolvedTheme}`);
    root.dataset.textSize = sessionTextSize;
    return () => {
      root.classList.remove(`theme-${resolvedTheme}`);
      delete root.dataset.textSize;
    };
  }, [resolvedTheme, sessionTextSize]);

  const value = useMemo<AppearanceContextValue>(
    () => ({ preferences: appearance, setPreferences: setAppearance, resolvedTheme }),
    [appearance, resolvedTheme],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}
