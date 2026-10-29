//! macOS · copias administradas con el icono de Finder puesto (HU-0020).
//!
//! `NSWorkspace.setIcon` deja `Icon\r` y `com.apple.FinderInfo` en la raíz del bundle. La firma del proveedor no
//! cambia, pero `codesign --strict` lo rechaza como *detritus*. Para esas copias, y solo para ellas, `--strict`
//! se sustituye por la comprobación equivalente de `verify_managed_bundle` (arquitectura HU-0020, A-2). La
//! original, la descarga de la HU-0017 y toda copia sin icono siguen con `--strict`.

use super::*;
use std::ffi::{c_char, CString};
use std::io;
use std::os::unix::ffi::OsStrExt;
use std::os::unix::fs::PermissionsExt;
use std::process::Stdio;

/// Finder's custom icon file at the bundle root (`Icon` + carriage return).
pub(crate) const ROOT_ICON_FILE: &str = "Icon\r";
const CONTENTS_DIRECTORY: &str = "Contents";
const FINDER_INFO_XATTR: &[u8] = b"com.apple.FinderInfo";
const WORKSPACE_ICON_ATTEMPTS: usize = 3;
const WORKSPACE_ICON_RETRY_DELAY: Duration = Duration::from_millis(150);
const RESOURCE_FORK_XATTR: &[u8] = b"com.apple.ResourceFork";

/// A-2: the only message a person sees when a managed copy fails the check. No paths, no `codesign` output.
pub(crate) fn bundle_changed_message(name: &str) -> String {
    format!(
        "La copia de «{name}» cambió fuera de Code AI Profiles y no se abrirá. Sincronízala desde la original para recuperarla."
    )
}

/// Root of the bundle: clean (no Finder icon) or carrying `Icon\r` and/or the root FinderInfo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum BundleShape {
    Clean,
    Iconized,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum ManagedBundleState {
    /// Passed `--strict`. `code_hash_matches` is false when no CDHash is registered or it changed (D-3).
    Clean { code_hash_matches: bool },
    /// Passed the six steps of A-2 with the Finder icon in place.
    Iconized,
}

/// Why a managed copy failed. Internal only (tests and logs); the person sees `bundle_changed_message`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum BundleCheckFailure {
    Unreadable,
    ProviderIdentity,
    Downgrade,
    MissingProvenance,
    OriginalIdentity,
    DesignatedRequirement,
    CodeHash,
    BundleIdentity,
    TeamIdentity,
    Sideband,
    RootShape,
}

fn path_cstring(path: &Path) -> io::Result<CString> {
    CString::new(path.as_os_str().as_bytes())
        .map_err(|_| io::Error::from(io::ErrorKind::InvalidInput))
}

/// Extended attribute names of `path` itself (`XATTR_NOFOLLOW`: a symlink is never followed).
pub(crate) fn xattr_names(path: &Path) -> io::Result<Vec<Vec<u8>>> {
    let path = path_cstring(path)?;
    for _ in 0..3 {
        // SAFETY: `path` is a valid NUL-terminated string; a null buffer with size 0 only queries the size.
        let size = unsafe {
            libc::listxattr(path.as_ptr(), std::ptr::null_mut(), 0, libc::XATTR_NOFOLLOW)
        };
        if size < 0 {
            return Err(io::Error::last_os_error());
        }
        if size == 0 {
            return Ok(Vec::new());
        }
        let mut buffer = vec![0_u8; size as usize];
        // SAFETY: `buffer` has `buffer.len()` writable bytes.
        let read = unsafe {
            libc::listxattr(
                path.as_ptr(),
                buffer.as_mut_ptr().cast::<c_char>(),
                buffer.len(),
                libc::XATTR_NOFOLLOW,
            )
        };
        if read < 0 {
            let error = io::Error::last_os_error();
            if error.raw_os_error() == Some(libc::ERANGE) {
                continue;
            }
            return Err(error);
        }
        buffer.truncate(read as usize);
        return Ok(buffer
            .split(|byte| *byte == 0)
            .filter(|name| !name.is_empty())
            .map(<[u8]>::to_vec)
            .collect());
    }
    Err(io::Error::from_raw_os_error(libc::ERANGE))
}

fn has_xattr(path: &Path, name: &[u8]) -> io::Result<bool> {
    let path = path_cstring(path)?;
    let name = CString::new(name).map_err(|_| io::Error::from(io::ErrorKind::InvalidInput))?;
    // SAFETY: both strings are NUL-terminated; a null value buffer with size 0 only queries the size.
    let size = unsafe {
        libc::getxattr(
            path.as_ptr(),
            name.as_ptr(),
            std::ptr::null_mut(),
            0,
            0,
            libc::XATTR_NOFOLLOW,
        )
    };
    if size >= 0 {
        return Ok(true);
    }
    let error = io::Error::last_os_error();
    if error.raw_os_error() == Some(libc::ENOATTR) {
        Ok(false)
    } else {
        Err(error)
    }
}

fn remove_xattr(path: &Path, name: &[u8]) -> io::Result<()> {
    let path = path_cstring(path)?;
    let name = CString::new(name).map_err(|_| io::Error::from(io::ErrorKind::InvalidInput))?;
    // SAFETY: both strings are NUL-terminated.
    let result = unsafe { libc::removexattr(path.as_ptr(), name.as_ptr(), libc::XATTR_NOFOLLOW) };
    if result == 0 {
        return Ok(());
    }
    let error = io::Error::last_os_error();
    if error.raw_os_error() == Some(libc::ENOATTR) || error.kind() == io::ErrorKind::NotFound {
        Ok(())
    } else {
        Err(error)
    }
}

/// A-4.3: removes the Finder icon a fresh copy inherited from its source (`cp -c` and `ditto` keep `Icon\r` and
/// FinderInfo). Deletes `<root>/Icon\r` only when it is a regular file and removes the root FinderInfo. Runs on
/// a copy that is not visible yet, so no NSWorkspace. Anything else is left for `--strict` to reject.
pub(crate) fn strip_inherited_icon(bundle: &Path) -> io::Result<()> {
    let icon = bundle.join(ROOT_ICON_FILE);
    match fs::symlink_metadata(&icon) {
        Ok(metadata) if metadata.is_file() => match fs::remove_file(&icon) {
            Ok(()) => {}
            Err(error) if error.kind() == io::ErrorKind::NotFound => {}
            Err(error) => return Err(error),
        },
        Ok(_) => {}
        Err(error) if error.kind() == io::ErrorKind::NotFound => {}
        Err(error) => return Err(error),
    }
    remove_xattr(bundle, FINDER_INFO_XATTR)
}

/// Clean: neither `Icon\r` nor FinderInfo at the root. Iconized: one or both.
pub(crate) fn bundle_shape(bundle: &Path) -> io::Result<BundleShape> {
    let has_icon_file = match fs::symlink_metadata(bundle.join(ROOT_ICON_FILE)) {
        Ok(_) => true,
        Err(error) if error.kind() == io::ErrorKind::NotFound => false,
        Err(error) => return Err(error),
    };
    if has_icon_file || has_xattr(bundle, FINDER_INFO_XATTR)? {
        Ok(BundleShape::Iconized)
    } else {
        Ok(BundleShape::Clean)
    }
}

/// A-2 step 6: the root holds only `Contents` and `Icon\r`; `Icon\r` is a regular, empty, non-executable file.
fn check_root_shape(bundle: &Path) -> Result<(), BundleCheckFailure> {
    let root = fs::symlink_metadata(bundle).map_err(|_| BundleCheckFailure::Unreadable)?;
    if !root.is_dir() {
        return Err(BundleCheckFailure::RootShape);
    }
    let entries = fs::read_dir(bundle).map_err(|_| BundleCheckFailure::Unreadable)?;
    for entry in entries {
        let entry = entry.map_err(|_| BundleCheckFailure::Unreadable)?;
        let name = entry.file_name();
        let metadata =
            fs::symlink_metadata(entry.path()).map_err(|_| BundleCheckFailure::Unreadable)?;
        if name == CONTENTS_DIRECTORY {
            if !metadata.is_dir() {
                return Err(BundleCheckFailure::RootShape);
            }
        } else if name == ROOT_ICON_FILE {
            if !metadata.is_file()
                || metadata.len() != 0
                || metadata.permissions().mode() & 0o111 != 0
            {
                return Err(BundleCheckFailure::RootShape);
            }
        } else {
            return Err(BundleCheckFailure::RootShape);
        }
    }
    Ok(())
}

/// A-2 step 5: what `--strict=symlinks` leaves out. No FinderInfo or ResourceFork anywhere except the root and
/// `Icon\r`; no ResourceFork on the root. Walks with `lstat` and never follows a symlink.
fn check_sideband(bundle: &Path) -> Result<(), BundleCheckFailure> {
    let forbidden = |path: &Path, names: &[&[u8]]| -> Result<(), BundleCheckFailure> {
        let present = xattr_names(path).map_err(|_| BundleCheckFailure::Unreadable)?;
        if present
            .iter()
            .any(|name| names.iter().any(|forbidden| name.as_slice() == *forbidden))
        {
            Err(BundleCheckFailure::Sideband)
        } else {
            Ok(())
        }
    };
    forbidden(bundle, &[RESOURCE_FORK_XATTR])?;
    let mut pending = vec![bundle.to_path_buf()];
    while let Some(directory) = pending.pop() {
        let entries = fs::read_dir(&directory).map_err(|_| BundleCheckFailure::Unreadable)?;
        for entry in entries {
            let entry = entry.map_err(|_| BundleCheckFailure::Unreadable)?;
            let path = entry.path();
            if directory == bundle && entry.file_name() == ROOT_ICON_FILE {
                continue;
            }
            forbidden(&path, &[FINDER_INFO_XATTR, RESOURCE_FORK_XATTR])?;
            let metadata =
                fs::symlink_metadata(&path).map_err(|_| BundleCheckFailure::Unreadable)?;
            if metadata.is_dir() {
                pending.push(path);
            }
        }
    }
    Ok(())
}

/// Designated requirement printed by `codesign -d -r-` on stdout, explicit (`designated => …`) or implicit
/// (`# designated => cdhash H"…"`).
pub(crate) fn parse_designated_requirement(output: &str) -> Option<String> {
    output.lines().find_map(|line| {
        let line = line.trim();
        let line = line.strip_prefix('#').map(str::trim_start).unwrap_or(line);
        line.strip_prefix("designated =>")
            .map(str::trim)
            .filter(|requirement| !requirement.is_empty())
            .map(str::to_string)
    })
}

pub(crate) fn designated_requirement(bundle: &Path) -> Option<String> {
    let output = Command::new("/usr/bin/codesign")
        .args(["-d", "-r-"])
        .arg(bundle)
        .env("LC_ALL", "C")
        .stdin(Stdio::null())
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    parse_designated_requirement(&String::from_utf8_lossy(&output.stdout))
}

/// `codesign --verify --deep <strictness> -R =<requirement> <bundle>`, arguments as a list, `LC_ALL=C`.
fn codesign_satisfies(
    bundle: &Path,
    requirement: &str,
    strictness: &str,
) -> Result<bool, BundleCheckFailure> {
    let status = Command::new("/usr/bin/codesign")
        .args(["--verify", "--deep", strictness, "-R"])
        .arg(format!("={requirement}"))
        .arg(bundle)
        .env("LC_ALL", "C")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map_err(|_| BundleCheckFailure::Unreadable)?;
    Ok(status.success())
}

