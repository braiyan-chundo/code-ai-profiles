//! Ayudantes compartidos por las pruebas de varios módulos: rutas administradas e instancias sobre
//! una raíz temporal y, en macOS, bundles firmados ad hoc, su copia y la instantánea de su firma.

use super::*;

#[cfg(all(target_os = "macos", test))]
pub(crate) fn clone_directory(source: &Path, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("No se pudo preparar el respaldo: {error}"))?;
    }
    let cloned = Command::new("/bin/cp")
        .args(["-cR"])
        .arg(source)
        .arg(destination)
        .status();
    if matches!(cloned, Ok(status) if status.success()) {
        return Ok(());
    }
    if destination.exists() {
        fs::remove_dir_all(destination)
            .map_err(|error| format!("No se pudo limpiar el respaldo parcial: {error}"))?;
    }
    let copied = Command::new("/usr/bin/ditto")
        .args(["--rsrc", "--extattr", "--acl"])
        .arg(source)
        .arg(destination)
        .status()
        .map_err(|error| format!("No se pudo iniciar el respaldo del bundle: {error}"))?;
    copied
        .success()
        .then_some(())
        .ok_or_else(|| "No se pudo respaldar el bundle administrado.".to_string())
}

pub(crate) fn test_managed_paths(root: &Path) -> ManagedPaths {
    ManagedPaths {
        app_data: root.to_path_buf(),
        instances: root.join("managed-instances"),
        registry: root.join("instances.json"),
        session_backups: root.join("session-transfer-backups"),
        session_links: root.join("session-links.json"),
        source_update_cache: root.join("source-update-cache.json"),
        artifact_exports: root.join("artifact-exports"),
        original_update: root.join("original-update"),
    }
}

pub(crate) fn test_instance(root: &Path) -> ManagedInstance {
    ManagedInstance {
        id: Uuid::new_v4().to_string(),
        name: "Test profile".to_string(),
        account_label: None,
        avatar_url: None,
        plan: AccountPlan::Unknown,
        source_version: Some("1.0.0".to_string()),
        app_path: root
            .join("application/Test.app")
            .to_string_lossy()
            .to_string(),
        profile_path: root.join("profile").to_string_lossy().to_string(),
        created_at: Utc::now().to_rfc3339(),
        last_launched_at: None,
        pid: None,
        process_identity: None,
        launch_generation: 0,
        custom_icon: None,
        provider_provenance: None,
        status: InstanceStatus::Stopped,
        usage: None,
        code_sessions: Vec::new(),
    }
}

#[cfg(target_os = "macos")]
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct MacosSignatureSnapshot {
    pub(crate) deep_status: Option<i32>,
    pub(crate) deep_diagnostic: String,
    pub(crate) strict_status: Option<i32>,
    pub(crate) strict_diagnostic: String,
    pub(crate) code_hash: Option<String>,
    pub(crate) team_identifier: Option<String>,
    pub(crate) designated_requirement: Option<String>,
    pub(crate) info_plist: Vec<u8>,
}

#[cfg(target_os = "macos")]
fn normalized_codesign_diagnostic(bundle: &Path, bytes: &[u8]) -> String {
    let canonical = fs::canonicalize(bundle).ok();
    let mut diagnostic =
        String::from_utf8_lossy(bytes).replace(bundle.to_string_lossy().as_ref(), "<managed-app>");
    if let Some(canonical) = canonical {
        diagnostic = diagnostic.replace(canonical.to_string_lossy().as_ref(), "<managed-app>");
    }
    diagnostic
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(target_os = "macos")]
fn codesign_verification(bundle: &Path, strict: bool) -> (Option<i32>, String) {
    let mut command = Command::new("/usr/bin/codesign");
    command.args(["--verify", "--deep"]);
    if strict {
        command.arg("--strict");
    }
    let output = command.arg(bundle).output().unwrap();
    (
        output.status.code(),
        normalized_codesign_diagnostic(bundle, &output.stderr),
    )
}

