export type AppTheme = "system" | "dark" | "light";
export type SessionTextSize = "compact" | "comfortable" | "large";
export type ResolvedTheme = "dark" | "light";

export interface AppearancePreferences {
  theme: AppTheme;
  sessionTextSize: SessionTextSize;
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
};

export function loadAppearancePreferences(storage?: PreferencesStorage): AppearancePreferences {
  try {
    const source = storage ?? window.localStorage;
    const stored = JSON.parse(source.getItem(APPEARANCE_STORAGE_KEY) ?? "null") as Partial<AppearancePreferences> | null;
    const theme = stored?.theme;
    const sessionTextSize = stored?.sessionTextSize;
    return {
      theme: theme === "light" || theme === "dark" || theme === "system" ? theme : DEFAULT_APPEARANCE.theme,
      sessionTextSize: sessionTextSize === "compact" || sessionTextSize === "comfortable" || sessionTextSize === "large"
        ? sessionTextSize
        : DEFAULT_APPEARANCE.sessionTextSize,
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
