import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { AppearancePreferences, ResolvedTheme } from "./appearance-preferences";

export interface AppearanceContextValue {
  preferences: AppearancePreferences;
  setPreferences: Dispatch<SetStateAction<AppearancePreferences>>;
  /** El tema que se aplica: `system` resuelto con `prefers-color-scheme`. */
  resolvedTheme: ResolvedTheme;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance debe usarse dentro de AppearanceProvider.");
  return value;
}
