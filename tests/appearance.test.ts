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
  assert.deepEqual(loadAppearancePreferences(memoryStorage().storage), { theme: "system", sessionTextSize: "comfortable", sidebar: "expanded" });
  assert.deepEqual(loadAppearancePreferences(stored(null)), DEFAULT_APPEARANCE);
});

test("unas preferencias válidas se leen tal cual", () => {
  assert.deepEqual(
    loadAppearancePreferences(stored({ theme: "light", sessionTextSize: "large", sidebar: "collapsed" })),
    { theme: "light", sessionTextSize: "large", sidebar: "collapsed" },
  );
  assert.deepEqual(
    loadAppearancePreferences(stored({ theme: "dark", sessionTextSize: "compact", sidebar: "expanded" })),
    { theme: "dark", sessionTextSize: "compact", sidebar: "expanded" },
  );
});

test("sidebar: válido, inválido y ausente (A-5); una versión anterior sin el campo se despliega", () => {
  assert.equal(loadAppearancePreferences(stored({ theme: "dark", sidebar: "collapsed" })).sidebar, "collapsed");
  assert.equal(loadAppearancePreferences(stored({ theme: "dark", sidebar: "expanded" })).sidebar, "expanded");
  for (const invalid of ["hidden", true, 0, null, { open: false }]) {
    const loaded = loadAppearancePreferences(stored({ theme: "light", sessionTextSize: "large", sidebar: invalid }));
    assert.deepEqual(loaded, { theme: "light", sessionTextSize: "large", sidebar: "expanded" }, `sidebar: ${JSON.stringify(invalid)}`);
  }
  assert.deepEqual(
    loadAppearancePreferences(stored({ theme: "light", sessionTextSize: "large" })),
    { theme: "light", sessionTextSize: "large", sidebar: "expanded" },
  );
});

test("cada campo inválido cae a su valor por defecto sin tocar el otro", () => {
  assert.deepEqual(
    loadAppearancePreferences(stored({ theme: "sepia", sessionTextSize: "large", sidebar: "collapsed" })),
    { theme: "system", sessionTextSize: "large", sidebar: "collapsed" },
  );
  assert.deepEqual(
    loadAppearancePreferences(stored({ theme: "light", sessionTextSize: 14, sidebar: "collapsed" })),
    { theme: "light", sessionTextSize: "comfortable", sidebar: "collapsed" },
  );
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
  const preferences = { theme: "dark", sessionTextSize: "large", sidebar: "collapsed" } as const;
  saveAppearancePreferences(preferences, storage);
  assert.equal(values.get(APPEARANCE_STORAGE_KEY), JSON.stringify(preferences));
  assert.deepEqual(loadAppearancePreferences(storage), preferences);
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