fn check_iconized(
    candidate: &Path,
    original: &Path,
    provenance: Option<&ProviderProvenance>,
) -> Result<ManagedBundleState, BundleCheckFailure> {
    // 1. Only a registered, provider-signed copy may carry the icon.
    let provenance = provenance
        .filter(|provenance| provenance.provider_signature_preserved)
        .ok_or(BundleCheckFailure::MissingProvenance)?;
    let expected_code_hash = provenance
        .managed_code_hash
        .as_deref()
        .ok_or(BundleCheckFailure::MissingProvenance)?;
    // 6 and 5 first: they are cheap and need no subprocess.
    check_root_shape(candidate)?;
    check_sideband(candidate)?;
    // 2. The original keeps `--strict` (cached by fingerprint) and gives the requirement.
    validate_provider_identity(original, original)
        .map_err(|_| BundleCheckFailure::OriginalIdentity)?;
    let requirement =
        designated_requirement(original).ok_or(BundleCheckFailure::OriginalIdentity)?;
    // 3. Deep seal, symlink checks and the original's designated requirement.
    if !codesign_satisfies(candidate, &requirement, "--strict=symlinks")? {
        return Err(BundleCheckFailure::DesignatedRequirement);
    }
    // 4. The exact registered binary, bundle id and Team ID.
    if macos_code_hash(candidate).as_deref() != Some(expected_code_hash) {
        return Err(BundleCheckFailure::CodeHash);
    }
    let candidate_bundle = macos_bundle_value(candidate, "CFBundleIdentifier");
    let original_bundle = macos_bundle_value(original, "CFBundleIdentifier");
    if candidate_bundle.is_none()
        || candidate_bundle != original_bundle
        || candidate_bundle.as_deref() != Some(provenance.bundle_identifier.as_str())
    {
        return Err(BundleCheckFailure::BundleIdentity);
    }
    let candidate_team = macos_team_identifier(candidate);
    if candidate_team != macos_team_identifier(original)
        || candidate_team != provenance.provider_team_identifier
    {
        return Err(BundleCheckFailure::TeamIdentity);
    }
    Ok(ManagedBundleState::Iconized)
}

fn check_clean(
    candidate: &Path,
    original: &Path,
    provenance: Option<&ProviderProvenance>,
) -> Result<ManagedBundleState, BundleCheckFailure> {
    validate_provider_identity_uncached(candidate, original)
        .map_err(|_| BundleCheckFailure::ProviderIdentity)?;
    let Some(provenance) = provenance else {
        return Ok(ManagedBundleState::Clean {
            code_hash_matches: false,
        });
    };
    let version = source_version(candidate).ok_or(BundleCheckFailure::ProviderIdentity)?;
    if version_is_newer(&provenance.provider_version, Some(&version)) {
        return Err(BundleCheckFailure::Downgrade);
    }
    let code_hash_matches = provenance.managed_code_hash.is_some()
        && macos_code_hash(candidate) == provenance.managed_code_hash;
    Ok(ManagedBundleState::Clean { code_hash_matches })
}

/// A-2 without writing anything. `Clean` follows `--strict`; `Iconized` follows the six steps.
pub(crate) fn check_managed_bundle(
    candidate: &Path,
    original: &Path,
    provenance: Option<&ProviderProvenance>,
) -> Result<ManagedBundleState, BundleCheckFailure> {
    match bundle_shape(candidate).map_err(|_| BundleCheckFailure::Unreadable)? {
        BundleShape::Clean => check_clean(candidate, original, provenance),
        BundleShape::Iconized => check_iconized(candidate, original, provenance),
    }
}

/// A clean copy against the original: `codesign --verify --deep --strict -R =<DR>` plus the same bundle id and
/// Team ID. Used before every registration and on the staging copy of a sync, before the swap.
pub(crate) fn check_clean_against_original(
    bundle: &Path,
    original: &Path,
) -> Result<(), BundleCheckFailure> {
    if bundle_shape(bundle).map_err(|_| BundleCheckFailure::Unreadable)? != BundleShape::Clean {
        return Err(BundleCheckFailure::RootShape);
    }
    validate_provider_identity(original, original)
        .map_err(|_| BundleCheckFailure::OriginalIdentity)?;
    let requirement =
        designated_requirement(original).ok_or(BundleCheckFailure::OriginalIdentity)?;
    if !codesign_satisfies(bundle, &requirement, "--strict")? {
        return Err(BundleCheckFailure::DesignatedRequirement);
    }
    let bundle_identifier = macos_bundle_value(bundle, "CFBundleIdentifier");
    if bundle_identifier.is_none()
        || bundle_identifier != macos_bundle_value(original, "CFBundleIdentifier")
    {
        return Err(BundleCheckFailure::BundleIdentity);
    }
    if macos_team_identifier(bundle) != macos_team_identifier(original) {
        return Err(BundleCheckFailure::TeamIdentity);
    }
    Ok(())
}

/// Registers the CDHash of a clean copy, only right after it passes `check_clean_against_original` and never
/// from an iconized copy. `minimum_version` rejects a downgrade below what was registered (D-3).
/// `managed_fingerprint` is still written for compatibility but is no longer a gate (★ D-E).
pub(crate) fn register_clean_provenance(
    bundle: &Path,
    original: &Path,
    minimum_version: Option<&str>,
) -> Result<ProviderProvenance, BundleCheckFailure> {
    check_clean_against_original(bundle, original)?;
    let provider_version = source_version(bundle)
        .filter(|version| valid_release_version(version))
        .ok_or(BundleCheckFailure::ProviderIdentity)?;
    if minimum_version.is_some_and(|minimum| version_is_newer(minimum, Some(&provider_version))) {
        return Err(BundleCheckFailure::Downgrade);
    }
    let managed_code_hash = macos_code_hash(bundle).ok_or(BundleCheckFailure::CodeHash)?;
    let bundle_identifier = macos_bundle_value(bundle, "CFBundleIdentifier")
        .ok_or(BundleCheckFailure::BundleIdentity)?;
    Ok(ProviderProvenance {
        bundle_identifier,
        provider_team_identifier: macos_team_identifier(bundle),
        provider_version,
        provider_source_fingerprint: fingerprint_label(original)
            .map_err(|_| BundleCheckFailure::Unreadable)?,
        managed_fingerprint: fingerprint_label(bundle)
            .map_err(|_| BundleCheckFailure::Unreadable)?,
        managed_code_hash: Some(managed_code_hash),
        provider_signature_preserved: true,
        original_icon_file: macos_bundle_value(bundle, "CFBundleIconFile"),
    })
}

/// A-2 for the person: any failure becomes `bundle_changed_message(name)`.
pub(crate) fn verify_managed_bundle(
    candidate: &Path,
    original: &Path,
    provenance: Option<&ProviderProvenance>,
    name: &str,
) -> Result<ManagedBundleState, String> {
    check_managed_bundle(candidate, original, provenance).map_err(|_| bundle_changed_message(name))
}

/// A-5 · literal messages for `CustomIcon.system_message`.
pub(crate) const MESSAGE_APPLIED: &str =
    "Se verá al abrir la instancia; la firma de la aplicación no cambia.";
pub(crate) const MESSAGE_REAPPLIED_AFTER_SYNC: &str =
    "Se reaplicó al sincronizar y se verá al abrir la instancia.";
pub(crate) const MESSAGE_APP_MANAGEMENT: &str = "macOS no dejó a Code AI Profiles cambiar el icono de la copia. Para verlo en el Dock, activa Code AI Profiles en Ajustes del Sistema › Privacidad y seguridad › Gestión de apps y pulsa «Reintentar». Si sigue igual, cierra y vuelve a abrir Code AI Profiles. El icono sigue visible dentro de la app.";
pub(crate) const MESSAGE_REJECTED: &str =
    "macOS no aplicó el icono a la copia. Pulsa «Reintentar» con la instancia detenida.";
const MESSAGE_REMOVE_REJECTED: &str =
    "macOS no quitó el icono de la copia. Vuelve a intentarlo con la instancia detenida.";
const MESSAGE_OUTSIDE_INSTANCES: &str =
    "El icono del Dock solo se aplica a copias administradas por Code AI Profiles.";

fn rejected_message(issue: Option<CustomIconSystemIssue>) -> &'static str {
    match issue {
        Some(CustomIconSystemIssue::AppManagement) => MESSAGE_APP_MANAGEMENT,
        None => MESSAGE_REJECTED,
    }
}

/// Why NSWorkspace or the direct removal did not change the bundle.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum WorkspaceIconError {
    /// Refused before touching anything: path guard or an unusable path. Always fatal.
    Refused(String),
    /// macOS did not apply the change. Not fatal when applying (A-4.1); fatal when removing (A-4.2).
    Rejected(Option<CustomIconSystemIssue>),
}

impl WorkspaceIconError {
    fn message(&self) -> String {
        match self {
            Self::Refused(message) => message.clone(),
            Self::Rejected(issue) => rejected_message(*issue).to_string(),
        }
    }
}

/// A-5 · `EPERM` writing inside the bundle is the signature of App Management. Anything else is generic.
pub(crate) fn classify_write_error(error: &io::Error) -> Option<CustomIconSystemIssue> {
    (error.raw_os_error() == Some(libc::EPERM)).then_some(CustomIconSystemIssue::AppManagement)
}

/// A-5 · after `setIcon` returned `false`: try to open `<root>/Icon\r` for writing (never following a symlink)
/// and remove it again if it did not exist. Never queries TCC and never asks for the permission.
fn classify_rejection(bundle: &Path) -> Option<CustomIconSystemIssue> {
    use std::os::unix::fs::OpenOptionsExt;

    let icon = bundle.join(ROOT_ICON_FILE);
    let existed = fs::symlink_metadata(&icon).is_ok();
    match fs::OpenOptions::new()
        .write(true)
        .create(true)
        .custom_flags(libc::O_NOFOLLOW)
        .open(&icon)
    {
        Ok(file) => {
            drop(file);
            if !existed {
                let _ = fs::remove_file(&icon);
            }
            None
        }
        Err(error) => classify_write_error(&error),
    }
}

/// A-3 · NSWorkspace only ever touches a bundle inside `ManagedPaths.instances` (canonicalized). The original
/// and anything else are refused before calling AppKit.
fn guard_managed_bundle(instances_root: &Path, bundle: &Path) -> Result<(), WorkspaceIconError> {
    let refused = || WorkspaceIconError::Refused(MESSAGE_OUTSIDE_INSTANCES.to_string());
    let root = fs::canonicalize(instances_root).map_err(|_| refused())?;
    let metadata = fs::symlink_metadata(bundle).map_err(|_| refused())?;
    if !metadata.is_dir() {
        return Err(refused());
    }
    let canonical = fs::canonicalize(bundle).map_err(|_| refused())?;
    if canonical == root || !canonical.starts_with(&root) {
        return Err(refused());
    }
    Ok(())
}

