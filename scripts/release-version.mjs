import {
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const OWN_PACKAGE = "code-ai-profiles";
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const SOURCE_FILES = {
  packageJson: "package.json",
  packageLock: "package-lock.json",
  cargoToml: "src-tauri/Cargo.toml",
  cargoLock: "src-tauri/Cargo.lock",
  tauriConfig: "src-tauri/tauri.conf.json",
};

function canonicalVersion(value, label = "version") {
  if (typeof value !== "string" || !VERSION_PATTERN.test(value)) {
    throw new Error(
      `${label} must use canonical MAJOR.MINOR.PATCH SemVer without leading zeroes, prerelease, or build metadata.`,
    );
  }
  return value;
}

function parseJson(text, path) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

function packageSection(text, path) {
  const header = /^\[package\]\s*$/m.exec(text);
  if (!header) throw new Error(`${path} does not contain a [package] section.`);
  const remainder = text.slice(header.index + header[0].length);
  const nextHeader = /^\[/m.exec(remainder);
  const end = nextHeader
    ? header.index + header[0].length + nextHeader.index
    : text.length;
  return [text.slice(header.index, end)];
}

function cargoPackageBlocks(text) {
  const headers = [...text.matchAll(/^\[\[package\]\]\s*$/gm)];
  return headers.map((header, index) => [
    text.slice(header.index, headers[index + 1]?.index ?? text.length),
  ]);
}

function tomlString(block, key) {
  const match = block.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"\\s*$`, "m"));
  return match?.[1] ?? null;
}

function collectState(contents) {
  const packageJson = parseJson(contents.packageJson, SOURCE_FILES.packageJson);
  const packageLock = parseJson(contents.packageLock, SOURCE_FILES.packageLock);
  const tauriConfig = parseJson(contents.tauriConfig, SOURCE_FILES.tauriConfig);

  if (packageJson.name !== OWN_PACKAGE) {
    throw new Error(`${SOURCE_FILES.packageJson} must describe ${OWN_PACKAGE}.`);
  }
  if (packageLock.name !== OWN_PACKAGE || packageLock.packages?.[""]?.name !== OWN_PACKAGE) {
    throw new Error(`${SOURCE_FILES.packageLock} root package must be ${OWN_PACKAGE}.`);
  }

  const cargoTomlPackage = packageSection(contents.cargoToml, SOURCE_FILES.cargoToml)[0];
  if (tomlString(cargoTomlPackage, "name") !== OWN_PACKAGE) {
    throw new Error(`${SOURCE_FILES.cargoToml} [package] must be ${OWN_PACKAGE}.`);
  }

  const ownCargoLockBlocks = cargoPackageBlocks(contents.cargoLock).filter(
    (match) => tomlString(match[0], "name") === OWN_PACKAGE,
  );
  if (ownCargoLockBlocks.length !== 1) {
    throw new Error(
      `${SOURCE_FILES.cargoLock} must contain exactly one ${OWN_PACKAGE} package block.`,
    );
  }

  const versions = [
    [SOURCE_FILES.packageJson, packageJson.version],
    [`${SOURCE_FILES.packageLock} root`, packageLock.version],
    [`${SOURCE_FILES.packageLock} packages[\"\"]`, packageLock.packages[""].version],
    [SOURCE_FILES.cargoToml, tomlString(cargoTomlPackage, "version")],
    [SOURCE_FILES.cargoLock, tomlString(ownCargoLockBlocks[0][0], "version")],
    [SOURCE_FILES.tauriConfig, tauriConfig.version],
  ].map(([label, version]) => [label, canonicalVersion(version, label)]);

  const distinct = new Set(versions.map(([, version]) => version));
  if (distinct.size !== 1) {
    throw new Error(
      `Release versions are inconsistent:\n${versions
        .map(([label, version]) => `  ${label}: ${version}`)
        .join("\n")}`,
    );
  }

  return {
    currentVersion: versions[0][1],
    packageJson,
    packageLock,
    tauriConfig,
    cargoTomlPackage,
    ownCargoLockBlock: ownCargoLockBlocks[0][0],
  };
}

function requestedVersion(currentVersion, request) {
  const currentParts = currentVersion.split(".").map(BigInt);
  if (!["patch", "minor", "major"].includes(request)) {
    const exactVersion = canonicalVersion(request, "requested version");
    const exactParts = exactVersion.split(".").map(BigInt);
    const comparison = exactParts.findIndex(
      (part, index) => part !== currentParts[index],
    );
    if (
      comparison === -1 ||
      exactParts[comparison] < currentParts[comparison]
    ) {
      throw new Error(
        `Requested version ${exactVersion} must be greater than current version ${currentVersion}.`,
      );
    }
    return exactVersion;
  }

  if (request === "patch") currentParts[2] += 1n;
  if (request === "minor") currentParts.splice(1, 2, currentParts[1] + 1n, 0n);
  if (request === "major") currentParts.splice(0, 3, currentParts[0] + 1n, 0n, 0n);
  return currentParts.join(".");
}

function replaceTomlVersion(text, packageBlock, nextVersion, path) {
  const changedBlock = packageBlock.replace(
    /^version\s*=\s*"[^"]+"\s*$/m,
    `version = "${nextVersion}"`,
  );
  if (changedBlock === packageBlock) {
    throw new Error(`${path} package block does not contain a version.`);
  }
  return text.replace(packageBlock, changedBlock);
}

function renderContents(contents, state, nextVersion) {
  const packageJson = { ...state.packageJson, version: nextVersion };
  const packageLock = {
    ...state.packageLock,
    version: nextVersion,
    packages: {
      ...state.packageLock.packages,
      "": { ...state.packageLock.packages[""], version: nextVersion },
    },
  };
  const tauriConfig = { ...state.tauriConfig, version: nextVersion };

  return {
    packageJson: `${JSON.stringify(packageJson, null, 2)}\n`,
    packageLock: `${JSON.stringify(packageLock, null, 2)}\n`,
    cargoToml: replaceTomlVersion(
      contents.cargoToml,
      state.cargoTomlPackage,
      nextVersion,
      SOURCE_FILES.cargoToml,
    ),
    cargoLock: replaceTomlVersion(
      contents.cargoLock,
      state.ownCargoLockBlock,
      nextVersion,
      SOURCE_FILES.cargoLock,
    ),
    tauriConfig: `${JSON.stringify(tauriConfig, null, 2)}\n`,
  };
}

async function readSources(root) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(SOURCE_FILES).map(async ([key, relativePath]) => [
        key,
        await readFile(resolve(root, relativePath), "utf8"),
      ]),
    ),
  );
}

