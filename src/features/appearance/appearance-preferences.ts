export type AppTheme = "system" | "dark" | "light";
export type SessionTextSize = "compact" | "comfortable" | "large";
export type ResolvedTheme = "dark" | "light";
/** El sidebar desplegado o plegado a iconos (HU-0016, A-5). Se guarda aquí: la app no usa cookies. */
export type SidebarState = "expanded" | "collapsed";

export interface AppearancePreferences {
  theme: AppTheme;
  sessionTextSize: SessionTextSize;
  sidebar: SidebarState;
}

/** Lo mínimo de `localStorage` que usan las preferencias; las pruebas pasan un doble. */
export interface PreferencesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const APPEARANCE_STORAGE_KEY = "code-ai-profiles:appearance";
export const DEFAULT_APPEARANCE: AppearancePreferences = {
  theme: "system",
  sessionTextSize: "comfortable",
  sidebar: "expanded",
};

export function loadAppearancePreferences(storage?: PreferencesStorage): AppearancePreferences {
  try {
    const source = storage ?? window.localStorage;
    const stored = JSON.parse(source.getItem(APPEARANCE_STORAGE_KEY) ?? "null") as Partial<AppearancePreferences> | null;
    const theme = stored?.theme;
    const sessionTextSize = stored?.sessionTextSize;
    const sidebar = stored?.sidebar;
    return {
      theme: theme === "light" || theme === "dark" || theme === "system" ? theme : DEFAULT_APPEARANCE.theme,
      sessionTextSize: sessionTextSize === "compact" || sessionTextSize === "comfortable" || sessionTextSize === "large"
        ? sessionTextSize
        : DEFAULT_APPEARANCE.sessionTextSize,
      sidebar: sidebar === "expanded" || sidebar === "collapsed" ? sidebar : DEFAULT_APPEARANCE.sidebar,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearancePreferences(preferences: AppearancePreferences, storage?: PreferencesStorage): void {
  try {
    (storage ?? window.localStorage).setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // La app sigue funcionando aunque el WebView no permita persistir preferencias.
  }
}

export function resolveTheme(theme: AppTheme, systemDark: boolean): ResolvedTheme {
  return theme === "system"
    ? (systemDark ? "dark" : "light")
    : theme;
}