/// `NSWorkspace.setIcon:forFile:options:`. `Ok(false)` is NSWorkspace's own refusal.
fn workspace_set_icon(bundle: &Path, icon_path: Option<&Path>) -> Result<bool, WorkspaceIconError> {
    use std::ffi::c_void;

    type ObjcId = *mut c_void;
    type ObjcSel = *mut c_void;
    #[link(name = "AppKit", kind = "framework")]
    extern "C" {}
    #[link(name = "Foundation", kind = "framework")]
    extern "C" {}
    extern "C" {
        fn objc_getClass(name: *const c_char) -> ObjcId;
        fn sel_registerName(name: *const c_char) -> ObjcSel;
        fn objc_msgSend();
    }

    fn c_string(value: &str) -> Result<CString, WorkspaceIconError> {
        CString::new(value).map_err(|_| {
            WorkspaceIconError::Refused(
                "La ruta del icono contiene un carácter no válido.".to_string(),
            )
        })
    }
    let unusable =
        || WorkspaceIconError::Refused("La ruta del icono no es válida para macOS.".to_string());

    let bundle_text = c_string(bundle.to_str().ok_or_else(unusable)?)?;
    let icon_text = icon_path
        .map(|path| path.to_str().ok_or_else(unusable).and_then(c_string))
        .transpose()?;

    let class_pool = c_string("NSAutoreleasePool")?;
    let class_string = c_string("NSString")?;
    let class_image = c_string("NSImage")?;
    let class_workspace = c_string("NSWorkspace")?;
    let selector_new = c_string("new")?;
    let selector_string = c_string("stringWithUTF8String:")?;
    let selector_alloc = c_string("alloc")?;
    let selector_init_image = c_string("initWithContentsOfFile:")?;
    let selector_workspace = c_string("sharedWorkspace")?;
    let selector_set_icon = c_string("setIcon:forFile:options:")?;
    let selector_release = c_string("release")?;
    let selector_drain = c_string("drain")?;

    // SAFETY: plain Objective-C messaging with the documented signatures of each selector, inside an
    // autorelease pool that is always drained. The image is released after use.
    unsafe {
        let raw_message_send = objc_msgSend as *const ();
        let send_id: unsafe extern "C" fn(ObjcId, ObjcSel) -> ObjcId =
            std::mem::transmute(raw_message_send);
        let send_id_cstr: unsafe extern "C" fn(ObjcId, ObjcSel, *const c_char) -> ObjcId =
            std::mem::transmute(raw_message_send);
        let send_id_id: unsafe extern "C" fn(ObjcId, ObjcSel, ObjcId) -> ObjcId =
            std::mem::transmute(raw_message_send);
        let send_set_icon: unsafe extern "C" fn(ObjcId, ObjcSel, ObjcId, ObjcId, usize) -> bool =
            std::mem::transmute(raw_message_send);
        let send_void: unsafe extern "C" fn(ObjcId, ObjcSel) =
            std::mem::transmute(raw_message_send);

        let pool = send_id(
            objc_getClass(class_pool.as_ptr()),
            sel_registerName(selector_new.as_ptr()),
        );
        let string_class = objc_getClass(class_string.as_ptr());
        let path = send_id_cstr(
            string_class,
            sel_registerName(selector_string.as_ptr()),
            bundle_text.as_ptr(),
        );
        if path.is_null() {
            send_void(pool, sel_registerName(selector_drain.as_ptr()));
            return Err(unusable());
        }
        let image = if let Some(icon_text) = icon_text.as_ref() {
            let icon_path = send_id_cstr(
                string_class,
                sel_registerName(selector_string.as_ptr()),
                icon_text.as_ptr(),
            );
            let allocated = send_id(
                objc_getClass(class_image.as_ptr()),
                sel_registerName(selector_alloc.as_ptr()),
            );
            send_id_id(
                allocated,
                sel_registerName(selector_init_image.as_ptr()),
                icon_path,
            )
        } else {
            std::ptr::null_mut()
        };
        if icon_text.is_some() && image.is_null() {
            // The saved PNG could not be read: macOS did not apply anything.
            send_void(pool, sel_registerName(selector_drain.as_ptr()));
            return Err(WorkspaceIconError::Rejected(None));
        }
        let workspace = send_id(
            objc_getClass(class_workspace.as_ptr()),
            sel_registerName(selector_workspace.as_ptr()),
        );
        let applied = send_set_icon(
            workspace,
            sel_registerName(selector_set_icon.as_ptr()),
            image,
            path,
            0,
        );
        if !image.is_null() {
            send_void(image, sel_registerName(selector_release.as_ptr()));
        }
        send_void(pool, sel_registerName(selector_drain.as_ptr()));
        Ok(applied)
    }
}

#[cfg(test)]
thread_local! {
    /// `setIcon` calls made by this thread (tests only).
    static WORKSPACE_ICON_CALLS: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
}

/// Puts (`Some`) or removes (`None`) the Finder icon of a managed copy through NSWorkspace. A refusal is
/// classified (A-5).
pub(crate) fn set_workspace_icon(
    instances_root: &Path,
    bundle: &Path,
    icon_path: Option<&Path>,
) -> Result<(), WorkspaceIconError> {
    guard_managed_bundle(instances_root, bundle)?;
    // NSWorkspace is not safe to drive from several threads at once: concurrent `setIcon` calls fail at random.
    // Commands already run inside `with_registry_operation`; this lock covers every other caller.
    static WORKSPACE_ICON_LOCK: Mutex<()> = Mutex::new(());
    let _serialized = WORKSPACE_ICON_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    // `setIcon` is idempotent and local. It can return `false` for a moment on a bundle macOS is still
    // registering, so a refusal that is not App Management gets a few short attempts. App Management is never
    // retried: each attempt could show the system prompt again (R-4).
    let mut issue = None;
    for attempt in 0..WORKSPACE_ICON_ATTEMPTS {
        if attempt > 0 {
            thread::sleep(WORKSPACE_ICON_RETRY_DELAY);
        }
        #[cfg(test)]
        WORKSPACE_ICON_CALLS.with(|calls| calls.set(calls.get() + 1));
        if workspace_set_icon(bundle, icon_path)? {
            invalidate_application_cache();
            return Ok(());
        }
        issue = classify_rejection(bundle);
        if issue.is_some() {
            break;
        }
    }
    invalidate_application_cache();
    Err(WorkspaceIconError::Rejected(issue))
}

/// Removes the Finder icon: `setIcon(nil)` and then the direct removal of `Icon\r` and the root FinderInfo,
/// which also covers the case where NSWorkspace refused. `EPERM` on the direct removal is App Management.
pub(crate) fn clear_workspace_icon(
    instances_root: &Path,
    bundle: &Path,
) -> Result<(), WorkspaceIconError> {
    match set_workspace_icon(instances_root, bundle, None) {
        Ok(()) | Err(WorkspaceIconError::Rejected(_)) => {}
        Err(refused) => return Err(refused),
    }
    strip_inherited_icon(bundle)
        .map_err(|error| WorkspaceIconError::Rejected(classify_write_error(&error)))
}

/// What applying the icon left: the registered provenance and the three `CustomIcon` fields.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct IconOutcome {
    pub(crate) provenance: ProviderProvenance,
    pub(crate) system_applied: bool,
    pub(crate) system_issue: Option<CustomIconSystemIssue>,
    pub(crate) system_message: String,
}

impl IconOutcome {
    pub(crate) fn write_to(&self, icon: &mut CustomIcon) {
        icon.system_applied = self.system_applied;
        icon.system_issue = self.system_issue;
        icon.system_message = self.system_message.clone();
    }
}

/// Only a provenance written for a provider-signed copy can admit the Finder icon.
fn signed_provenance(provenance: Option<&ProviderProvenance>) -> Option<&ProviderProvenance> {
    provenance.filter(|provenance| provenance.provider_signature_preserved)
}

/// Removes the Finder icon and turns a refusal into the text for the person.
fn clear_icon_for_person(instances_root: &Path, bundle: &Path) -> Result<(), String> {
    match clear_workspace_icon(instances_root, bundle) {
        Ok(()) => Ok(()),
        Err(WorkspaceIconError::Refused(message)) => Err(message),
        Err(WorkspaceIconError::Rejected(Some(CustomIconSystemIssue::AppManagement))) => {
            Err(MESSAGE_APP_MANAGEMENT.to_string())
        }
        Err(WorkspaceIconError::Rejected(None)) => Err(MESSAGE_REMOVE_REJECTED.to_string()),
    }
}

/// R-2 · Finder icon leftovers on a copy without a provider-signed provenance (a failed rollback of an older
/// version, a Finder color label) can never pass A-2. With the instance stopped they are removed and the
/// clean path decides with `--strict`. Returns the shape after the cleanup.
fn clear_unregistered_leftovers(
    instances_root: &Path,
    bundle: &Path,
    shape: BundleShape,
    provenance: Option<&ProviderProvenance>,
    name: &str,
) -> Result<BundleShape, String> {
    if shape == BundleShape::Clean || signed_provenance(provenance).is_some() {
        return Ok(shape);
    }
    clear_icon_for_person(instances_root, bundle)?;
    bundle_shape(bundle).map_err(|_| bundle_changed_message(name))
}

/// The provenance an icon may be applied with: a clean copy is registered now (no downgrade below what was
/// registered), an iconized one must pass A-2 with the provenance it already has.
pub(crate) fn provenance_for_icon(
    instances_root: &Path,
    bundle: &Path,
    original: &Path,
    provenance: Option<&ProviderProvenance>,
    name: &str,
) -> Result<ProviderProvenance, String> {
    let changed = |_| bundle_changed_message(name);
    let shape = bundle_shape(bundle).map_err(|_| bundle_changed_message(name))?;
    match clear_unregistered_leftovers(instances_root, bundle, shape, provenance, name)? {
        BundleShape::Clean => register_clean_provenance(
            bundle,
            original,
            provenance.map(|provenance| provenance.provider_version.as_str()),
        )
        .map_err(changed),
        BundleShape::Iconized => {
            check_iconized(bundle, original, provenance).map_err(changed)?;
            provenance
                .cloned()
                .ok_or_else(|| bundle_changed_message(name))
        }
    }
}

/// A-4.1 after the provenance is settled: `setIcon`, then A-2 with the icon in place. A refused `setIcon` is not
/// fatal: the copy is left clean (or as it was) with `systemApplied=false`. A-2 failing after a successful
/// `setIcon` is fatal: the icon is removed and the caller restores the previous state.
pub(crate) fn apply_icon_to_registered(
    instances_root: &Path,
    bundle: &Path,
    icon_path: &Path,
    original: &Path,
    registered: ProviderProvenance,
    name: &str,
    applied_message: &str,
) -> Result<IconOutcome, String> {
    match set_workspace_icon(instances_root, bundle, Some(icon_path)) {
        Ok(()) => match check_managed_bundle(bundle, original, Some(&registered)) {
            Ok(ManagedBundleState::Iconized) => Ok(IconOutcome {
                provenance: registered,
                system_applied: true,
                system_issue: None,
                system_message: applied_message.to_string(),
            }),
            Ok(ManagedBundleState::Clean { .. }) => Ok(IconOutcome {
                provenance: registered,
                system_applied: false,
                system_issue: None,
                system_message: MESSAGE_REJECTED.to_string(),
            }),
            Err(_) => {
                let _ = clear_workspace_icon(instances_root, bundle);
                Err(bundle_changed_message(name))
            }
        },
        Err(WorkspaceIconError::Refused(message)) => Err(message),
        Err(WorkspaceIconError::Rejected(issue)) => {
            let _ = clear_workspace_icon(instances_root, bundle);
            check_managed_bundle(bundle, original, Some(&registered))
                .map_err(|_| bundle_changed_message(name))?;
            Ok(IconOutcome {
                provenance: registered,
                system_applied: false,
                system_issue: issue,
                system_message: rejected_message(issue).to_string(),
            })
        }
    }
}

