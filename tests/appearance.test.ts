import assert from "node:assert/strict";
import test from "node:test";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  loadAppearancePreferences,
  resolveTheme,
  saveAppearancePreferences,
  type PreferencesStorage,
} from "../src/features/appearance/appearance-preferences.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: PreferencesStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
  };
  return { storage, values };
}

function stored(value: unknown) {
  return memoryStorage({ [APPEARANCE_STORAGE_KEY]: JSON.stringify(value) }).storage;
}

test("la clave de almacenamiento no cambia", () => {
  assert.equal(APPEARANCE_STORAGE_KEY, "code-ai-profiles:appearance");
});

test("sin preferencias guardadas devuelve las de por defecto", () => {
  assert.deepEqual(loadAppearancePreferences(memoryStorage().storage), { theme: "system", sessionTextSize: "comfortable" });
  assert.deepEqual(loadAppearancePreferences(stored(null)), DEFAULT_APPEARANCE);
});

test("unas preferencias válidas se leen tal cual", () => {
  assert.deepEqual(loadAppearancePreferences(stored({ theme: "light", sessionTextSize: "large" })), { theme: "light", sessionTextSize: "large" });
  assert.deepEqual(loadAppearancePreferences(stored({ theme: "dark", sessionTextSize: "compact" })), { theme: "dark", sessionTextSize: "compact" });
});

test("cada campo inválido cae a su valor por defecto sin tocar el otro", () => {
  assert.deepEqual(loadAppearancePreferences(stored({ theme: "sepia", sessionTextSize: "large" })), { theme: "system", sessionTextSize: "large" });
  assert.deepEqual(loadAppearancePreferences(stored({ theme: "light", sessionTextSize: 14 })), { theme: "light", sessionTextSize: "comfortable" });
  assert.deepEqual(loadAppearancePreferences(stored({ other: true })), DEFAULT_APPEARANCE);
});

test("un JSON corrupto devuelve las de por defecto", () => {
  const { storage } = memoryStorage({ [APPEARANCE_STORAGE_KEY]: "{no-json" });
  assert.deepEqual(loadAppearancePreferences(storage), DEFAULT_APPEARANCE);
});

test("si getItem lanza, devuelve las de por defecto", () => {
  const storage: PreferencesStorage = {
    getItem: () => { throw new Error("SecurityError"); },
    setItem: () => undefined,
  };
  assert.deepEqual(loadAppearancePreferences(storage), DEFAULT_APPEARANCE);
});

test("save guarda el JSON en la misma clave", () => {
  const { storage, values } = memoryStorage();
  saveAppearancePreferences({ theme: "dark", sessionTextSize: "large" }, storage);
  assert.equal(values.get(APPEARANCE_STORAGE_KEY), JSON.stringify({ theme: "dark", sessionTextSize: "large" }));
  assert.deepEqual(loadAppearancePreferences(storage), { theme: "dark", sessionTextSize: "large" });
});

test("save traga el error si el almacenamiento falla", () => {
  const storage: PreferencesStorage = {
    getItem: () => null,
    setItem: () => { throw new Error("QuotaExceededError"); },
  };
  assert.doesNotThrow(() => saveAppearancePreferences(DEFAULT_APPEARANCE, storage));
});

test("resolveTheme: el sistema decide solo en `system`", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
  assert.equal(resolveTheme("light", true), "light");
});
