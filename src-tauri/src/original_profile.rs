//! La carpeta de datos de la aplicación original (HU-0029): una sola resolución (la elegida por la persona
//! si sigue valiendo, si no la detectada), su validación con metadatos de nombres, la preferencia guardada en
//! `original-profile.json` y el selector nativo. Validar y resolver no abren ni listan ningún archivo de la
//! carpeta: solo `symlink_metadata`, `is_dir` y `canonicalize` (este último solo para comparar).

use super::*;

const CODE_SESSIONS_FOLDER: &str = "claude-code-sessions";

const MISSING_FOLDER: &str = "La carpeta elegida no existe o no es una carpeta. No se guardó nada.";
const SYMLINK_FOLDER: &str =
    "La carpeta elegida es un enlace simbólico. Elige la carpeta real. No se guardó nada.";
const WITHOUT_CODE_SESSIONS: &str = "Esa carpeta no tiene «claude-code-sessions». Elige la carpeta de datos de Claude que la contiene. No se guardó nada.";
const APP_DATA_FOLDER: &str = "Esa carpeta es de los datos de Code AI Profiles, donde viven las instancias. Elige la de la aplicación original. No se guardó nada.";
const UNSAVEABLE_PATH: &str =
    "La ruta de la carpeta elegida no se puede guardar. No se guardó nada.";

/// La carpeta efectiva de la original y de dónde sale. `detected` y `chosen` se conservan para la lista de
/// exclusión de Proyectos.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct OriginalProfile {
    /// The effective folder: the chosen one when still valid, else the detected one.
    pub(crate) path: Option<PathBuf>,
    pub(crate) origin: OriginalProfileOrigin,
    pub(crate) has_code_sessions: bool,
    /// A chosen folder is saved but no longer valid (D-5).
    pub(crate) chosen_missing: bool,
    pub(crate) detected: Option<PathBuf>,
    /// The saved choice, valid or not.
    pub(crate) chosen: Option<PathBuf>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OriginalProfileChoice {
    path: String,
}

/// Resuelve la carpeta de la original con la preferencia guardada y la detección de la plataforma. Nunca
/// falla: sin preferencia, o con el archivo dañado, se comporta como antes de HU-0029.
pub(crate) fn resolve_original_profile(paths: &ManagedPaths) -> OriginalProfile {
    resolve_original_profile_with(
        read_original_profile_choice(paths),
        detect_original_profile,
        &paths.app_data,
    )
}

/// La resolución pura, con la preferencia y la detección inyectadas.
pub(crate) fn resolve_original_profile_with(
    chosen: Option<PathBuf>,
    detect: impl FnOnce() -> Option<PathBuf>,
    app_data: &Path,
) -> OriginalProfile {
    let detected = detect();
    if let Some(chosen_path) = &chosen {
        if validate_original_profile_folder(chosen_path, app_data).as_ref() == Ok(chosen_path) {
            return OriginalProfile {
                path: Some(chosen_path.clone()),
                origin: OriginalProfileOrigin::Chosen,
                has_code_sessions: true,
                chosen_missing: false,
                detected,
                chosen,
            };
        }
    }
    OriginalProfile {
        path: detected.clone(),
        origin: if detected.is_some() {
            OriginalProfileOrigin::Detected
        } else {
            OriginalProfileOrigin::None
        },
        has_code_sessions: detected
            .as_deref()
            .is_some_and(|path| path.join(CODE_SESSIONS_FOLDER).is_dir()),
        chosen_missing: chosen.is_some(),
        detected,
        chosen,
    }
}

/// Las rutas de la original que Proyectos no lista ni lee: la efectiva, la detectada y la elegida guardada
/// (aunque ya no valga), sin repetir.
pub(crate) fn original_profile_deny(profile: &OriginalProfile) -> Vec<PathBuf> {
    let mut deny: Vec<PathBuf> = Vec::new();
    for path in [&profile.path, &profile.detected, &profile.chosen]
        .into_iter()
        .flatten()
    {
        if !deny.contains(path) {
            deny.push(path.clone());
        }
    }
    deny
}

fn is_code_sessions_name(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case(CODE_SESSIONS_FOLDER))
}