/// A-4.2 · removes the icon and requires `--strict` again. App Management returns the A-5 text and changes nothing.
pub(crate) fn remove_custom_icon(
    instances_root: &Path,
    bundle: &Path,
    original: &Path,
    name: &str,
) -> Result<(), String> {
    clear_icon_for_person(instances_root, bundle)?;
    invalidate_application_cache();
    if bundle_shape(bundle).ok() != Some(BundleShape::Clean)
        || validate_provider_identity_uncached(bundle, original).is_err()
    {
        return Err(bundle_changed_message(name));
    }
    Ok(())
}

/// Puts back what the registry still says after a failed transaction: the previous icon when it was applied,
/// a clean copy otherwise.
pub(crate) fn restore_after_failure(
    instances_root: &Path,
    bundle: &Path,
    previous_icon: Option<&CustomIcon>,
    previous_provenance: Option<&ProviderProvenance>,
    original: &Path,
) -> Result<(), String> {
    match previous_icon.filter(|icon| icon.system_applied) {
        Some(icon) => {
            set_workspace_icon(instances_root, bundle, Some(Path::new(&icon.path)))
                .map_err(|error| error.message())?;
            check_managed_bundle(bundle, original, previous_provenance)
                .map(|_| ())
                .map_err(|_| "La copia no volvió a su estado anterior.".to_string())
        }
        None => {
            clear_workspace_icon(instances_root, bundle).map_err(|error| error.message())?;
            validate_provider_identity_uncached(bundle, original)
                .map_err(|_| "La copia no volvió a su estado anterior.".to_string())
        }
    }
}

fn with_rollback(error: String, rollback: Result<(), String>) -> String {
    match rollback {
        Ok(()) => error,
        Err(rollback_error) => {
            format!("{error} Además, no se pudo restaurar el icono anterior: {rollback_error}")
        }
    }
}

fn managed_bundle_of(
    paths: &ManagedPaths,
    instance: &ManagedInstance,
) -> Result<(PathBuf, PathBuf), String> {
    let root = paths.root_for(&instance.id)?;
    let app_path = PathBuf::from(&instance.app_path);
    if !path_is_within(&app_path, &root) {
        return Err("El bundle quedó fuera del root administrado.".to_string());
    }
    Ok((root, app_path))
}

/// A-4.1 · `set_instance_icon`: the caller checked that the instance is stopped and holds the registry operation.
pub(crate) fn set_instance_icon(
    paths: &ManagedPaths,
    registry: &mut Registry,
    position: usize,
    original: &Path,
    normalized_png: &[u8],
) -> Result<(), String> {
    let previous = registry.instances[position].clone();
    let (root, app_path) = managed_bundle_of(paths, &previous)?;
    let branding = root.join("branding");
    let icon_path = branding.join("icon.png");
    let previous_png = fs::read(&icon_path).ok();
    let revision = previous
        .custom_icon
        .as_ref()
        .map(|icon| icon.revision.saturating_add(1))
        .unwrap_or(1);
    let registered = provenance_for_icon(
        &paths.instances,
        &app_path,
        original,
        previous.provider_provenance.as_ref(),
        &previous.name,
    )?;
    let transaction = (|| {
        fs::create_dir_all(&branding)
            .map_err(|error| format!("No se pudo preparar el icono administrado: {error}"))?;
        atomic_replace_file(&icon_path, normalized_png)?;
        let outcome = apply_icon_to_registered(
            &paths.instances,
            &app_path,
            &icon_path,
            original,
            registered,
            &previous.name,
            MESSAGE_APPLIED,
        )?;
        let target = &mut registry.instances[position];
        target.provider_provenance = Some(outcome.provenance.clone());
        target.custom_icon = Some(CustomIcon {
            path: icon_path.to_string_lossy().to_string(),
            revision,
            system_applied: outcome.system_applied,
            system_message: outcome.system_message,
            system_issue: outcome.system_issue,
        });
        save_registry(paths, registry)
    })();
    if let Err(error) = transaction {
        restore_optional_file(&icon_path, previous_png.as_deref());
        registry.instances[position] = previous.clone();
        let rollback = restore_after_failure(
            &paths.instances,
            &app_path,
            previous.custom_icon.as_ref(),
            previous.provider_provenance.as_ref(),
            original,
        );
        return Err(with_rollback(error, rollback));
    }
    invalidate_application_cache();
    invalidate_managed_bytes_cache();
    Ok(())
}

/// A-4.1 · `reapply_instance_icon`: the person retries with the saved `branding/icon.png`. Same revision.
pub(crate) fn reapply_instance_icon(
    paths: &ManagedPaths,
    registry: &mut Registry,
    position: usize,
    original: &Path,
) -> Result<(), String> {
    let previous = registry.instances[position].clone();
    let custom_icon = previous
        .custom_icon
        .clone()
        .ok_or_else(|| "Esta instancia no tiene un icono personalizado.".to_string())?;
    let (root, app_path) = managed_bundle_of(paths, &previous)?;
    let icon_path = root.join("branding/icon.png");
    if Path::new(&custom_icon.path) != icon_path || !icon_path.is_file() {
        return Err(
            "No se encontró el icono guardado de la instancia. Vuelve a elegirlo.".to_string(),
        );
    }
    let registered = provenance_for_icon(
        &paths.instances,
        &app_path,
        original,
        previous.provider_provenance.as_ref(),
        &previous.name,
    )?;
    let transaction = (|| {
        let outcome = apply_icon_to_registered(
            &paths.instances,
            &app_path,
            &icon_path,
            original,
            registered,
            &previous.name,
            MESSAGE_APPLIED,
        )?;
        let target = &mut registry.instances[position];
        target.provider_provenance = Some(outcome.provenance.clone());
        if let Some(icon) = target.custom_icon.as_mut() {
            outcome.write_to(icon);
        }
        save_registry(paths, registry)
    })();
    if let Err(error) = transaction {
        registry.instances[position] = previous.clone();
        let rollback = restore_after_failure(
            &paths.instances,
            &app_path,
            previous.custom_icon.as_ref(),
            previous.provider_provenance.as_ref(),
            original,
        );
        return Err(with_rollback(error, rollback));
    }
    invalidate_application_cache();
    Ok(())
}

/// A-4.2 · `clear_instance_icon`: removes the icon from the copy, `--strict` in green, and only then forgets
/// `custom_icon` and the provenance.
pub(crate) fn clear_instance_icon(
    paths: &ManagedPaths,
    registry: &mut Registry,
    position: usize,
    original: &Path,
) -> Result<(), String> {
    let previous = registry.instances[position].clone();
    let (root, app_path) = managed_bundle_of(paths, &previous)?;
    let leftovers = bundle_shape(&app_path).ok() == Some(BundleShape::Iconized)
        && signed_provenance(previous.provider_provenance.as_ref()).is_none();
    if !leftovers {
        verify_managed_bundle(
            &app_path,
            original,
            previous.provider_provenance.as_ref(),
            &previous.name,
        )?;
    }
    // With leftovers (R-2) there is nothing A-2 could accept: `remove_custom_icon` removes them and requires
    // `--strict` afterwards.
    let managed_icon = root.join("branding/icon.png");
    let previous_png = fs::read(&managed_icon).ok();
    remove_custom_icon(&paths.instances, &app_path, original, &previous.name)?;
    let transaction = (|| {
        if previous
            .custom_icon
            .as_ref()
            .is_some_and(|icon| Path::new(&icon.path) == managed_icon)
        {
            match fs::remove_file(&managed_icon) {
                Ok(()) => {}
                Err(error) if error.kind() == io::ErrorKind::NotFound => {}
                Err(error) => {
                    return Err(format!("No se pudo retirar el icono administrado: {error}"));
                }
            }
        }
        let target = &mut registry.instances[position];
        target.custom_icon = None;
        target.provider_provenance = None;
        save_registry(paths, registry)
    })();
    if let Err(error) = transaction {
        restore_optional_file(&managed_icon, previous_png.as_deref());
        registry.instances[position] = previous.clone();
        let rollback = restore_after_failure(
            &paths.instances,
            &app_path,
            previous.custom_icon.as_ref(),
            previous.provider_provenance.as_ref(),
            original,
        );
        return Err(with_rollback(error, rollback));
    }
    invalidate_application_cache();
    invalidate_managed_bytes_cache();
    Ok(())
}

/// A-4.4 · after a sync or chained update, on the new bundle (already clean and verified in staging, then
/// swapped). With an icon: register and apply, skipping `setIcon` while App Management blocks it. Without an
/// icon: `Ok(None)`, and the caller clears the provenance.
pub(crate) fn apply_branding_after_update(
    instances_root: &Path,
    updated_bundle: &Path,
    custom_icon: Option<&CustomIcon>,
    original: &Path,
    name: &str,
) -> Result<Option<IconOutcome>, String> {
    let Some(custom_icon) = custom_icon else {
        return Ok(None);
    };
    let registered = register_clean_provenance(updated_bundle, original, None)
        .map_err(|_| bundle_changed_message(name))?;
    if custom_icon.system_issue == Some(CustomIconSystemIssue::AppManagement) {
        return Ok(Some(IconOutcome {
            provenance: registered,
            system_applied: false,
            system_issue: custom_icon.system_issue,
            system_message: custom_icon.system_message.clone(),
        }));
    }
    apply_icon_to_registered(
        instances_root,
        updated_bundle,
        Path::new(&custom_icon.path),
        original,
        registered,
        name,
        MESSAGE_REAPPLIED_AFTER_SYNC,
    )
    .map(Some)
}

