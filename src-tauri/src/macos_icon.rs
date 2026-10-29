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

/// How the clean form re-checks the provider identity. Donors and every write path use `Fresh`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum IdentityCheck {
    Fresh,
    Cached,
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
    identity: IdentityCheck,
) -> Result<ManagedBundleState, BundleCheckFailure> {
    match identity {
        IdentityCheck::Fresh => validate_provider_identity_uncached(candidate, original),
        IdentityCheck::Cached => validate_provider_identity(candidate, original),
    }
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
    identity: IdentityCheck,
) -> Result<ManagedBundleState, BundleCheckFailure> {
    match bundle_shape(candidate).map_err(|_| BundleCheckFailure::Unreadable)? {
        BundleShape::Clean => check_clean(candidate, original, provenance, identity),
        BundleShape::Iconized => check_iconized(candidate, original, provenance),
    }
}

/// A-2 for the person: any failure becomes `bundle_changed_message(name)`.
pub(crate) fn verify_managed_bundle(
    candidate: &Path,
    original: &Path,
    provenance: Option<&ProviderProvenance>,
    name: &str,
) -> Result<ManagedBundleState, String> {
    check_managed_bundle(candidate, original, provenance, IdentityCheck::Fresh)
        .map_err(|_| bundle_changed_message(name))
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
        pub(crate) original: PathBuf,
        pub(crate) managed: PathBuf,
        pub(crate) icon: PathBuf,
        pub(crate) requirement: Option<&'static str>,
    }

    impl IconFixture {
        pub(crate) fn new(case: &str, requirement: Option<&'static str>) -> Self {
            let root = env::temp_dir().join(format!("code-ai-icon-{case}-{}", Uuid::new_v4()));
            let paths = test_managed_paths(&root);
            let instance_root = paths.instances.join(Uuid::new_v4().to_string());
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

    /// Provenance as the product registers it, taken from a clean copy that passes `--strict`.
    pub(crate) fn provenance_for(bundle: &Path) -> ProviderProvenance {
        assert!(strict_passes(bundle));
        ProviderProvenance {
            bundle_identifier: macos_bundle_value(bundle, "CFBundleIdentifier").unwrap(),
            provider_team_identifier: macos_team_identifier(bundle),
            provider_version: source_version(bundle).unwrap(),
            provider_source_fingerprint: "fixture".to_string(),
            managed_fingerprint: "fixture".to_string(),
            managed_code_hash: macos_code_hash(bundle),
            provider_signature_preserved: true,
            original_icon_file: None,
        }
    }

    fn put_icon(fixture: &IconFixture, bundle: &Path) {
        set_macos_workspace_icon(bundle, Some(&fixture.icon)).unwrap();
        assert_eq!(bundle_shape(bundle).unwrap(), BundleShape::Iconized);
    }

    fn check(
        fixture: &IconFixture,
        bundle: &Path,
        provenance: Option<&ProviderProvenance>,
    ) -> Result<ManagedBundleState, BundleCheckFailure> {
        check_managed_bundle(bundle, &fixture.original, provenance, IdentityCheck::Fresh)
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
            let provenance = provenance_for(&fixture.managed);
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
        let provenance = provenance_for(&fixture.managed);
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
        let mut adhoc = provenance_for(&fixture.managed);
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
            let provenance = provenance_for(&fixture.managed);
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
            let provenance = provenance_for(&fixture.managed);
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
    fn original_with_another_requirement_rejects_the_iconized_copy() {
        let fixture = IconFixture::new("other-dr", Some(EXPLICIT_REQUIREMENT));
        let provenance = provenance_for(&fixture.managed);
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