#[cfg(target_os = "macos")]
fn macos_designated_requirement(bundle: &Path) -> Option<String> {
    let output = Command::new("/usr/bin/codesign")
        .args(["-d", "-r-"])
        .arg(bundle)
        .output()
        .ok()?;
    String::from_utf8_lossy(&output.stderr)
        .lines()
        .find_map(|line| {
            line.trim()
                .strip_prefix("designated => ")
                .map(str::to_string)
        })
}

#[cfg(target_os = "macos")]
pub(crate) fn macos_signature_snapshot(bundle: &Path) -> MacosSignatureSnapshot {
    let (deep_status, deep_diagnostic) = codesign_verification(bundle, false);
    let (strict_status, strict_diagnostic) = codesign_verification(bundle, true);
    MacosSignatureSnapshot {
        deep_status,
        deep_diagnostic,
        strict_status,
        strict_diagnostic,
        code_hash: macos_code_hash(bundle),
        team_identifier: macos_team_identifier(bundle),
        designated_requirement: macos_designated_requirement(bundle),
        info_plist: fs::read(bundle.join("Contents/Info.plist")).unwrap(),
    }
}

#[cfg(target_os = "macos")]
pub(crate) fn write_signed_fixture_bundle(bundle: &Path) {
    write_signed_fixture_bundle_with(bundle, "1.0.0", None);
}

/// Ad hoc signed fixture. `requirement` is an explicit designated requirement (`=designated => …`);
/// without it the requirement is the implicit `cdhash H"…"`.
#[cfg(target_os = "macos")]
pub(crate) fn write_signed_fixture_bundle_with(
    bundle: &Path,
    version: &str,
    requirement: Option<&str>,
) {
    let contents = bundle.join("Contents");
    let executable = contents.join("MacOS/Claude");
    fs::create_dir_all(executable.parent().unwrap()).unwrap();
    fs::create_dir_all(contents.join("Resources")).unwrap();
    fs::write(contents.join("Resources/fixture.txt"), b"sealed resource").unwrap();
    let source = contents.join("fixture.m");
    fs::write(
        &source,
        br#"#import <AppKit/AppKit.h>
#import <dispatch/dispatch.h>
#include <string.h>
int main(int argc, const char **argv) {
  BOOL smoke = argc > 1 && strcmp(argv[1], "--smoke") == 0;
  if (smoke) { return 0; }
  @autoreleasepool {
    NSApplication *app = [NSApplication sharedApplication];
    [app setActivationPolicy:NSApplicationActivationPolicyRegular];
    NSRect frame = NSMakeRect(0, 0, 420, 180);
    NSWindow *window = [[NSWindow alloc] initWithContentRect:frame styleMask:(NSWindowStyleMaskTitled | NSWindowStyleMaskClosable) backing:NSBackingStoreBuffered defer:NO];
    [window setTitle:@"Code AI Profiles Dock Fixture"];
    [window center];
    [window makeKeyAndOrderFront:nil];
    [app activateIgnoringOtherApps:YES];
    [app run];
  }
  return 0;
}
"#,
    )
    .unwrap();
    let compiled = Command::new("/usr/bin/clang")
        .args(["-fobjc-arc", "-fblocks", "-framework", "AppKit"])
        .arg(&source)
        .args(["-o"])
        .arg(&executable)
        .status()
        .unwrap();
    assert!(compiled.success());
    fs::remove_file(source).unwrap();
    fs::write(
        contents.join("Info.plist"),
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>Claude</string>
<key>CFBundleIdentifier</key><string>com.codeaiprofiles.fixture</string>
<key>CFBundleName</key><string>Fixture</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>__VERSION__</string>
<key>CFBundleVersion</key><string>1</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>"#
            .replace("__VERSION__", version),
    )
    .unwrap();
    let mut command = Command::new("/usr/bin/codesign");
    command.args(["--force", "--deep", "--sign", "-"]);
    if let Some(requirement) = requirement {
        command.args(["-r", requirement]);
    }
    let status = command.arg(bundle).status().unwrap();
    assert!(status.success());
}