/// A-4.5 · launch preflight, only for an instance with `custom_icon` and with the instance still stopped.
/// Returns `Ok(true)` when the instance changed (provenance or icon fields) and must be saved before launching.
///
/// - Iconized copy: A-2 or it does not launch.
/// - Clean copy without a provider-signed provenance (★ D-C): registered and reapplied if it passes `--strict`;
///   otherwise it launches as before.
/// - Clean copy with provenance (D-3): `--strict`, the original's requirement and a version not below the
///   registered one, then re-registered and reapplied; otherwise it does not launch.
/// - Finder icon leftovers without a provider-signed provenance (R-2) are removed first; then the copy launches
///   only if it registers as a verified clean copy.
/// - The reapply is skipped while App Management blocks it, and a failed reapply still launches.
pub(crate) fn launch_preflight(
    paths: &ManagedPaths,
    instance: &mut ManagedInstance,
    original: Option<&Path>,
) -> Result<bool, String> {
    let Some(custom_icon) = instance.custom_icon.clone() else {
        return Ok(false);
    };
    let name = instance.name.clone();
    let (root, bundle) = managed_bundle_of(paths, instance)?;
    let shape = bundle_shape(&bundle).map_err(|_| bundle_changed_message(&name))?;
    let Some(original) = original else {
        return match shape {
            BundleShape::Iconized => Err(format!(
                "No se encontró la aplicación original para verificar la copia de «{name}», así que no se abrirá."
            )),
            BundleShape::Clean => Ok(false),
        };
    };
    let previous = signed_provenance(instance.provider_provenance.as_ref()).cloned();
    if shape == BundleShape::Iconized && previous.is_some() {
        verify_managed_bundle(&bundle, original, previous.as_ref(), &name)?;
        return Ok(false);
    }
    let had_leftovers = shape == BundleShape::Iconized;
    clear_unregistered_leftovers(&paths.instances, &bundle, shape, previous.as_ref(), &name)?;
    let registered = match previous.as_ref() {
        // R-2: a copy that carried leftovers launches only if it is a verified clean copy now.
        None if had_leftovers => register_clean_provenance(&bundle, original, None)
            .map_err(|_| bundle_changed_message(&name))?,
        None => match register_clean_provenance(&bundle, original, None) {
            Ok(registered) => registered,
            Err(_) => return Ok(false),
        },
        Some(previous) => {
            register_clean_provenance(&bundle, original, Some(&previous.provider_version))
                .map_err(|_| bundle_changed_message(&name))?
        }
    };
    instance.provider_provenance = Some(registered.clone());
    let icon_path = root.join("branding/icon.png");
    if custom_icon.system_issue == Some(CustomIconSystemIssue::AppManagement)
        || Path::new(&custom_icon.path) != icon_path
        || !icon_path.is_file()
    {
        return Ok(true);
    }
    let outcome = match apply_icon_to_registered(
        &paths.instances,
        &bundle,
        &icon_path,
        original,
        registered.clone(),
        &name,
        MESSAGE_APPLIED,
    ) {
        Ok(outcome) => outcome,
        Err(_) => {
            // The icon was removed again: the copy launches only if it is back to a verified clean copy.
            check_managed_bundle(&bundle, original, Some(&registered))
                .map_err(|_| bundle_changed_message(&name))?;
            IconOutcome {
                provenance: registered,
                system_applied: false,
                system_issue: None,
                system_message: MESSAGE_REJECTED.to_string(),
            }
        }
    };
    instance.provider_provenance = Some(outcome.provenance.clone());
    if let Some(icon) = instance.custom_icon.as_mut() {
        outcome.write_to(icon);
    }
    Ok(true)
}

#[cfg(test)]
pub(crate) mod tests {
    use super::*;
    use crate::tests::{test_managed_paths, write_signed_fixture_bundle_with};

    /// FinderInfo with `kHasCustomIcon` set. An all-zero FinderInfo is treated by macOS as absent.
    const CUSTOM_ICON_FINDER_INFO: [u8; 32] = {
        let mut info = [0_u8; 32];
        info[8] = 0x04;
        info
    };

    pub(crate) const EXPLICIT_REQUIREMENT: &str =
        "=designated => identifier \"com.codeaiprofiles.fixture\"";

    /// A disposable root under the temp dir with an original and a managed copy inside `managed-instances/`.
    pub(crate) struct IconFixture {
        pub(crate) root: PathBuf,
        pub(crate) paths: ManagedPaths,
        pub(crate) instance_id: String,
        pub(crate) instance_root: PathBuf,
        pub(crate) original: PathBuf,
        pub(crate) managed: PathBuf,
        pub(crate) icon: PathBuf,
        pub(crate) requirement: Option<&'static str>,
    }

    impl IconFixture {
        pub(crate) fn new(case: &str, requirement: Option<&'static str>) -> Self {
            let root = env::temp_dir().join(format!("code-ai-icon-{case}-{}", Uuid::new_v4()));
            let paths = test_managed_paths(&root);
            let instance_id = Uuid::new_v4().to_string();
            let instance_root = paths.instances.join(&instance_id);
            let original = root.join("original/Original.app");
            let managed = instance_root.join("application/Fixture.app");
            let icon = instance_root.join("branding/icon.png");
            fs::create_dir_all(original.parent().unwrap()).unwrap();
            fs::create_dir_all(icon.parent().unwrap()).unwrap();
            write_signed_fixture_bundle_with(&original, "1.0.0", requirement);
            clone_directory(&original, &managed).unwrap();
            let image =
                image::DynamicImage::ImageRgba8(image::ImageBuffer::from_fn(64, 64, |x, _| {
                    image::Rgba([(x * 4) as u8, 96, 255, 255])
                }));
            let mut encoded = Cursor::new(Vec::new());
            image
                .write_to(&mut encoded, image::ImageFormat::Png)
                .unwrap();
            fs::write(&icon, encoded.into_inner()).unwrap();
            Self {
                root,
                paths,
                instance_id,
                instance_root,
                original,
                managed,
                icon,
                requirement,
            }
        }

        /// Another managed copy of the same original, inside `managed-instances/`.
        pub(crate) fn another_copy(&self) -> PathBuf {
            let copy = self
                .paths
                .instances
                .join(Uuid::new_v4().to_string())
                .join("application/Fixture.app");
            clone_directory(&self.original, &copy).unwrap();
            copy
        }

        /// Re-signs `bundle` ad hoc with the fixture's requirement (the icon must not be there).
        pub(crate) fn resign(&self, bundle: &Path) {
            let mut command = Command::new("/usr/bin/codesign");
            command.args(["--force", "--deep", "--sign", "-"]);
            if let Some(requirement) = self.requirement {
                command.args(["-r", requirement]);
            }
            let status = command
                .arg(bundle)
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .unwrap();
            assert!(status.success());
        }
    }