/// Una carpeta real (no un enlace simbólico ni una unión), por sus metadatos.
fn check_real_folder(path: &Path) -> Result<(), String> {
    if !path.is_absolute() {
        return Err(MISSING_FOLDER.to_string());
    }
    let metadata = fs::symlink_metadata(path).map_err(|_| MISSING_FOLDER.to_string())?;
    if metadata.file_type().is_symlink() {
        return Err(SYMLINK_FOLDER.to_string());
    }
    if !metadata.is_dir() {
        return Err(MISSING_FOLDER.to_string());
    }
    Ok(())
}

/// Valida la carpeta que eligió la persona y devuelve la carpeta de datos que se guardaría (la elegida, o la
/// que contiene `claude-code-sessions` si eligió esa). Solo metadatos: no abre ningún archivo.
pub(crate) fn validate_original_profile_folder(
    picked: &Path,
    app_data: &Path,
) -> Result<PathBuf, String> {
    check_real_folder(picked)?;
    let profile = if is_code_sessions_name(picked) {
        let parent = picked.parent().ok_or_else(|| MISSING_FOLDER.to_string())?;
        check_real_folder(parent)?;
        parent.to_path_buf()
    } else {
        picked.to_path_buf()
    };
    let sessions = fs::symlink_metadata(profile.join(CODE_SESSIONS_FOLDER))
        .map_err(|_| WITHOUT_CODE_SESSIONS.to_string())?;
    if sessions.file_type().is_symlink() {
        return Err(SYMLINK_FOLDER.to_string());
    }
    if !sessions.is_dir() {
        return Err(WITHOUT_CODE_SESSIONS.to_string());
    }
    if path_is_within(&profile, app_data) || path_is_within(app_data, &profile) {
        return Err(APP_DATA_FOLDER.to_string());
    }
    if profile.to_str().is_none() {
        return Err(UNSAVEABLE_PATH.to_string());
    }
    Ok(profile)
}

/// La carpeta elegida guardada, sin validar. Ausente o dañada cuenta como «sin elegida».
pub(crate) fn read_original_profile_choice(paths: &ManagedPaths) -> Option<PathBuf> {
    let bytes = fs::read(&paths.original_profile).ok()?;
    let choice: OriginalProfileChoice = serde_json::from_slice(&bytes).ok()?;
    (!choice.path.is_empty()).then(|| PathBuf::from(choice.path))
}

fn save_original_profile_choice(paths: &ManagedPaths, profile: &Path) -> Result<(), String> {
    let path = profile
        .to_str()
        .ok_or_else(|| UNSAVEABLE_PATH.to_string())?;
    let bytes = serde_json::to_vec_pretty(&OriginalProfileChoice {
        path: path.to_string(),
    })
    .map_err(|error| format!("No se pudo guardar la carpeta elegida: {error}"))?;
    write_file_atomic(&paths.original_profile, &bytes, ".original-profile")
        .map_err(|error| format!("No se pudo guardar la carpeta elegida: {error}"))
}

/// Valida y guarda la carpeta elegida. Si no vale, no escribe nada.
pub(crate) fn choose_original_profile_folder_with(
    paths: &ManagedPaths,
    picked: &Path,
) -> Result<PathBuf, String> {
    let profile = validate_original_profile_folder(picked, &paths.app_data)?;
    save_original_profile_choice(paths, &profile)?;
    Ok(profile)
}

/// Olvida la carpeta elegida. Sin archivo ya está olvidada.
pub(crate) fn forget_original_profile_choice(paths: &ManagedPaths) -> Result<(), String> {
    match fs::remove_file(&paths.original_profile) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("No se pudo volver a la carpeta detectada: {error}")),
    }
}

pub(crate) fn choose_original_profile_folder_sync(
    app: &AppHandle,
    picked: &Path,
) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    choose_original_profile_folder_with(&paths, picked).map(|_| ())
}

pub(crate) fn forget_original_profile_folder_sync(app: &AppHandle) -> Result<(), String> {
    let paths = ManagedPaths::resolve(app)?;
    forget_original_profile_choice(&paths)
}

