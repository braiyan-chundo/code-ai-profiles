//! Tecnologías de los manifiestos de la raíz de cada repo (A-1.6, D-2).
//!
//! La tabla de nombres de paquete → etiqueta está cerrada en el código: no es configuración. Los
//! manifiestos TOML se leen línea a línea, sin dependencias. No se recorren subcarpetas; la única
//! ruta fija fuera de la raíz es `src-tauri/Cargo.toml`, la convención de Tauri.

use super::*;

const NPM_PACKAGES: &[(&str, &str)] = &[
    ("react", "React"),
    ("vite", "Vite"),
    ("tailwindcss", "Tailwind CSS"),
    ("react-router", "React Router"),
    ("react-router-dom", "React Router"),
    ("typescript", "TypeScript"),
    ("@tauri-apps/api", "Tauri"),
    ("next", "Next.js"),
    ("vue", "Vue"),
    ("nuxt", "Nuxt"),
    ("svelte", "Svelte"),
    ("@sveltejs/kit", "SvelteKit"),
    ("@angular/core", "Angular"),
    ("@nestjs/core", "NestJS"),
    ("express", "Express"),
    ("fastify", "Fastify"),
    ("astro", "Astro"),
    ("expo", "Expo"),
    ("react-native", "React Native"),
    ("electron", "Electron"),
    ("prisma", "Prisma"),
    ("@prisma/client", "Prisma"),
    ("mongoose", "Mongoose"),
];

const CRATES: &[(&str, &str)] = &[
    ("tauri", "Tauri"),
    ("axum", "Axum"),
    ("actix-web", "Actix Web"),
    ("tokio", "Tokio"),
];

const PYTHON_PACKAGES: &[(&str, &str)] = &[
    ("django", "Django"),
    ("fastapi", "FastAPI"),
    ("flask", "Flask"),
];

const GO_MODULES: &[(&str, &str)] = &[
    ("github.com/gin-gonic/gin", "Gin"),
    ("github.com/labstack/echo", "Echo"),
    ("github.com/gofiber/fiber", "Fiber"),
];

const MANIFESTS: &[(&str, u64)] = &[
    ("package.json", JSON_MANIFEST_LIMIT),
    ("Cargo.toml", MANIFEST_LIMIT),
    ("src-tauri/Cargo.toml", MANIFEST_LIMIT),
    ("pyproject.toml", MANIFEST_LIMIT),
    ("requirements.txt", MANIFEST_LIMIT),
    ("go.mod", MANIFEST_LIMIT),
    ("composer.json", JSON_MANIFEST_LIMIT),
    ("Gemfile", MANIFEST_LIMIT),
    ("pom.xml", MANIFEST_LIMIT),
    ("build.gradle", MANIFEST_LIMIT),
    ("build.gradle.kts", MANIFEST_LIMIT),
    ("pubspec.yaml", MANIFEST_LIMIT),
];