async function replacePreparedFiles(root, original, prepared, options = {}) {
  const staged = [];
  const replaced = [];
  const suffix = `.release-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    for (const [key, relativePath] of Object.entries(SOURCE_FILES)) {
      const targetPath = resolve(root, relativePath);
      const mode = (await stat(targetPath)).mode;
      const stagedPath = resolve(dirname(targetPath), `.${basename(targetPath)}${suffix}`);
      await writeFile(stagedPath, prepared[key], { encoding: "utf8", mode });
      staged.push([key, relativePath, stagedPath]);
    }

    for (let index = 0; index < staged.length; index += 1) {
      const [key, relativePath, stagedPath] = staged[index];
      if (options.failAtIndex === index) throw new Error("Simulated replacement failure.");
      const targetPath = resolve(root, relativePath);
      await rename(stagedPath, targetPath);
      replaced.push([key, targetPath]);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const [key, targetPath] of replaced.reverse()) {
      try {
        const mode = (await stat(targetPath)).mode;
        const rollbackPath = resolve(dirname(targetPath), `.${basename(targetPath)}${suffix}.rollback`);
        await writeFile(rollbackPath, original[key], { encoding: "utf8", mode });
        await rename(rollbackPath, targetPath);
      } catch (rollbackError) {
        rollbackErrors.push(`${targetPath}: ${rollbackError.message}`);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new Error(`${error.message} Rollback failed: ${rollbackErrors.join("; ")}`);
    }
    throw error;
  } finally {
    await Promise.all(
      staged.map(([, , stagedPath]) => rm(stagedPath, { force: true })),
    );
  }
}

export async function checkVersions(root = process.cwd()) {
  const contents = await readSources(root);
  const state = collectState(contents);
  return state.currentVersion;
}

export async function releaseVersion(root, request, options = {}) {
  if (!request) {
    throw new Error("Provide patch, minor, major, or an exact MAJOR.MINOR.PATCH version.");
  }
  const contents = await readSources(root);
  const state = collectState(contents);
  const nextVersion = requestedVersion(state.currentVersion, request);
  const prepared = renderContents(contents, state, nextVersion);
  await replacePreparedFiles(root, contents, prepared, options);
  const writtenVersion = await checkVersions(root);
  if (writtenVersion !== nextVersion) {
    throw new Error(`Version verification failed: expected ${nextVersion}, found ${writtenVersion}.`);
  }
  return { previousVersion: state.currentVersion, version: nextVersion };
}

async function main() {
  const [command, extra] = process.argv.slice(2);
  if (command === "--check") {
    if (extra) throw new Error("release:check does not accept arguments.");
    const version = await checkVersions();
    console.log(`Release versions are consistent: ${version}`);
    return;
  }
  if (extra) throw new Error("release:version accepts exactly one version argument.");
  const result = await releaseVersion(process.cwd(), command);
  console.log(`Release version updated: ${result.previousVersion} -> ${result.version}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(`Release version error: ${error.message}`);
    process.exitCode = 1;
  });
}
