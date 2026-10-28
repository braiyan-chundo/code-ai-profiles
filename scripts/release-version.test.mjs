import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { checkVersions, releaseVersion } from "./release-version.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceFiles = [
  "package.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "src-tauri/tauri.conf.json",
];
const initialVersion = await checkVersions(projectRoot);

function increment(version, request) {
  const parts = version.split(".").map(Number);
  if (request === "patch") parts[2] += 1;
  if (request === "minor") parts.splice(1, 2, parts[1] + 1, 0);
  if (request === "major") parts.splice(0, 3, parts[0] + 1, 0, 0);
  return parts.join(".");
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "release-version-test-"));
  await Promise.all(sourceFiles.map((path) => cp(resolve(projectRoot, path), resolve(root, path), { recursive: true })));
  return root;
}

async function snapshots(root) {
  return Promise.all(sourceFiles.map((path) => readFile(resolve(root, path), "utf8")));
}

for (const [request, expected] of [
  ["patch", increment(initialVersion, "patch")],
  ["minor", increment(initialVersion, "minor")],
  ["major", increment(initialVersion, "major")],
  ["2.7.4", "2.7.4"],
]) {
  test(`updates every source for ${request}`, async (t) => {
    const root = await fixture();
    t.after(() => rm(root, { recursive: true, force: true }));
    const result = await releaseVersion(root, request);
    assert.equal(result.version, expected);
    assert.equal(await checkVersions(root), expected);
  });
}

test("rejects non-canonical SemVer without writing", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const before = await snapshots(root);
  await assert.rejects(() => releaseVersion(root, "01.2.3"), /canonical/);
  assert.deepEqual(await snapshots(root), before);
});

for (const [label, request] of [
  ["the current exact version", initialVersion],
  ["an exact downgrade", "0.0.0"],
]) {
  test(`rejects ${label} without writing`, async (t) => {
    const root = await fixture();
    t.after(() => rm(root, { recursive: true, force: true }));
    const before = await snapshots(root);
    await assert.rejects(() => releaseVersion(root, request), /must be greater/);
    assert.deepEqual(await snapshots(root), before);
  });
}

test("increments SemVer components beyond Number safe integer precision", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const hugeVersion = "90071992547409931234567890.4.6";
  await releaseVersion(root, hugeVersion);
  assert.equal(await checkVersions(root), hugeVersion);
  const result = await releaseVersion(root, "patch");
  assert.equal(result.version, "90071992547409931234567890.4.7");
  assert.equal(await checkVersions(root), result.version);
});

test("rejects inconsistent sources without writing", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const tauriPath = resolve(root, "src-tauri/tauri.conf.json");
  const tauriConfig = JSON.parse(await readFile(tauriPath, "utf8"));
  tauriConfig.version = "9.9.9";
  await writeFile(tauriPath, `${JSON.stringify(tauriConfig, null, 2)}\n`);
  const before = await snapshots(root);
  await assert.rejects(() => releaseVersion(root, "patch"), /inconsistent/);
  assert.deepEqual(await snapshots(root), before);
});

test("release check is read-only for consistent and divergent sources", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const consistent = await snapshots(root);
  assert.equal(await checkVersions(root), initialVersion);
  assert.deepEqual(await snapshots(root), consistent);

  const packagePath = resolve(root, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.version = "9.9.9";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  const divergent = await snapshots(root);
  await assert.rejects(() => checkVersions(root), /inconsistent/);
  assert.deepEqual(await snapshots(root), divergent);
});

test("rolls back every replaced source when a write fails", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const before = await snapshots(root);
  await assert.rejects(
    () => releaseVersion(root, "minor", { failAtIndex: 3 }),
    /Simulated replacement failure/,
  );
  assert.deepEqual(await snapshots(root), before);
  assert.equal(await checkVersions(root), initialVersion);
});