type Found = Vec<(&'static str, Option<String>)>;

pub(super) struct RepoTech {
    pub(super) manifests: Vec<String>,
    pub(super) technologies: Vec<ProjectTechnology>,
    /// `packageManager` de `package.json` (p. ej. `pnpm@12.8.0`).
    pub(super) package_manager: Option<String>,
}

pub(super) fn read_repo(
    ctx: &ReadContext<'_>,
    rel: &Path,
    repo_name: &str,
    warnings: &mut Vec<ProjectWarning>,
) -> RepoTech {
    let mut result = RepoTech {
        manifests: Vec::new(),
        technologies: Vec::new(),
        package_manager: None,
    };
    let mut found: Found = Vec::new();
    for (manifest, limit) in MANIFESTS {
        let text = match ctx.read(&rel.join(manifest), ReadMode::Whole(*limit)) {
            Ok(text) => text,
            Err(Skip::Missing) => continue,
            Err(skip) => {
                warnings.push(ProjectWarning::new(
                    ProjectWarningScope::Manifest,
                    Some(&format!("{repo_name}/{manifest}")),
                    format!("{manifest} {}.", skip.reason()),
                ));
                continue;
            }
        };
        result.manifests.push((*manifest).to_string());
        let detected = match *manifest {
            "package.json" => match package_json(&text) {
                Some((technologies, package_manager)) => {
                    if result.package_manager.is_none() {
                        result.package_manager = package_manager;
                    }
                    Ok(technologies)
                }
                None => Err(()),
            },
            "Cargo.toml" | "src-tauri/Cargo.toml" => Ok(cargo_toml(&text)),
            "pyproject.toml" | "requirements.txt" => Ok(python(&text)),
            "go.mod" => Ok(go_mod(&text)),
            "composer.json" => composer_json(&text).ok_or(()),
            "Gemfile" => Ok(gemfile(&text)),
            "pom.xml" | "build.gradle" => Ok(vec![("Java", None)]),
            "build.gradle.kts" => Ok(vec![("Kotlin", None)]),
            "pubspec.yaml" => Ok(pubspec(&text)),
            _ => Ok(Vec::new()),
        };
        match detected {
            Ok(technologies) => found.extend(technologies),
            Err(()) => warnings.push(ProjectWarning::new(
                ProjectWarningScope::Manifest,
                Some(&format!("{repo_name}/{manifest}")),
                format!("{manifest} no es JSON válido; no se leen sus tecnologías."),
            )),
        }
    }
    for (name, version) in found {
        if result.technologies.iter().any(|known| known.name == name) {
            continue;
        }
        result.technologies.push(ProjectTechnology {
            name: name.to_string(),
            version,
            source: ProjectTechnologySource::Manifest,
            repo: Some(repo_name.to_string()),
        });
    }
    result
}

/// `stack.gestor` y, si coincide, la versión mayor de `packageManager` (`pnpm@12.8.0` → `12`).
pub(super) fn package_manager(
    gestor: Option<&str>,
    field: Option<&str>,
) -> Option<ProjectTechnology> {
    let parsed = field.and_then(|field| {
        let (name, version) = field.trim().split_once('@')?;
        Some((clean_text(name, TEXT_CHARS), major_of(version)))
    });
    let (name, version) = match (gestor, parsed) {
        (Some(gestor), Some((name, version))) if name.eq_ignore_ascii_case(gestor) => {
            (gestor.to_string(), version)
        }
        (Some(gestor), _) => (gestor.to_string(), None),
        (None, Some((name, version))) if !name.is_empty() => (name, version),
        _ => return None,
    };
    Some(ProjectTechnology {
        name,
        version,
        source: ProjectTechnologySource::PackageManager,
        repo: None,
    })
}

/// La versión mayor de un rango (`^19.0.0` → `19`); `workspace:`, `*`, git o rutas → sin versión.
pub(super) fn major_of(range: &str) -> Option<String> {
    let range = range.trim();
    let lowered = range.to_ascii_lowercase();
    if [
        "workspace:",
        "file:",
        "link:",
        "npm:",
        "git",
        "http",
        "github:",
    ]
    .iter()
    .any(|prefix| lowered.starts_with(prefix))
        || range.contains('/')
    {
        return None;
    }
    let trimmed = range.trim_start_matches(['^', '~', '>', '<', '=', 'v', ' ']);
    let digits: String = trimmed.chars().take_while(char::is_ascii_digit).collect();
    digits.parse::<u64>().ok().map(|major| major.to_string())
}

fn pick(table: &[(&str, &'static str)], lookup: impl Fn(&str) -> Option<Option<String>>) -> Found {
    let mut found: Found = Vec::new();
    for (package, label) in table {
        if found.iter().any(|(known, _)| known == label) {
            continue;
        }
        if let Some(version) = lookup(package) {
            found.push((label, version));
        }
    }
    found
}

fn package_json(text: &str) -> Option<(Found, Option<String>)> {
    let value: Value = serde_json::from_str(text).ok()?;
    let dependency = |name: &str| {
        ["dependencies", "devDependencies"]
            .iter()
            .find_map(|section| value.get(section)?.get(name))
            .map(|range| range.as_str().and_then(major_of))
    };
    let package_manager = value
        .get("packageManager")
        .and_then(Value::as_str)
        .map(|field| clean_text(field, TEXT_CHARS));
    Some((pick(NPM_PACKAGES, dependency), package_manager))
}

fn toml_version(value: &str) -> Option<String> {
    let value = value.trim();
    if let Some(quoted) = value.strip_prefix('"') {
        return major_of(quoted.split('"').next()?);
    }
    if value.starts_with('{') {
        let index = value.find("version")?;
        let rest = value[index + "version".len()..]
            .trim_start()
            .strip_prefix('=')?;
        return toml_version(rest);
    }
    None
}

fn is_dependency_section(section: &str) -> bool {
    section == "dependencies"
        || section == "workspace.dependencies"
        || (section.starts_with("target.") && section.ends_with(".dependencies"))
}

pub(super) fn cargo_toml(text: &str) -> Found {
    let mut versions: Vec<(String, Option<String>)> = Vec::new();
    let mut section = String::new();
    let mut table_crate: Option<String> = None;
    for line in text.lines() {
        let line = line.split('#').next().unwrap_or("").trim();
        if line.is_empty() {
            continue;
        }
        if let Some(header) = line.strip_prefix('[') {
            section = header.trim_end_matches(']').trim().to_string();
            table_crate = section
                .strip_prefix("dependencies.")
                .map(|name| name.trim_matches('"').to_string());
            if let Some(name) = &table_crate {
                versions.push((name.clone(), None));
            }
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim().trim_matches('"');
        if let Some(name) = &table_crate {
            if key == "version" {
                if let Some(entry) = versions.iter_mut().rev().find(|(known, _)| known == name) {
                    entry.1 = toml_version(value);
                }
            }
            continue;
        }
        if is_dependency_section(&section) {
            let name = key.split('.').next().unwrap_or(key).trim_matches('"');
            versions.push((name.to_string(), toml_version(value)));
        }
    }
    let mut found: Found = vec![("Rust", None)];
    found.extend(pick(CRATES, |name| {
        versions
            .iter()
            .find(|(known, _)| known == name)
            .map(|(_, version)| version.clone())
    }));
    found
}

fn words(line: &str) -> impl Iterator<Item = String> + '_ {
    line.split(|character: char| {
        !(character.is_ascii_alphanumeric() || character == '-' || character == '_')
    })
    .filter(|word| !word.is_empty())
    .map(str::to_ascii_lowercase)
}

fn python(text: &str) -> Found {
    let mut found: Found = vec![("Python", None)];
    found.extend(pick(PYTHON_PACKAGES, |name| {
        text.lines()
            .any(|line| words(line).any(|word| word == name))
            .then_some(None)
    }));
    found
}

fn go_mod(text: &str) -> Found {
    let version = text.lines().find_map(|line| {
        let rest = line.trim().strip_prefix("go ")?;
        let version = rest.trim();
        (!version.is_empty() && version.chars().all(|c| c.is_ascii_digit() || c == '.'))
            .then(|| clean_text(version, TEXT_CHARS))
    });
    let mut found: Found = vec![("Go", version)];
    found.extend(pick(GO_MODULES, |module| {
        text.lines()
            .any(|line| line.split_whitespace().any(|word| word.starts_with(module)))
            .then_some(None)
    }));
    found
}

fn composer_json(text: &str) -> Option<Found> {
    let value: Value = serde_json::from_str(text).ok()?;
    let packages: Vec<(&str, Option<&str>)> = ["require", "require-dev"]
        .iter()
        .filter_map(|section| value.get(section)?.as_object())
        .flat_map(|object| {
            object
                .iter()
                .map(|(name, range)| (name.as_str(), range.as_str()))
        })
        .collect();
    let php = packages
        .iter()
        .find(|(name, _)| *name == "php")
        .and_then(|(_, range)| range.and_then(major_of));
    let mut found: Found = vec![("PHP", php)];
    if let Some((_, range)) = packages
        .iter()
        .find(|(name, _)| *name == "laravel/framework")
    {
        found.push(("Laravel", range.and_then(major_of)));
    }
    if let Some((_, range)) = packages
        .iter()
        .find(|(name, _)| *name == "symfony/framework-bundle")
        .or_else(|| {
            packages
                .iter()
                .find(|(name, _)| name.starts_with("symfony/"))
        })
    {
        found.push(("Symfony", range.and_then(major_of)));
    }
    Some(found)
}

fn gemfile(text: &str) -> Found {
    let mut found: Found = vec![("Ruby", None)];
    let rails = text.lines().any(|line| {
        let line = line.trim();
        line.starts_with("gem 'rails'") || line.starts_with("gem \"rails\"")
    });
    if rails {
        found.push(("Rails", None));
    }
    found
}

fn pubspec(text: &str) -> Found {
    let mut found: Found = vec![("Dart", None)];
    if text.lines().any(|line| line.trim().starts_with("flutter:")) {
        found.push(("Flutter", None));
    }
    found
}