/// El selector nativo de carpetas, con la ventana `main` de padre, abierto en la carpeta que contiene la
/// detectada (en macOS `~/Library` está oculta) o en el home. `None` si la persona cancela. Se llama sin el
/// candado del registro: la persona puede tardar en elegir.
pub(crate) fn pick_original_profile_folder_sync(
    app: &AppHandle,
) -> Result<Option<PathBuf>, String> {
    use tauri_plugin_dialog::DialogExt;
    let mut dialog = app
        .dialog()
        .file()
        .set_title("Elige la carpeta de datos de Claude");
    if let Some(window) = app.get_webview_window("main") {
        dialog = dialog.set_parent(&window);
    }
    let start = detect_original_profile()
        .and_then(|detected| detected.parent().map(Path::to_path_buf))
        .filter(|parent| parent.is_dir())
        .or_else(dirs::home_dir);
    if let Some(start) = start {
        dialog = dialog.set_directory(start);
    }
    let Some(picked) = dialog.blocking_pick_folder() else {
        return Ok(None);
    };
    picked
        .into_path()
        .map(Some)
        .map_err(|error| format!("No se pudo leer la carpeta elegida: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::*;

    struct TempRoot(PathBuf);

    impl TempRoot {
        fn new(case: &str) -> Self {
            let root = env::temp_dir().join(format!("code-ai-original-{case}-{}", Uuid::new_v4()));
            fs::create_dir_all(&root).unwrap();
            Self(root)
        }

        fn app_data(&self) -> PathBuf {
            let app_data = self.0.join("app-data");
            fs::create_dir_all(&app_data).unwrap();
            app_data
        }

        /// A data folder with `claude-code-sessions/` inside.
        fn profile(&self, name: &str) -> PathBuf {
            let profile = self.0.join(name);
            fs::create_dir_all(profile.join(CODE_SESSIONS_FOLDER)).unwrap();
            profile
        }
    }

    impl Drop for TempRoot {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn without_choice_uses_detected_and_reports_its_sessions() {
        let root = TempRoot::new("detected");
        let app_data = root.app_data();
        let with_sessions = root.profile("Claude");
        let resolved =
            resolve_original_profile_with(None, || Some(with_sessions.clone()), &app_data);
        assert_eq!(resolved.path.as_ref(), Some(&with_sessions));
        assert_eq!(resolved.origin, OriginalProfileOrigin::Detected);
        assert!(resolved.has_code_sessions);
        assert!(!resolved.chosen_missing);

        let without_sessions = root.0.join("Empty");
        fs::create_dir_all(&without_sessions).unwrap();
        let resolved =
            resolve_original_profile_with(None, || Some(without_sessions.clone()), &app_data);
        assert_eq!(resolved.path.as_ref(), Some(&without_sessions));
        assert_eq!(resolved.origin, OriginalProfileOrigin::Detected);
        assert!(!resolved.has_code_sessions);
        assert!(!resolved.chosen_missing);
    }

    #[test]
    fn without_choice_nor_detected_is_none() {
        let root = TempRoot::new("none");
        let resolved = resolve_original_profile_with(None, || None, &root.app_data());
        assert_eq!(resolved.path, None);
        assert_eq!(resolved.origin, OriginalProfileOrigin::None);
        assert!(!resolved.has_code_sessions);
        assert!(!resolved.chosen_missing);
    }

    #[test]
    fn valid_choice_wins_over_detected() {
        let root = TempRoot::new("chosen");
        let app_data = root.app_data();
        let detected = root.profile("Claude");
        let chosen = root.profile("Elsewhere");
        let resolved = resolve_original_profile_with(
            Some(chosen.clone()),
            || Some(detected.clone()),
            &app_data,
        );
        assert_eq!(resolved.path.as_ref(), Some(&chosen));
        assert_eq!(resolved.origin, OriginalProfileOrigin::Chosen);
        assert!(resolved.has_code_sessions);
        assert!(!resolved.chosen_missing);
        assert_eq!(resolved.detected.as_ref(), Some(&detected));
        assert_eq!(resolved.chosen.as_ref(), Some(&chosen));
    }

    #[test]
    fn deleted_choice_falls_back_to_detected_and_says_so() {
        let root = TempRoot::new("deleted");
        let app_data = root.app_data();
        let detected = root.profile("Claude");
        let chosen = root.profile("Elsewhere");
        fs::remove_dir_all(&chosen).unwrap();
        let resolved = resolve_original_profile_with(
            Some(chosen.clone()),
            || Some(detected.clone()),
            &app_data,
        );
        assert_eq!(resolved.path.as_ref(), Some(&detected));
        assert_eq!(resolved.origin, OriginalProfileOrigin::Detected);
        assert!(resolved.has_code_sessions);
        assert!(resolved.chosen_missing);
        assert_eq!(resolved.chosen.as_ref(), Some(&chosen));

        let resolved = resolve_original_profile_with(Some(chosen.clone()), || None, &app_data);
        assert_eq!(resolved.path, None);
        assert_eq!(resolved.origin, OriginalProfileOrigin::None);
        assert!(resolved.chosen_missing);
    }

    #[test]
    fn choice_without_code_sessions_falls_back_to_detected() {
        let root = TempRoot::new("no-sessions");
        let app_data = root.app_data();
        let detected = root.0.join("Claude");
        fs::create_dir_all(&detected).unwrap();
        let chosen = root.profile("Elsewhere");
        fs::remove_dir_all(chosen.join(CODE_SESSIONS_FOLDER)).unwrap();
        let resolved = resolve_original_profile_with(
            Some(chosen.clone()),
            || Some(detected.clone()),
            &app_data,
        );
        assert_eq!(resolved.path.as_ref(), Some(&detected));
        assert_eq!(resolved.origin, OriginalProfileOrigin::Detected);
        assert!(!resolved.has_code_sessions);
        assert!(resolved.chosen_missing);
    }

    #[test]
    fn validation_accepts_a_folder_with_code_sessions_as_given() {
        let root = TempRoot::new("valid");
        let app_data = root.app_data();
        let profile = root.profile("Datos de Claude");
        assert_eq!(
            validate_original_profile_folder(&profile, &app_data),
            Ok(profile.clone())
        );
    }

    #[test]
    fn validation_of_the_code_sessions_folder_returns_its_parent() {
        let root = TempRoot::new("sessions-folder");
        let app_data = root.app_data();
        let profile = root.profile("Claude");
        assert_eq!(
            validate_original_profile_folder(&profile.join(CODE_SESSIONS_FOLDER), &app_data),
            Ok(profile.clone())
        );
    }

    #[test]
    fn validation_rejects_folder_without_code_sessions() {
        let root = TempRoot::new("without");
        let app_data = root.app_data();
        let folder = root.0.join("Documents");
        fs::create_dir_all(&folder).unwrap();
        assert_eq!(
            validate_original_profile_folder(&folder, &app_data),
            Err(WITHOUT_CODE_SESSIONS.to_string())
        );
        // `claude-code-sessions` as a plain file is not a sessions folder.
        fs::write(folder.join(CODE_SESSIONS_FOLDER), "x").unwrap();
        assert_eq!(
            validate_original_profile_folder(&folder, &app_data),
            Err(WITHOUT_CODE_SESSIONS.to_string())
        );
    }

    #[test]
    fn validation_rejects_missing_path_file_and_relative_path() {
        let root = TempRoot::new("missing");
        let app_data = root.app_data();
        assert_eq!(
            validate_original_profile_folder(&root.0.join("nope"), &app_data),
            Err(MISSING_FOLDER.to_string())
        );
        let file = root.0.join("file.txt");
        fs::write(&file, "x").unwrap();
        assert_eq!(
            validate_original_profile_folder(&file, &app_data),
            Err(MISSING_FOLDER.to_string())
        );
        assert_eq!(
            validate_original_profile_folder(Path::new("relative/Claude"), &app_data),
            Err(MISSING_FOLDER.to_string())
        );
    }

    #[test]
    fn validation_rejects_app_data_inside_or_containing_it() {
        let root = TempRoot::new("app-data");
        let app_data = root.app_data();
        fs::create_dir_all(app_data.join(CODE_SESSIONS_FOLDER)).unwrap();
        assert_eq!(
            validate_original_profile_folder(&app_data, &app_data),
            Err(APP_DATA_FOLDER.to_string())
        );
        let instance_profile = app_data.join("managed-instances/1234/profile");
        fs::create_dir_all(instance_profile.join(CODE_SESSIONS_FOLDER)).unwrap();
        assert_eq!(
            validate_original_profile_folder(&instance_profile, &app_data),
            Err(APP_DATA_FOLDER.to_string())
        );
        fs::create_dir_all(root.0.join(CODE_SESSIONS_FOLDER)).unwrap();
        assert_eq!(
            validate_original_profile_folder(&root.0, &app_data),
            Err(APP_DATA_FOLDER.to_string())
        );
    }

    #[cfg(unix)]
    #[test]
    fn validation_rejects_symbolic_links() {
        let root = TempRoot::new("symlink");
        let app_data = root.app_data();
        let real = root.profile("Real");
        let link = root.0.join("Link");
        std::os::unix::fs::symlink(&real, &link).unwrap();
        assert_eq!(
            validate_original_profile_folder(&link, &app_data),
            Err(SYMLINK_FOLDER.to_string())
        );

        let linked_sessions = root.0.join("LinkedSessions");
        fs::create_dir_all(&linked_sessions).unwrap();
        std::os::unix::fs::symlink(
            real.join(CODE_SESSIONS_FOLDER),
            linked_sessions.join(CODE_SESSIONS_FOLDER),
        )
        .unwrap();
        assert_eq!(
            validate_original_profile_folder(&linked_sessions, &app_data),
            Err(SYMLINK_FOLDER.to_string())
        );
    }

    #[test]
    fn choice_round_trips_through_the_preference_file() {
        let root = TempRoot::new("persist");
        let paths = test_managed_paths(&root.app_data());
        let profile = root.profile("Datos de Claude");
        assert_eq!(read_original_profile_choice(&paths), None);
        assert_eq!(
            choose_original_profile_folder_with(&paths, &profile.join(CODE_SESSIONS_FOLDER)),
            Ok(profile.clone())
        );
        assert_eq!(read_original_profile_choice(&paths), Some(profile.clone()));
        assert_eq!(
            resolve_original_profile(&paths).chosen.as_ref(),
            Some(&profile)
        );

        forget_original_profile_choice(&paths).unwrap();
        assert_eq!(read_original_profile_choice(&paths), None);
        assert!(!paths.original_profile.exists());
    }

    #[test]
    fn rejected_choice_writes_nothing_and_keeps_the_previous_one() {
        let root = TempRoot::new("rejected");
        let paths = test_managed_paths(&root.app_data());
        let profile = root.profile("Claude");
        choose_original_profile_folder_with(&paths, &profile).unwrap();
        let before = fs::read(&paths.original_profile).unwrap();
        assert_eq!(
            choose_original_profile_folder_with(&paths, &root.0.join("nope")),
            Err(MISSING_FOLDER.to_string())
        );
        assert_eq!(fs::read(&paths.original_profile).unwrap(), before);
    }

    #[test]
    fn forgetting_without_a_file_is_ok() {
        let root = TempRoot::new("forget");
        let paths = test_managed_paths(&root.app_data());
        assert_eq!(forget_original_profile_choice(&paths), Ok(()));
    }

    #[test]
    fn damaged_preference_file_counts_as_no_choice() {
        let root = TempRoot::new("damaged");
        let paths = test_managed_paths(&root.app_data());
        fs::write(&paths.original_profile, "{ not json").unwrap();
        assert_eq!(read_original_profile_choice(&paths), None);
        fs::write(&paths.original_profile, r#"{"path":""}"#).unwrap();
        assert_eq!(read_original_profile_choice(&paths), None);
        let resolved = resolve_original_profile_with(
            read_original_profile_choice(&paths),
            || None,
            &paths.app_data,
        );
        assert!(!resolved.chosen_missing);
    }

    #[test]
    fn deny_includes_effective_detected_and_saved_choice_once() {
        let root = TempRoot::new("deny");
        let app_data = root.app_data();
        let detected = root.profile("Claude");
        let chosen = root.0.join("Gone");
        let resolved = resolve_original_profile_with(
            Some(chosen.clone()),
            || Some(detected.clone()),
            &app_data,
        );
        assert_eq!(
            original_profile_deny(&resolved),
            vec![detected.clone(), chosen.clone()]
        );

        let valid = root.profile("Elsewhere");
        let resolved = resolve_original_profile_with(
            Some(valid.clone()),
            || Some(detected.clone()),
            &app_data,
        );
        assert_eq!(
            original_profile_deny(&resolved),
            vec![valid.clone(), detected.clone()]
        );
        assert!(
            original_profile_deny(&resolve_original_profile_with(None, || None, &app_data))
                .is_empty()
        );
    }
}
