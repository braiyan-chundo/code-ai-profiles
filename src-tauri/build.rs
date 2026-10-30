//! Fija al compilar la configuración propia de la app (ADR-0002).
//!
//! Cada clave `CAP_*` se toma, por este orden, del entorno del proceso de compilación, de `../.env.local` y
//! de `../.env.example`, y se pasa a `src/config.rs` con `cargo:rustc-env`. En ejecución no se lee ninguna.

use std::{
    env, fs,
    path::{Path, PathBuf},
};

const KEYS: [&str; 8] = [
    "CAP_UPDATE_FEED_URL",
    "CAP_UPDATE_RELEASES_URL",
    "CAP_UPDATE_DOWNLOAD_HOSTS",
    "CAP_WINDOWS_X64_DOWNLOAD_URL",
    "CAP_WINDOWS_ARM64_DOWNLOAD_URL",
    "CAP_LINUX_INSTALL_GUIDE_URL",
    "CAP_MACOS_APP_MANAGEMENT_SETTINGS_URL",
    "CAP_MACOS_FILES_AND_FOLDERS_SETTINGS_URL",
];

fn main() {
    let manifest_dir = PathBuf::from(
        env::var_os("CARGO_MANIFEST_DIR").expect("Cargo siempre define CARGO_MANIFEST_DIR"),
    );
    let project_root = manifest_dir
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| manifest_dir.clone());
    let local = project_root.join(".env.local");
    let example = project_root.join(".env.example");

    // Un archivo inexistente en rerun-if-changed obligaría a repetir el script en cada compilación.
    for file in [&local, &example] {
        if file.is_file() {
            println!("cargo:rerun-if-changed={}", file.display());
        }
    }

    let local_values = read_env_file(&local);
    let example_values = read_env_file(&example);
    let mut missing = Vec::new();
    for key in KEYS {
        println!("cargo:rerun-if-env-changed={key}");
        let value = env::var(key)
            .ok()
            .map(|value| clean_value(&value))
            .filter(|value| !value.is_empty())
            .or_else(|| lookup(&local_values, key))
            .or_else(|| lookup(&example_values, key));
        match value {
            Some(value) => println!("cargo:rustc-env={key}={value}"),
            None => missing.push(key),
        }
    }
    if !missing.is_empty() {
        panic!(
            "Falta la configuración de compilación {}: defínela en el entorno, en .env.local o en .env.example.",
            missing.join(", ")
        );
    }

    tauri_build::build()
}

fn read_env_file(path: &Path) -> Vec<(String, String)> {
    let Ok(contents) = fs::read_to_string(path) else {
        return Vec::new();
    };
    parse_env(&contents)
}

fn parse_env(contents: &str) -> Vec<(String, String)> {
    contents
        .lines()
        .filter_map(|line| {
            let line = line.trim_end_matches('\r').trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }
            let line = line.strip_prefix("export ").unwrap_or(line);
            let (key, value) = line.split_once('=')?;
            let key = key.trim();
            key.starts_with("CAP_")
                .then(|| (key.to_string(), clean_value(value)))
        })
        .collect()
}

fn clean_value(value: &str) -> String {
    let value = value.trim_end_matches('\r').trim();
    let unquoted = ['"', '\'']
        .iter()
        .find_map(|quote| {
            value
                .strip_prefix(*quote)
                .and_then(|rest| rest.strip_suffix(*quote))
        })
        .unwrap_or(value);
    unquoted.trim().to_string()
}

fn lookup(values: &[(String, String)], key: &str) -> Option<String> {
    values
        .iter()
        .rev()
        .find(|(candidate, _)| candidate == key)
        .map(|(_, value)| value.clone())
        .filter(|value| !value.is_empty())
}
