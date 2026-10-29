import assert from "node:assert/strict";
import test from "node:test";
import {
  appManagementNames,
  joinNames,
  permissionCards,
  type PermissionCardsInput,
} from "../src/features/permissions/permission-cards.ts";

// HU-0022 (A-3, A-5): el catálogo puro de permisos. Sin DOM: lo que se ve de cada tarjeta, su estado, su botón y las
// plataformas. El estado sale solo del registro de instancias; nada se lee de los perfiles.

type Instance = PermissionCardsInput["instances"][number];
const icon = (systemIssue: "appManagement" | "other" | null): Instance["customIcon"] =>
  ({ systemIssue }) as unknown as Instance["customIcon"];
const withIssue = (name: string): Instance => ({ name, customIcon: icon("appManagement") });
const plain = (name: string): Instance => ({ name, customIcon: null });

const base: PermissionCardsInput = { platform: "macos", instances: [], admin: true, projectsAvailable: false };
const cardsOf = (input: Partial<PermissionCardsInput>) => permissionCards({ ...base, ...input });
const byId = (input: Partial<PermissionCardsInput>, id: string) => {
  const card = cardsOf(input).cards.find((item) => item.id === id);
  assert.ok(card, `falta la tarjeta ${id}`);
  return card;
};

test("macOS sin instancias bloqueadas: «Sin uso todavía», sin atención", () => {
  const result = cardsOf({ instances: [plain("Work Profile"), plain("Personal Dev")] });
  const card = result.cards[0];
  assert.equal(card.id, "appManagement");
  assert.equal(card.tone, "idle");
  assert.equal(card.status, "Sin uso todavía");
  assert.equal(card.who, null);
  assert.equal(result.attention, false);
});

test("macOS con una instancia bloqueada: singular, tono «needs» y atención", () => {
  const result = cardsOf({ instances: [withIssue("Work Profile"), plain("Personal Dev")] });
  const card = result.cards[0];
  assert.equal(card.tone, "needs");
  assert.equal(card.status, "Lo necesita: 1 instancia");
  assert.equal(card.who, "Work Profile");
  assert.equal(result.attention, true);
});

test("macOS con dos instancias bloqueadas: plural y los nombres", () => {
  const result = cardsOf({ instances: [withIssue("Work Profile"), withIssue("Personal Dev"), plain("Lab")] });
  assert.equal(result.cards[0].status, "Lo necesita: 2 instancias");
  assert.equal(result.cards[0].who, "Work Profile y Personal Dev");
  assert.equal(result.attention, true);
});

test("la instancia original no cuenta: solo se recibe el registro de instancias y otros problemas de icono no cuentan", () => {
  const other: Instance = { name: "Otra", customIcon: icon("other") };
  const result = cardsOf({ instances: [other, plain("Sin icono")] });
  assert.equal(result.cards[0].status, "Sin uso todavía");
  assert.deepEqual(appManagementNames([other, withIssue("A")]), ["A"]);
});

test("los nombres se unen con comas, «y» y «N más»", () => {
  assert.equal(joinNames([]), "");
  assert.equal(joinNames(["A"]), "A");
  assert.equal(joinNames(["A", "B"]), "A y B");
  assert.equal(joinNames(["A", "B", "C"]), "A, B y C");
  assert.equal(joinNames(["A", "B", "C", "D", "E"]), "A, B, C y 2 más");
});

test("cuenta de administrador: true, false, null y cargando", () => {
  const ok = byId({ admin: true }, "adminAccount");
  assert.equal(ok.status, "Tu cuenta es de administrador");
  assert.equal(ok.tone, "ok");
  const no = byId({ admin: false }, "adminAccount");
  assert.equal(no.status, "Tu cuenta no es de administrador: «Descargar e instalar» se parará");
  assert.equal(no.tone, "warn");
  const unknown = byId({ admin: null }, "adminAccount");
  assert.equal(unknown.status, "No se puede comprobar");
  assert.equal(unknown.tone, "unknown");
  const loading = byId({ admin: "loading" }, "adminAccount");
  assert.equal(loading.status, "Comprobando…");
  assert.equal(loading.tone, "pending");
});

test("la cuenta de administrador nunca pide atención, ni siquiera con admin en false", () => {
  assert.equal(cardsOf({ admin: false }).attention, false);
  assert.equal(cardsOf({ admin: false, instances: [withIssue("A")] }).attention, true, "solo lo da Gestión de apps");
});

test("projectsAvailable en false: dos tarjetas; en true: tres, en su orden", () => {
  assert.deepEqual(cardsOf({ projectsAvailable: false }).cards.map((card) => card.id), ["appManagement", "adminAccount"]);
  assert.deepEqual(cardsOf({ projectsAvailable: true }).cards.map((card) => card.id), ["appManagement", "filesAndFolders", "adminAccount"]);
});

test("Archivos y carpetas: «No se puede comprobar», sin atención y con su panel", () => {
  const card = byId({ projectsAvailable: true }, "filesAndFolders");
  assert.equal(card.status, "No se puede comprobar");
  assert.equal(card.tone, "unknown");
  assert.equal(card.panel, "filesAndFolders");
  assert.equal(cardsOf({ projectsAvailable: true }).attention, false);
  assert.ok(card.info.rows.some((row) => row.label === "Estado"), "explica por qué no se comprueba");
});

test("Windows y Linux: ninguna tarjeta y sin atención, aunque haya instancias con el aviso", () => {
  for (const platform of ["windows", "linux"] as const) {
    const result = permissionCards({ ...base, platform, instances: [withIssue("A")], projectsAvailable: true });
    assert.deepEqual(result, { cards: [], attention: false });
  }
});

test("las tarjetas sin panel no tienen botón ni mensaje de fallo; las demás, un panel y su ruta", () => {
  const cards = cardsOf({ projectsAvailable: true }).cards;
  for (const card of cards) {
    if (card.id === "adminAccount") {
      assert.equal(card.panel, null);
      assert.equal(card.openFailure, null);
    } else {
      assert.ok(card.panel, `${card.id} debe tener panel`);
      assert.ok(card.openFailure?.startsWith("No se pudo abrir Ajustes del Sistema. Ábrelo tú: Ajustes del Sistema › Privacidad y seguridad › "));
    }
  }
  assert.equal(cards[0].panel, "appManagement");
});

test("cada tarjeta trae nombre, para qué, «sin él», que es opcional y su ruta", () => {
  for (const card of cardsOf({ projectsAvailable: true }).cards) {
    assert.ok(card.name.length > 0);
    assert.ok(card.purpose.length > 0);
    const labels = card.info.rows.map((row) => row.label);
    assert.ok(labels.includes("Para qué"), `${card.id}: falta «Para qué»`);
    assert.ok(labels.some((label) => label === "Sin él" || label === "Sin ella"), `${card.id}: falta «Sin él»`);
    assert.match(card.info.optional, /^Opcional: /);
    assert.ok(card.info.path.length > 0);
    for (const row of card.info.rows) assert.ok(row.text.length > 0);
  }
});

test("ningún texto lleva una URL ni un esquema del sistema: el frontend solo manda el nombre del panel", () => {
  const serialized = JSON.stringify(cardsOf({ projectsAvailable: true, instances: [withIssue("A")] }));
  assert.doesNotMatch(serialized, /x-apple|https?:|systempreferences/i);
});