    impl Drop for IconFixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.root);
        }
    }

    /// Strict codesign over a bundle, as the original and every clean copy are verified.
    pub(crate) fn strict_passes(bundle: &Path) -> bool {
        Command::new("/usr/bin/codesign")
            .args(["--verify", "--deep", "--strict"])
            .arg(bundle)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .unwrap()
            .success()
    }

    pub(crate) fn set_xattr(path: &Path, name: &str, value: &[u8]) {
        let path = path_cstring(path).unwrap();
        let name = CString::new(name).unwrap();
        // SAFETY: valid NUL-terminated strings and a readable buffer of `value.len()` bytes.
        let result = unsafe {
            libc::setxattr(
                path.as_ptr(),
                name.as_ptr(),
                value.as_ptr().cast(),
                value.len(),
                0,
                libc::XATTR_NOFOLLOW,
            )
        };
        assert_eq!(result, 0, "setxattr: {}", io::Error::last_os_error());
    }

    /// Provenance as the product registers it, from a clean copy that passes `--strict -R`.
    pub(crate) fn provenance_for(fixture: &IconFixture, bundle: &Path) -> ProviderProvenance {
        assert!(strict_passes(bundle));
        register_clean_provenance(bundle, &fixture.original, None).unwrap()
    }

    pub(crate) fn set_version(bundle: &Path, version: &str) {
        let status = Command::new("/usr/bin/plutil")
            .args(["-replace", "CFBundleShortVersionString", "-string", version])
            .arg(bundle.join("Contents/Info.plist"))
            .status()
            .unwrap();
        assert!(status.success());
    }

    fn put_icon(fixture: &IconFixture, bundle: &Path) {
        set_workspace_icon(&fixture.paths.instances, bundle, Some(&fixture.icon)).unwrap();
        assert_eq!(bundle_shape(bundle).unwrap(), BundleShape::Iconized);
    }

    /// A registry with one stopped instance whose bundle is the fixture's managed copy.
    fn registry_for(fixture: &IconFixture) -> Registry {
        let mut instance = crate::tests::test_instance(&fixture.instance_root);
        instance.id = fixture.instance_id.clone();
        instance.name = "Trabajo".to_string();
        instance.app_path = fixture.managed.to_string_lossy().to_string();
        instance.profile_path = fixture
            .instance_root
            .join("profile")
            .to_string_lossy()
            .to_string();
        Registry {
            version: REGISTRY_VERSION,
            instances: vec![instance],
        }
    }

    fn icon_png(fixture: &IconFixture) -> Vec<u8> {
        normalized_icon_png(&fs::read(&fixture.icon).unwrap()).unwrap()
    }

    /// `chflags uchg` on a directory, undone on drop even if the test fails. It reproduces what App Management
    /// does to a bundle: `setIcon` returns `false` and writing inside gives `EPERM`.
    struct Immutable(PathBuf);

    impl Immutable {
        fn new(path: &Path) -> Self {
            let status = Command::new("/usr/bin/chflags")
                .arg("uchg")
                .arg(path)
                .status()
                .unwrap();
            assert!(status.success());
            Self(path.to_path_buf())
        }
    }

    impl Drop for Immutable {
        fn drop(&mut self) {
            let _ = Command::new("/usr/bin/chflags")
                .arg("nouchg")
                .arg(&self.0)
                .status();
        }
    }

    fn check(
        fixture: &IconFixture,
        bundle: &Path,
        provenance: Option<&ProviderProvenance>,
    ) -> Result<ManagedBundleState, BundleCheckFailure> {
        check_managed_bundle(bundle, &fixture.original, provenance)
    }

    #[test]
    fn parses_explicit_and_implicit_designated_requirements() {
        assert_eq!(
            parse_designated_requirement(
                "designated => identifier \"com.example\" and anchor apple generic\n"
            )
            .as_deref(),
            Some("identifier \"com.example\" and anchor apple generic")
        );
        assert_eq!(
            parse_designated_requirement("# designated => cdhash H\"35699573b30b\"\n").as_deref(),
            Some("cdhash H\"35699573b30b\"")
        );
        assert_eq!(parse_designated_requirement("Executable=/x\n"), None);
    }

    #[test]
    fn iconized_copy_passes_the_equivalent_check_with_both_requirement_variants() {
        for requirement in [None, Some(EXPLICIT_REQUIREMENT)] {
            let fixture = IconFixture::new("iconized-pass", requirement);
            let provenance = provenance_for(&fixture, &fixture.managed);
            let plist_before = fs::read(fixture.managed.join("Contents/Info.plist")).unwrap();
            put_icon(&fixture, &fixture.managed);
            assert!(!strict_passes(&fixture.managed), "the icon is in place");
            assert_eq!(
                check(&fixture, &fixture.managed, Some(&provenance)),
                Ok(ManagedBundleState::Iconized)
            );
            assert_eq!(
                macos_code_hash(&fixture.managed),
                provenance.managed_code_hash
            );
            assert_eq!(
                fs::read(fixture.managed.join("Contents/Info.plist")).unwrap(),
                plist_before
            );
            assert_eq!(
                verify_managed_bundle(&fixture.original, &fixture.original, None, "X"),
                Ok(ManagedBundleState::Clean {
                    code_hash_matches: false
                })
            );
        }
    }

    #[test]
    fn clean_copies_follow_strict_and_report_the_registered_code_hash() {
        let fixture = IconFixture::new("clean", Some(EXPLICIT_REQUIREMENT));
        let provenance = provenance_for(&fixture, &fixture.managed);
        assert_eq!(
            check(&fixture, &fixture.managed, Some(&provenance)),
            Ok(ManagedBundleState::Clean {
                code_hash_matches: true
            })
        );
        assert_eq!(
            check(&fixture, &fixture.managed, None),
            Ok(ManagedBundleState::Clean {
                code_hash_matches: false
            })
        );
        fs::write(fixture.managed.join("Contents/Resources/extra"), b"x").unwrap();
        assert_eq!(
            check(&fixture, &fixture.managed, Some(&provenance)),
            Err(BundleCheckFailure::ProviderIdentity)
        );
    }

    #[test]
    fn iconized_copy_without_registered_provenance_is_rejected() {
        let fixture = IconFixture::new("no-provenance", None);
        let mut adhoc = provenance_for(&fixture, &fixture.managed);
        put_icon(&fixture, &fixture.managed);
        assert_eq!(
            check(&fixture, &fixture.managed, None),
            Err(BundleCheckFailure::MissingProvenance)
        );
        adhoc.provider_signature_preserved = false;
        assert_eq!(
            check(&fixture, &fixture.managed, Some(&adhoc)),
            Err(BundleCheckFailure::MissingProvenance)
        );
        let message = verify_managed_bundle(&fixture.managed, &fixture.original, None, "Trabajo")
            .unwrap_err();
        assert_eq!(message, bundle_changed_message("Trabajo"));
        assert!(!message.contains('/'));
    }

    #[test]
    fn every_other_change_to_an_iconized_copy_fails_the_check() {
        type Tamper = fn(&Path);
        let cases: [(&str, Tamper, Option<BundleCheckFailure>); 10] = [
            (
                "extra file at the root",
                |bundle| fs::write(bundle.join("extra"), b"x").unwrap(),
                Some(BundleCheckFailure::RootShape),
            ),
            (
                "extra file in Resources",
                |bundle| fs::write(bundle.join("Contents/Resources/extra"), b"x").unwrap(),
                None,
            ),
            (
                "Info.plist altered",
                |bundle| {
                    let plist = bundle.join("Contents/Info.plist");
                    let mut bytes = fs::read(&plist).unwrap();
                    bytes.extend_from_slice(b"\n");
                    fs::write(plist, bytes).unwrap();
                },
                None,
            ),
            (
                "sealed resource altered",
                |bundle| {
                    fs::write(bundle.join("Contents/Resources/fixture.txt"), b"tampered").unwrap()
                },
                None,
            ),
            (
                "FinderInfo on an inner file",
                |bundle| {
                    set_xattr(
                        &bundle.join("Contents/Resources/fixture.txt"),
                        "com.apple.FinderInfo",
                        &CUSTOM_ICON_FINDER_INFO,
                    )
                },
                Some(BundleCheckFailure::Sideband),
            ),
            (
                "ResourceFork on an inner file",
                |bundle| {
                    set_xattr(
                        &bundle.join("Contents/Info.plist"),
                        "com.apple.ResourceFork",
                        b"fork",
                    )
                },
                Some(BundleCheckFailure::Sideband),
            ),
            (
                "Icon\\r with data",
                |bundle| fs::write(bundle.join(ROOT_ICON_FILE), b"data").unwrap(),
                Some(BundleCheckFailure::RootShape),
            ),
            (
                "Icon\\r executable",
                |bundle| {
                    fs::set_permissions(
                        bundle.join(ROOT_ICON_FILE),
                        fs::Permissions::from_mode(0o755),
                    )
                    .unwrap()
                },
                Some(BundleCheckFailure::RootShape),
            ),
            (
                "Icon\\r replaced by a symlink",
                |bundle| {
                    fs::remove_file(bundle.join(ROOT_ICON_FILE)).unwrap();
                    std::os::unix::fs::symlink("Contents/Info.plist", bundle.join(ROOT_ICON_FILE))
                        .unwrap();
                },
                Some(BundleCheckFailure::RootShape),
            ),
            (
                "symlink at the root",
                |bundle| {
                    std::os::unix::fs::symlink("Contents", bundle.join("Link")).unwrap();
                },
                Some(BundleCheckFailure::RootShape),
            ),
        ];
        for requirement in [None, Some(EXPLICIT_REQUIREMENT)] {
            let fixture = IconFixture::new("matrix", requirement);
            let provenance = provenance_for(&fixture, &fixture.managed);
            for (label, tamper, expected) in cases {
                let copy = fixture.another_copy();
                put_icon(&fixture, &copy);
                assert_eq!(
                    check(&fixture, &copy, Some(&provenance)),
                    Ok(ManagedBundleState::Iconized),
                    "{label}: baseline"
                );
                tamper(&copy);
                let result = check(&fixture, &copy, Some(&provenance));
                assert!(result.is_err(), "{label}: must fail, got {result:?}");
                if let Some(expected) = expected {
                    assert_eq!(result, Err(expected), "{label}");
                } else {
                    assert_eq!(
                        result,
                        Err(BundleCheckFailure::DesignatedRequirement),
                        "{label}: the seal"
                    );
                }
            }
        }
    }

    #[test]
    fn resigned_copy_fails_by_requirement_or_by_code_hash() {
        for (requirement, expected) in [
            (None, BundleCheckFailure::DesignatedRequirement),
            (Some(EXPLICIT_REQUIREMENT), BundleCheckFailure::CodeHash),
        ] {
            let fixture = IconFixture::new("resigned", requirement);
            let provenance = provenance_for(&fixture, &fixture.managed);
            fs::write(fixture.managed.join("Contents/Resources/payload"), b"x").unwrap();
            fixture.resign(&fixture.managed);
            assert!(strict_passes(&fixture.managed));
            put_icon(&fixture, &fixture.managed);
            assert_eq!(
                check(&fixture, &fixture.managed, Some(&provenance)),
                Err(expected)
            );
        }
    }

    #[test]
    fn registration_needs_a_clean_copy_and_records_its_code_hash() {
        let fixture = IconFixture::new("register", Some(EXPLICIT_REQUIREMENT));
        let provenance =
            register_clean_provenance(&fixture.managed, &fixture.original, None).unwrap();
        assert_eq!(
            provenance.managed_code_hash,
            macos_code_hash(&fixture.managed)
        );
        assert_eq!(provenance.provider_version, "1.0.0");
        assert_eq!(provenance.bundle_identifier, "com.codeaiprofiles.fixture");
        assert!(provenance.provider_signature_preserved);
        put_icon(&fixture, &fixture.managed);
        assert_eq!(
            register_clean_provenance(&fixture.managed, &fixture.original, None),
            Err(BundleCheckFailure::RootShape),
            "never registered from an iconized copy"
        );
        let tampered = fixture.another_copy();
        fs::write(tampered.join("Contents/Resources/extra"), b"x").unwrap();
        assert_eq!(
            register_clean_provenance(&tampered, &fixture.original, None),
            Err(BundleCheckFailure::DesignatedRequirement)
        );
    }

    #[test]
    fn self_updated_copy_is_accepted_with_a_newer_version_and_rejected_with_an_older_one() {
        let fixture = IconFixture::new("d3", Some(EXPLICIT_REQUIREMENT));
        let registered = provenance_for(&fixture, &fixture.managed);

        set_version(&fixture.managed, "1.0.1");
        fixture.resign(&fixture.managed);
        assert_eq!(
            check(&fixture, &fixture.managed, Some(&registered)),
            Ok(ManagedBundleState::Clean {
                code_hash_matches: false
            })
        );
        let renewed = register_clean_provenance(
            &fixture.managed,
            &fixture.original,
            Some(&registered.provider_version),
        )
        .unwrap();
        assert_eq!(renewed.provider_version, "1.0.1");
        assert_ne!(renewed.managed_code_hash, registered.managed_code_hash);

        let older = fixture.another_copy();
        set_version(&older, "0.9");
        fixture.resign(&older);
        assert_eq!(
            check(&fixture, &older, Some(&registered)),
            Err(BundleCheckFailure::Downgrade)
        );
        assert_eq!(
            register_clean_provenance(&older, &fixture.original, Some("1.0.0")),
            Err(BundleCheckFailure::Downgrade)
        );
    }

    #[test]
    fn a_copy_of_an_iconized_donor_is_clean_after_the_strip() {
        let fixture = IconFixture::new("strip", Some(EXPLICIT_REQUIREMENT));
        put_icon(&fixture, &fixture.managed);
        let copy = fixture
            .paths
            .instances
            .join(Uuid::new_v4().to_string())
            .join("application/Fixture.app");
        clone_directory(&fixture.managed, &copy).unwrap();
        assert_eq!(bundle_shape(&copy).unwrap(), BundleShape::Iconized);
        assert!(!strict_passes(&copy), "the copy inherits the donor's icon");
        strip_inherited_icon(&copy).unwrap();
        assert_eq!(bundle_shape(&copy).unwrap(), BundleShape::Clean);
        assert!(strict_passes(&copy));
        assert_eq!(
            check_clean_against_original(&copy, &fixture.original),
            Ok(())
        );
        strip_inherited_icon(&copy).unwrap();

        let odd = fixture.another_copy();
        std::os::unix::fs::symlink("Contents/Info.plist", odd.join(ROOT_ICON_FILE)).unwrap();
        strip_inherited_icon(&odd).unwrap();
        assert!(
            fs::symlink_metadata(odd.join(ROOT_ICON_FILE)).is_ok(),
            "only a regular Icon\\r is removed"
        );
        assert_eq!(
            check_clean_against_original(&odd, &fixture.original),
            Err(BundleCheckFailure::RootShape)
        );
    }

    #[test]
    fn icon_stays_on_the_copy_with_the_provider_signature_and_the_copy_launches() {
        for requirement in [None, Some(EXPLICIT_REQUIREMENT)] {
            let fixture = IconFixture::new("inverted", requirement);
            let profile = fixture.instance_root.join("profile/state.bin");
            fs::create_dir_all(profile.parent().unwrap()).unwrap();
            fs::write(&profile, b"private-profile-sentinel").unwrap();
            let plist = fixture.managed.join("Contents/Info.plist");
            let plist_before = fs::read(&plist).unwrap();
            let code_hash_before = macos_code_hash(&fixture.managed);
            let mut registry = registry_for(&fixture);

            set_instance_icon(
                &fixture.paths,
                &mut registry,
                0,
                &fixture.original,
                &icon_png(&fixture),
            )
            .unwrap();

            let instance = &registry.instances[0];
            let icon = instance.custom_icon.as_ref().unwrap();
            assert!(icon.system_applied);
            assert_eq!(icon.system_issue, None);
            assert_eq!(icon.system_message, MESSAGE_APPLIED);
            assert_eq!(icon.revision, 1);
            let provenance = instance.provider_provenance.as_ref().unwrap();
            assert_eq!(provenance.managed_code_hash, code_hash_before);
            assert_eq!(
                check(&fixture, &fixture.managed, Some(provenance)),
                Ok(ManagedBundleState::Iconized)
            );
            assert!(!strict_passes(&fixture.managed), "the Finder icon is kept");
            assert_eq!(macos_code_hash(&fixture.managed), code_hash_before);
            assert_eq!(fs::read(&plist).unwrap(), plist_before);
            let saved = load_registry(&fixture.paths).unwrap();
            assert_eq!(saved.instances[0].custom_icon, instance.custom_icon);
            let launched = Command::new(provider_executable(&fixture.managed))
                .arg("--smoke")
                .status()
                .unwrap();
            assert!(launched.success());
            assert_eq!(fs::read(&profile).unwrap(), b"private-profile-sentinel");

            fs::write(fixture.managed.join("Contents/Resources/extra"), b"x").unwrap();
            assert!(verify_managed_bundle(
                &fixture.managed,
                &fixture.original,
                Some(provenance),
                "Trabajo"
            )
            .is_err());
        }
    }

    #[test]
    fn replacing_the_icon_keeps_the_registered_provenance() {
        let fixture = IconFixture::new("replace", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        let png = icon_png(&fixture);
        set_instance_icon(&fixture.paths, &mut registry, 0, &fixture.original, &png).unwrap();
        let first = registry.instances[0].provider_provenance.clone();
        set_instance_icon(&fixture.paths, &mut registry, 0, &fixture.original, &png).unwrap();
        let icon = registry.instances[0].custom_icon.as_ref().unwrap();
        assert!(icon.system_applied);
        assert_eq!(icon.revision, 2);
        assert_eq!(registry.instances[0].provider_provenance, first);
    }

    #[test]
    fn sync_branding_registers_the_new_bundle_and_reapplies_the_target_icon() {
        let fixture = IconFixture::new("sync", Some(EXPLICIT_REQUIREMENT));
        put_icon(&fixture, &fixture.managed);
        let custom_icon = CustomIcon {
            path: fixture.icon.to_string_lossy().to_string(),
            revision: 1,
            system_applied: false,
            system_message: "UI only".to_string(),
            system_issue: None,
        };
        let copy_of_donor = |label: &str| {
            let copy = fixture
                .paths
                .instances
                .join(Uuid::new_v4().to_string())
                .join(format!("application/{label}.app"));
            clone_directory(&fixture.managed, &copy).unwrap();
            strip_inherited_icon(&copy).unwrap();
            assert!(strict_passes(&copy), "{label}: clean after the strip");
            copy
        };

        let with_icon = copy_of_donor("WithIcon");
        let outcome = apply_branding_after_update(
            &fixture.paths.instances,
            &with_icon,
            Some(&custom_icon),
            &fixture.original,
            "Destino",
        )
        .unwrap()
        .unwrap();
        assert!(outcome.system_applied);
        assert_eq!(outcome.system_message, MESSAGE_REAPPLIED_AFTER_SYNC);
        assert_eq!(
            check(&fixture, &with_icon, Some(&outcome.provenance)),
            Ok(ManagedBundleState::Iconized)
        );

        let without_icon = copy_of_donor("WithoutIcon");
        let baseline = crate::tests::macos_signature_snapshot(&without_icon);
        assert_eq!(
            apply_branding_after_update(
                &fixture.paths.instances,
                &without_icon,
                None,
                &fixture.original,
                "Destino",
            ),
            Ok(None)
        );
        assert_eq!(
            crate::tests::macos_signature_snapshot(&without_icon),
            baseline
        );

        let blocked = copy_of_donor("Blocked");
        let blocked_icon = CustomIcon {
            system_issue: Some(CustomIconSystemIssue::AppManagement),
            system_message: MESSAGE_APP_MANAGEMENT.to_string(),
            ..custom_icon.clone()
        };
        let outcome = apply_branding_after_update(
            &fixture.paths.instances,
            &blocked,
            Some(&blocked_icon),
            &fixture.original,
            "Destino",
        )
        .unwrap()
        .unwrap();
        assert!(!outcome.system_applied);
        assert_eq!(
            outcome.system_issue,
            Some(CustomIconSystemIssue::AppManagement)
        );
        assert_eq!(bundle_shape(&blocked).unwrap(), BundleShape::Clean);
        assert_eq!(
            outcome.provenance.managed_code_hash,
            macos_code_hash(&blocked)
        );
    }

    #[test]
    fn rollback_without_an_applied_icon_restores_the_exact_signature_baseline() {
        let fixture = IconFixture::new("rollback", None);
        let baseline = crate::tests::macos_signature_snapshot(&fixture.managed);
        put_icon(&fixture, &fixture.managed);
        let previous = CustomIcon {
            path: fixture.icon.to_string_lossy().to_string(),
            revision: 1,
            system_applied: false,
            system_message: "UI only".to_string(),
            system_issue: None,
        };
        restore_after_failure(
            &fixture.paths.instances,
            &fixture.managed,
            Some(&previous),
            None,
            &fixture.original,
        )
        .unwrap();
        assert_eq!(
            crate::tests::macos_signature_snapshot(&fixture.managed),
            baseline
        );
    }

    #[test]
    fn clearing_returns_the_copy_to_strict_and_forgets_icon_and_provenance() {
        let fixture = IconFixture::new("clear", Some(EXPLICIT_REQUIREMENT));
        let baseline = crate::tests::macos_signature_snapshot(&fixture.managed);
        let mut registry = registry_for(&fixture);
        set_instance_icon(
            &fixture.paths,
            &mut registry,
            0,
            &fixture.original,
            &icon_png(&fixture),
        )
        .unwrap();
        let managed_icon = fixture.instance_root.join("branding/icon.png");
        assert!(managed_icon.is_file());

        clear_instance_icon(&fixture.paths, &mut registry, 0, &fixture.original).unwrap();

        assert!(strict_passes(&fixture.managed));
        assert_eq!(
            crate::tests::macos_signature_snapshot(&fixture.managed),
            baseline
        );
        assert!(registry.instances[0].custom_icon.is_none());
        assert!(registry.instances[0].provider_provenance.is_none());
        assert!(!managed_icon.exists());
        let saved = load_registry(&fixture.paths).unwrap();
        assert!(saved.instances[0].custom_icon.is_none());
        assert!(saved.instances[0].provider_provenance.is_none());
    }

    #[test]
    fn retry_applies_the_saved_icon_again() {
        let fixture = IconFixture::new("retry", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        set_instance_icon(
            &fixture.paths,
            &mut registry,
            0,
            &fixture.original,
            &icon_png(&fixture),
        )
        .unwrap();
        clear_workspace_icon(&fixture.paths.instances, &fixture.managed).unwrap();
        if let Some(icon) = registry.instances[0].custom_icon.as_mut() {
            icon.system_applied = false;
            icon.system_issue = Some(CustomIconSystemIssue::AppManagement);
            icon.system_message = MESSAGE_APP_MANAGEMENT.to_string();
        }

        reapply_instance_icon(&fixture.paths, &mut registry, 0, &fixture.original).unwrap();

        let icon = registry.instances[0].custom_icon.as_ref().unwrap();
        assert!(icon.system_applied);
        assert_eq!(icon.system_issue, None);
        assert_eq!(icon.revision, 1);
        assert_eq!(
            bundle_shape(&fixture.managed).unwrap(),
            BundleShape::Iconized
        );
    }

    #[test]
    fn eperm_is_classified_as_app_management() {
        assert_eq!(
            classify_write_error(&io::Error::from_raw_os_error(libc::EPERM)),
            Some(CustomIconSystemIssue::AppManagement)
        );
        assert_eq!(
            classify_write_error(&io::Error::from_raw_os_error(libc::EACCES)),
            None
        );
        assert_eq!(
            classify_write_error(&io::Error::from(io::ErrorKind::NotFound)),
            None
        );
    }

    #[test]
    fn a_locked_bundle_keeps_the_icon_in_the_app_and_reports_app_management() {
        let fixture = IconFixture::new("locked", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        {
            let _locked = Immutable::new(&fixture.managed);
            assert_eq!(
                set_workspace_icon(
                    &fixture.paths.instances,
                    &fixture.managed,
                    Some(&fixture.icon)
                ),
                Err(WorkspaceIconError::Rejected(Some(
                    CustomIconSystemIssue::AppManagement
                )))
            );
            set_instance_icon(
                &fixture.paths,
                &mut registry,
                0,
                &fixture.original,
                &icon_png(&fixture),
            )
            .unwrap();
        }
        let icon = registry.instances[0].custom_icon.as_ref().unwrap();
        assert!(!icon.system_applied);
        assert_eq!(
            icon.system_issue,
            Some(CustomIconSystemIssue::AppManagement)
        );
        assert_eq!(icon.system_message, MESSAGE_APP_MANAGEMENT);
        assert!(registry.instances[0].provider_provenance.is_some());
        assert_eq!(bundle_shape(&fixture.managed).unwrap(), BundleShape::Clean);
        assert!(strict_passes(&fixture.managed));
    }

    #[test]
    fn clearing_a_locked_bundle_returns_the_app_management_text_and_changes_nothing() {
        let fixture = IconFixture::new("locked-clear", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        set_instance_icon(
            &fixture.paths,
            &mut registry,
            0,
            &fixture.original,
            &icon_png(&fixture),
        )
        .unwrap();
        let before = registry.instances[0].clone();
        let error = {
            let _locked = Immutable::new(&fixture.managed);
            clear_instance_icon(&fixture.paths, &mut registry, 0, &fixture.original).unwrap_err()
        };
        assert_eq!(error, MESSAGE_APP_MANAGEMENT);
        assert_eq!(registry.instances[0].custom_icon, before.custom_icon);
        assert_eq!(
            registry.instances[0].provider_provenance,
            before.provider_provenance
        );
        assert_eq!(
            check(
                &fixture,
                &fixture.managed,
                before.provider_provenance.as_ref()
            ),
            Ok(ManagedBundleState::Iconized)
        );
    }

    #[test]
    fn the_workspace_icon_is_refused_outside_the_managed_instances() {
        let fixture = IconFixture::new("guard", None);
        let original_before = crate::tests::macos_signature_snapshot(&fixture.original);
        for target in [
            fixture.original.clone(),
            fixture.paths.instances.clone(),
            fixture.root.join("missing.app"),
        ] {
            assert!(matches!(
                set_workspace_icon(&fixture.paths.instances, &target, Some(&fixture.icon)),
                Err(WorkspaceIconError::Refused(_))
            ));
        }
        let link = fixture.instance_root.join("application/Link.app");
        std::os::unix::fs::symlink(&fixture.original, &link).unwrap();
        assert!(matches!(
            set_workspace_icon(&fixture.paths.instances, &link, Some(&fixture.icon)),
            Err(WorkspaceIconError::Refused(_))
        ));
        assert_eq!(
            crate::tests::macos_signature_snapshot(&fixture.original),
            original_before,
            "the original never receives the icon"
        );
    }

    #[test]
    fn launch_preflight_skips_instances_without_a_custom_icon() {
        let fixture = IconFixture::new("preflight-none", None);
        let mut registry = registry_for(&fixture);
        fs::write(fixture.managed.join("Contents/Resources/extra"), b"x").unwrap();
        assert_eq!(
            launch_preflight(
                &fixture.paths,
                &mut registry.instances[0],
                Some(&fixture.original)
            ),
            Ok(false),
            "copies without an icon launch as before, unverified"
        );
    }

    #[test]
    fn launch_preflight_verifies_an_iconized_copy_and_refuses_a_changed_one() {
        let fixture = IconFixture::new("preflight-iconized", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        set_instance_icon(
            &fixture.paths,
            &mut registry,
            0,
            &fixture.original,
            &icon_png(&fixture),
        )
        .unwrap();
        let mut instance = registry.instances[0].clone();
        assert_eq!(
            launch_preflight(&fixture.paths, &mut instance, Some(&fixture.original)),
            Ok(false)
        );
        assert_eq!(
            launch_preflight(&fixture.paths, &mut instance, None),
            Err(
                "No se encontró la aplicación original para verificar la copia de «Trabajo», así que no se abrirá."
                    .to_string()
            )
        );
        fs::write(fixture.managed.join("Contents/Resources/extra"), b"x").unwrap();
        assert_eq!(
            launch_preflight(&fixture.paths, &mut instance, Some(&fixture.original)),
            Err(bundle_changed_message("Trabajo"))
        );
    }

    #[test]
    fn launch_preflight_migrates_an_old_icon_lazily() {
        let fixture = IconFixture::new("preflight-migrate", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        let managed_icon = fixture.instance_root.join("branding/icon.png");
        assert_eq!(managed_icon, fixture.icon);
        registry.instances[0].custom_icon = Some(CustomIcon {
            path: managed_icon.to_string_lossy().to_string(),
            revision: 4,
            system_applied: false,
            system_message: "El icono se guardó para Code AI Profiles.".to_string(),
            system_issue: None,
        });
        let mut instance = registry.instances[0].clone();
        assert_eq!(
            launch_preflight(&fixture.paths, &mut instance, Some(&fixture.original)),
            Ok(true)
        );
        let icon = instance.custom_icon.as_ref().unwrap();
        assert!(icon.system_applied);
        assert_eq!(icon.revision, 4);
        assert_eq!(
            bundle_shape(&fixture.managed).unwrap(),
            BundleShape::Iconized
        );
        assert_eq!(
            check(
                &fixture,
                &fixture.managed,
                instance.provider_provenance.as_ref()
            ),
            Ok(ManagedBundleState::Iconized)
        );

        let legacy = fixture.another_copy();
        fs::write(legacy.join("Contents/Resources/extra"), b"x").unwrap();
        let mut legacy_instance = registry.instances[0].clone();
        legacy_instance.app_path = legacy.to_string_lossy().to_string();
        legacy_instance.id = legacy
            .parent()
            .and_then(Path::parent)
            .and_then(Path::file_name)
            .unwrap()
            .to_string_lossy()
            .to_string();
        assert_eq!(
            launch_preflight(
                &fixture.paths,
                &mut legacy_instance,
                Some(&fixture.original)
            ),
            Ok(false),
            "a copy that does not pass --strict launches as before"
        );
        assert!(legacy_instance.provider_provenance.is_none());
    }

    #[test]
    fn launch_preflight_accepts_a_self_update_and_rejects_a_downgrade() {
        let fixture = IconFixture::new("preflight-d3", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        set_instance_icon(
            &fixture.paths,
            &mut registry,
            0,
            &fixture.original,
            &icon_png(&fixture),
        )
        .unwrap();
        let registered = registry.instances[0].provider_provenance.clone().unwrap();
        // ShipIt replaced the bundle: no icon, newer version, another CDHash.
        clear_workspace_icon(&fixture.paths.instances, &fixture.managed).unwrap();
        set_version(&fixture.managed, "1.0.1");
        fixture.resign(&fixture.managed);
        let mut updated = registry.instances[0].clone();
        assert_eq!(
            launch_preflight(&fixture.paths, &mut updated, Some(&fixture.original)),
            Ok(true)
        );
        let renewed = updated.provider_provenance.as_ref().unwrap();
        assert_eq!(renewed.provider_version, "1.0.1");
        assert_ne!(renewed.managed_code_hash, registered.managed_code_hash);
        assert!(updated.custom_icon.as_ref().unwrap().system_applied);
        assert_eq!(
            bundle_shape(&fixture.managed).unwrap(),
            BundleShape::Iconized
        );

        clear_workspace_icon(&fixture.paths.instances, &fixture.managed).unwrap();
        set_version(&fixture.managed, "0.9");
        fixture.resign(&fixture.managed);
        let mut downgraded = registry.instances[0].clone();
        assert_eq!(
            launch_preflight(&fixture.paths, &mut downgraded, Some(&fixture.original)),
            Err(bundle_changed_message("Trabajo"))
        );
    }

    #[test]
    fn launch_preflight_does_not_retry_while_app_management_blocks_the_icon() {
        let fixture = IconFixture::new("preflight-blocked", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        {
            let _locked = Immutable::new(&fixture.managed);
            set_instance_icon(
                &fixture.paths,
                &mut registry,
                0,
                &fixture.original,
                &icon_png(&fixture),
            )
            .unwrap();
        }
        let mut instance = registry.instances[0].clone();
        assert_eq!(
            launch_preflight(&fixture.paths, &mut instance, Some(&fixture.original)),
            Ok(true)
        );
        let icon = instance.custom_icon.as_ref().unwrap();
        assert!(!icon.system_applied);
        assert_eq!(
            icon.system_issue,
            Some(CustomIconSystemIssue::AppManagement)
        );
        assert_eq!(bundle_shape(&fixture.managed).unwrap(), BundleShape::Clean);
    }

    fn leftovers_instance(fixture: &IconFixture, registry: &mut Registry) {
        put_icon(fixture, &fixture.managed);
        registry.instances[0].provider_provenance = None;
        registry.instances[0].custom_icon = Some(CustomIcon {
            path: fixture.icon.to_string_lossy().to_string(),
            revision: 2,
            system_applied: true,
            system_message: "antiguo".to_string(),
            system_issue: None,
        });
    }

    #[test]
    fn leftovers_without_provenance_are_removed_and_strict_decides_at_launch() {
        let fixture = IconFixture::new("leftovers-launch", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        leftovers_instance(&fixture, &mut registry);
        assert_eq!(
            check(&fixture, &fixture.managed, None),
            Err(BundleCheckFailure::MissingProvenance)
        );
        let mut instance = registry.instances[0].clone();
        assert_eq!(
            launch_preflight(&fixture.paths, &mut instance, Some(&fixture.original)),
            Ok(true)
        );
        let icon = instance.custom_icon.as_ref().unwrap();
        assert!(icon.system_applied);
        assert_eq!(icon.system_message, MESSAGE_APPLIED);
        assert_eq!(
            check(
                &fixture,
                &fixture.managed,
                instance.provider_provenance.as_ref()
            ),
            Ok(ManagedBundleState::Iconized)
        );

        let tampered = IconFixture::new("leftovers-tampered", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&tampered);
        leftovers_instance(&tampered, &mut registry);
        fs::write(tampered.managed.join("Contents/Resources/extra"), b"x").unwrap();
        let mut instance = registry.instances[0].clone();
        assert_eq!(
            launch_preflight(&tampered.paths, &mut instance, Some(&tampered.original)),
            Err(bundle_changed_message("Trabajo"))
        );
        assert!(instance.provider_provenance.is_none());
    }

    #[test]
    fn leftovers_without_provenance_can_receive_or_lose_the_icon() {
        let fixture = IconFixture::new("leftovers-set", Some(EXPLICIT_REQUIREMENT));
        let mut registry = registry_for(&fixture);
        leftovers_instance(&fixture, &mut registry);
        set_instance_icon(
            &fixture.paths,
            &mut registry,
            0,
            &fixture.original,
            &icon_png(&fixture),
        )
        .unwrap();
        assert!(
            registry.instances[0]
                .custom_icon
                .as_ref()
                .unwrap()
                .system_applied
        );
        assert!(registry.instances[0].provider_provenance.is_some());

        let other = IconFixture::new("leftovers-clear", Some(EXPLICIT_REQUIREMENT));
        let baseline = crate::tests::macos_signature_snapshot(&other.managed);
        let mut registry = registry_for(&other);
        leftovers_instance(&other, &mut registry);
        clear_instance_icon(&other.paths, &mut registry, 0, &other.original).unwrap();
        assert!(strict_passes(&other.managed));
        assert_eq!(
            crate::tests::macos_signature_snapshot(&other.managed),
            baseline
        );
        assert!(registry.instances[0].custom_icon.is_none());
    }

    #[test]
    fn any_copy_in_its_place_is_a_sync_target_but_only_a_verified_one_is_a_donor() {
        let fixture = IconFixture::new("sync-target", Some(EXPLICIT_REQUIREMENT));
        let registered = provenance_for(&fixture, &fixture.managed);
        // An inherited ad hoc copy (HU-0007 era) that also changed outside the app.
        fs::write(fixture.managed.join("Contents/Resources/extra"), b"x").unwrap();
        let mut registry = registry_for(&fixture);
        let legacy = ProviderProvenance {
            provider_signature_preserved: false,
            ..registered
        };
        for provenance in [Some(legacy), None] {
            registry.instances[0].provider_provenance = provenance;
            let instance = &registry.instances[0];
            assert!(check(
                &fixture,
                &fixture.managed,
                instance.provider_provenance.as_ref()
            )
            .is_err());
            assert_eq!(
                validate_managed_application(&fixture.paths, instance, &fixture.original),
                Ok("1.0.0".to_string()),
                "the target is replaced whole by a verified staging copy"
            );
            assert!(validate_managed_application_source(
                &fixture.paths,
                instance,
                &fixture.original
            )
            .is_err());
        }
        let mut outside = registry.instances[0].clone();
        outside.app_path = fixture.original.to_string_lossy().to_string();
        assert!(validate_managed_application(&fixture.paths, &outside, &fixture.original).is_err());
    }

    #[test]
    fn app_management_is_not_retried() {
        let fixture = IconFixture::new("no-retry", Some(EXPLICIT_REQUIREMENT));
        let _locked = Immutable::new(&fixture.managed);
        WORKSPACE_ICON_CALLS.with(|calls| calls.set(0));
        assert_eq!(
            set_workspace_icon(
                &fixture.paths.instances,
                &fixture.managed,
                Some(&fixture.icon)
            ),
            Err(WorkspaceIconError::Rejected(Some(
                CustomIconSystemIssue::AppManagement
            )))
        );
        assert_eq!(WORKSPACE_ICON_CALLS.with(|calls| calls.get()), 1);
    }

    #[test]
    fn original_with_another_requirement_rejects_the_iconized_copy() {
        let fixture = IconFixture::new("other-dr", Some(EXPLICIT_REQUIREMENT));
        let provenance = provenance_for(&fixture, &fixture.managed);
        put_icon(&fixture, &fixture.managed);
        let status = Command::new("/usr/bin/codesign")
            .args(["--force", "--deep", "--sign", "-", "-r"])
            .arg("=designated => identifier \"com.codeaiprofiles.other\"")
            .arg(&fixture.original)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .unwrap();
        assert!(status.success());
        invalidate_application_cache();
        assert_eq!(
            check(&fixture, &fixture.managed, Some(&provenance)),
            Err(BundleCheckFailure::DesignatedRequirement)
        );
    }
}
