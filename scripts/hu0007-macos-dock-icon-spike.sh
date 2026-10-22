#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly SOURCE_APP="/Applications/Claude.app"
readonly REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
readonly REPO_ICON="$REPO_ROOT/src-tauri/icons/icon.icns"
readonly CLONE_NAME="Code AI Dock Test.app"
readonly SENTINEL_CONTENT="HU-0007 empty profile fixture; no authentication data"
PREPARE_ROOT=""
PREPARE_CLONE=""
PREPARE_STATE=""
PREPARE_RETAIN=false

json_error() {
  local phase="$1"
  local message="$2"
  /usr/bin/python3 - "$phase" "$message" <<'PY'
import json
import sys
print(json.dumps({"ok": False, "phase": sys.argv[1], "diagnostic": sys.argv[2]}, sort_keys=True))
PY
}

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    json_error "preflight" "HU-0007 is macOS-only"
    exit 2
  fi
}

sha256_file() {
  /usr/bin/shasum -a 256 "$1" | /usr/bin/awk '{print $1}'
}

bundle_value() {
  local bundle="$1"
  local key="$2"
  /usr/libexec/PlistBuddy -c "Print :${key}" "$bundle/Contents/Info.plist" 2>/dev/null || true
}

snapshot_bundle() {
  local bundle="$1"
  local output_dir="$2"
  local executable_name executable_path details requirement entitlements

  /bin/mkdir -p "$output_dir"
  /bin/cp "$bundle/Contents/Info.plist" "$output_dir/Info.plist"
  /usr/bin/plutil -convert xml1 "$output_dir/Info.plist"

  executable_name="$(bundle_value "$bundle" "CFBundleExecutable")"
  if [[ -z "$executable_name" ]]; then
    return 1
  fi
  executable_path="$bundle/Contents/MacOS/$executable_name"
  if [[ ! -f "$executable_path" ]]; then
    return 1
  fi

  # Keep signature operations sequential. Their diagnostics never include provider logs.
  set +e
  /usr/bin/codesign --verify --deep "$bundle" >"$output_dir/verify-deep.stdout" 2>"$output_dir/verify-deep.stderr"
  local deep_status=$?
  /usr/bin/codesign --verify --deep --strict "$bundle" >"$output_dir/verify-strict.stdout" 2>"$output_dir/verify-strict.stderr"
  local strict_status=$?
  /usr/bin/codesign -d --verbose=4 "$bundle" >"$output_dir/details.stdout" 2>"$output_dir/details.stderr"
  local details_status=$?
  /usr/bin/codesign -d -r- "$bundle" >"$output_dir/requirement.stdout" 2>"$output_dir/requirement.stderr"
  local requirement_status=$?
  /usr/bin/codesign -d --entitlements :- "$bundle" >"$output_dir/entitlements.plist" 2>"$output_dir/entitlements.stderr"
  local entitlements_status=$?
  set -e

  details="$output_dir/details.stderr"
  # `codesign -d -r-` emits the designated requirement on stdout on current macOS.
  requirement="$output_dir/requirement.stdout"
  entitlements="$output_dir/entitlements.plist"
  if [[ ! -s "$entitlements" ]] || ! /usr/bin/plutil -lint "$entitlements" >/dev/null 2>&1; then
    : >"$entitlements"
  else
    /usr/bin/plutil -convert xml1 "$entitlements"
  fi

  /usr/bin/python3 - \
    "$bundle" "$executable_path" "$output_dir" \
    "$deep_status" "$strict_status" "$details_status" "$requirement_status" "$entitlements_status" \
    "$(sha256_file "$output_dir/Info.plist")" "$(sha256_file "$executable_path")" \
    "$(if [[ -s "$entitlements" ]]; then sha256_file "$entitlements"; fi)" \
    "$(/usr/bin/sed -n 's/^CDHash=//p' "$details" | /usr/bin/head -1)" \
    "$(/usr/bin/sed -n 's/^TeamIdentifier=//p' "$details" | /usr/bin/head -1)" \
    "$(/usr/bin/sed -n 's/^designated => //p' "$requirement" | /usr/bin/head -1)" <<'PY'
import json
import pathlib
import sys

(bundle, executable, output_dir, deep, strict, details_status, requirement_status,
 entitlements_status, plist_hash, executable_hash, entitlements_hash, cdhash, team_id,
 designated_requirement) = sys.argv[1:]
data = {
    "bundle": bundle,
    "executable": executable,
    "deepStatus": int(deep),
    "strictStatus": int(strict),
    "detailsStatus": int(details_status),
    "requirementStatus": int(requirement_status),
    "entitlementsStatus": int(entitlements_status),
    "infoPlistSha256": plist_hash,
    "executableSha256": executable_hash,
    "entitlementsSha256": entitlements_hash or None,
    "cdHash": cdhash or None,
    "teamId": team_id if team_id and team_id != "not set" else None,
    "designatedRequirement": designated_requirement or None,
    "snapshotDirectory": output_dir,
}
pathlib.Path(output_dir, "snapshot.json").write_text(
    json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8"
)
PY
}

snapshot_equal() {
  /usr/bin/python3 - "$1" "$2" <<'PY'
import json
import sys

left = json.load(open(sys.argv[1], encoding="utf-8"))
right = json.load(open(sys.argv[2], encoding="utf-8"))
keys = (
    "deepStatus", "strictStatus", "infoPlistSha256", "executableSha256",
    "entitlementsSha256", "cdHash", "teamId", "designatedRequirement",
)
raise SystemExit(0 if all(left.get(key) == right.get(key) for key in keys) else 1)
PY
}

clone_processes() {
  local clone="$1"
  # `comm` exposes only the executable path/name. Never inventory arguments
  # from unrelated processes; full command lines are queried later per PID.
  /bin/ps axww -o pid=,comm= | /usr/bin/awk -v needle="$clone/Contents/" 'index($0, needle) { print $1 }'
}

terminate_clone_processes() {
  local clone="$1"
  local pids=() pid command attempt
  while IFS= read -r pid; do [[ -n "$pid" ]] && pids+=("$pid"); done < <(clone_processes "$clone")
  for pid in "${pids[@]}"; do
    command="$(/bin/ps -ww -p "$pid" -o command= 2>/dev/null || true)"
    [[ "$command" == *"$clone/Contents/"* ]] || return 1
  done
  for pid in "${pids[@]}"; do /bin/kill -TERM "$pid" 2>/dev/null || true; done
  for attempt in 1 2 3 4 5 6 7 8; do
    [[ -z "$(clone_processes "$clone")" ]] && return 0
    /bin/sleep 1
  done
  return 1
}

prepare_failure_cleanup() {
  local status=$?
  if [[ "$status" -ne 0 && "$PREPARE_RETAIN" != true && -n "$PREPARE_ROOT" && -d "$PREPARE_ROOT" ]]; then
    if [[ -n "$PREPARE_CLONE" ]] && ! terminate_clone_processes "$PREPARE_CLONE"; then
      /usr/bin/printf '%s\n' '{"ok":false,"phase":"rollback","diagnostic":"fixture processes remained; temporary root retained"}' >&2
      return "$status"
    fi
    /bin/rm -rf "$PREPARE_ROOT"
    if [[ -n "$PREPARE_STATE" ]] && validate_state_location "$PREPARE_STATE" && [[ -f "$PREPARE_STATE" ]]; then
      /usr/bin/python3 - "$PREPARE_STATE" <<'PY'
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
try:
    state = json.loads(path.read_text(encoding="utf-8"))
except Exception:
    state = {"schema": 1, "phase": "failed"}
state.update({"cleanupCompleted": True, "remainingFixtureProcesses": 0, "rootRetained": False})
path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
    fi
    /usr/bin/printf '%s\n' '{"ok":true,"phase":"rollback","cleanupCompleted":true,"remainingFixtureProcesses":0}' >&2
  fi
  return "$status"
}

validate_state_location() {
  local state_file="$1"
  local tmp_root base parent
  tmp_root="$(cd "${TMPDIR%/}" && pwd -P)"
  base="$(basename "$state_file")"
  parent="$(cd "$(dirname "$state_file")" 2>/dev/null && pwd -P || true)"
  [[ "$parent" == "$tmp_root" && "$base" == code-ai-hu0007-state.* ]]
}

validate_pid() {
  local pid="$1"
  local clone="$2"
  local executable="$3"
  local launch_arg="$4"
  local command

  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  command="$(/bin/ps -ww -p "$pid" -o command= 2>/dev/null || true)"
  [[ -n "$command" ]] || return 1
  [[ "$executable" == "$clone"/Contents/MacOS/* ]] || return 1
  [[ "$command" == *"$executable"* ]] || return 1
  [[ "$command" == *"$launch_arg"* ]] || return 1
}

find_valid_primary_pid() {
  local clone="$1"
  local executable="$2"
  local launch_arg="$3"
  local candidate
  while IFS= read -r candidate; do
    if [[ -n "$candidate" ]] && validate_pid "$candidate" "$clone" "$executable" "$launch_arg"; then
      /usr/bin/printf '%s\n' "$candidate"
      return 0
    fi
  done < <(clone_processes "$clone")
  return 1
}

write_icon_helper() {
  local source_path="$1"
  /bin/cat >"$source_path" <<'SWIFT'
import AppKit
import Foundation

guard CommandLine.arguments.count == 3,
      let rawPid = Int32(CommandLine.arguments[1]) else {
  exit(2)
}
let output = URL(fileURLWithPath: CommandLine.arguments[2])
guard let application = NSRunningApplication(processIdentifier: rawPid),
      let executable = application.executableURL?.path else {
  exit(3)
}
try executable.write(to: output.deletingLastPathComponent().appendingPathComponent("process-executable.txt"), atomically: true, encoding: .utf8)
guard let icon = application.icon,
      let tiff = icon.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
  exit(4)
}
try png.write(to: output)
SWIFT
}

dry_run() {
  require_macos
  local missing=()
  local required=(
    /usr/bin/codesign /usr/bin/ditto /usr/bin/plutil /usr/bin/shasum
    /usr/bin/swiftc /usr/libexec/PlistBuddy /usr/bin/python3
  )
  local command
  for command in "${required[@]}"; do
    [[ -x "$command" ]] || missing+=("$command")
  done
  [[ -d "$SOURCE_APP" ]] || missing+=("$SOURCE_APP")
  [[ -f "$SOURCE_APP/Contents/Info.plist" ]] || missing+=("$SOURCE_APP/Contents/Info.plist")
  [[ -f "$REPO_ICON" ]] || missing+=("$REPO_ICON")
  /usr/bin/python3 - "$SOURCE_APP" "$REPO_ICON" "${missing[@]}" <<'PY'
import json
import sys
source, icon, *missing = sys.argv[1:]
print(json.dumps({
    "ok": not missing,
    "phase": "dry-run",
    "source": source,
    "sourceReadOnly": True,
    "repositoryIcon": icon,
    "missing": missing,
}, sort_keys=True))
raise SystemExit(0 if not missing else 2)
PY
}

prepare() {
  require_macos
  local requested_state="${1:-}"
  local launch_mode="${2:-direct}"
  local root clone profile sentinel state_file executable launch_arg pid
  local icon_helper_source icon_helper icon_export process_executable sign_status

  if [[ ! -d "$SOURCE_APP" ]]; then
    json_error "preflight" "source application is absent at /Applications/Claude.app"
    exit 2
  fi
  if [[ ! -f "$REPO_ICON" ]]; then
    json_error "preflight" "repository icon is absent"
    exit 2
  fi

  root="$(/usr/bin/mktemp -d "${TMPDIR%/}/code-ai-hu0007.XXXXXX")"
  PREPARE_ROOT="$root"
  clone="$root/$CLONE_NAME"
  PREPARE_CLONE="$clone"
  trap prepare_failure_cleanup EXIT
  profile="$root/profile"
  sentinel="$profile/.hu0007-sentinel"
  if [[ -n "$requested_state" ]]; then
    state_file="$requested_state"
    if ! validate_state_location "$state_file" || [[ -e "$state_file" ]]; then
      json_error "preflight" "requested state file already exists"
      exit 2
    fi
    /usr/bin/touch "$state_file"
    /bin/chmod 600 "$state_file"
  else
    state_file="$(/usr/bin/mktemp "${TMPDIR%/}/code-ai-hu0007-state.XXXXXX")"
  fi
  PREPARE_STATE="$state_file"

  /bin/mkdir -p "$profile"
  /usr/bin/printf '%s\n' "$SENTINEL_CONTENT" >"$sentinel"
  snapshot_bundle "$SOURCE_APP" "$root/source-before"
  /usr/bin/ditto "$SOURCE_APP" "$clone"
  snapshot_bundle "$clone" "$root/clone-before"

  /bin/cp "$REPO_ICON" "$clone/Contents/Resources/CodeAIDockTest.icns"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile CodeAIDockTest.icns" "$clone/Contents/Info.plist" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string CodeAIDockTest.icns" "$clone/Contents/Info.plist"

  set +e
  /usr/bin/codesign --force --deep --sign - \
    --preserve-metadata=identifier,entitlements,flags,runtime \
    "$clone" >"$root/resign.stdout" 2>"$root/resign.stderr"
  sign_status=$?
  set -e
  snapshot_bundle "$clone" "$root/clone-after"
  snapshot_bundle "$SOURCE_APP" "$root/source-after"

  if ! snapshot_equal "$root/source-before/snapshot.json" "$root/source-after/snapshot.json"; then
    json_error "source-integrity" "source snapshot changed during the isolated spike"
    exit 3
  fi
  if [[ "$sign_status" -ne 0 ]] || ! /usr/bin/python3 - "$root/clone-after/snapshot.json" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
raise SystemExit(0 if data["strictStatus"] == 0 else 1)
PY
  then
    /usr/bin/python3 - "$root" "$sign_status" "$root/clone-after/snapshot.json" <<'PY'
import json, sys
snapshot = json.load(open(sys.argv[3], encoding="utf-8"))
print(json.dumps({
    "ok": False,
    "phase": "resign",
    "root": sys.argv[1],
    "resignStatus": int(sys.argv[2]),
    "strictStatus": snapshot["strictStatus"],
    "diagnostic": "ad-hoc resigning did not produce a strict-valid clone; fixture removed",
}, sort_keys=True))
PY
    exit 4
  fi

  executable="$(/usr/bin/python3 - "$root/clone-after/snapshot.json" <<'PY'
import json, sys
print(json.load(open(sys.argv[1], encoding="utf-8"))["executable"])
PY
)"
  launch_arg="--user-data-dir=$profile"
  icon_helper_source="$root/export-running-icon.swift"
  icon_helper="$root/export-running-icon"
  icon_export="$root/process-icon.png"
  write_icon_helper "$icon_helper_source"
  /bin/mkdir -p "$root/swift-module-cache"
  CLANG_MODULE_CACHE_PATH="$root/swift-module-cache" /usr/bin/swiftc "$icon_helper_source" -o "$icon_helper"

  /usr/bin/python3 - \
    "$state_file" "$root" "$clone" "$profile" "$sentinel" "$executable" "$launch_arg" \
    "$(sha256_file "$sentinel")" \
    "$(bundle_value "$SOURCE_APP" "CFBundleIdentifier")" \
    "$(bundle_value "$clone" "CFBundleIdentifier")" \
    "$(bundle_value "$SOURCE_APP" "CFBundleIconName")" \
    "$(if [[ -f "$SOURCE_APP/Contents/Resources/Assets.car" ]]; then echo true; else echo false; fi)" \
    "$launch_mode" <<'PY'
import json, pathlib, sys
(state_file, root, clone, profile, sentinel, executable, launch_arg, sentinel_hash,
 source_bundle_id, clone_bundle_id, source_icon_name, source_assets_car, launch_mode) = sys.argv[1:]
load = lambda name: json.load(open(root + "/" + name + "/snapshot.json", encoding="utf-8"))
source_before, source_after = load("source-before"), load("source-after")
clone_before, clone_after = load("clone-before"), load("clone-after")
before_dr = clone_before.get("designatedRequirement")
after_dr = clone_after.get("designatedRequirement")
dr_changed = None if not before_dr or not after_dr else before_dr != after_dr
keys = ("deepStatus", "strictStatus", "infoPlistSha256", "executableSha256",
        "entitlementsSha256", "cdHash", "teamId", "designatedRequirement")
state = {
    "schema": 1, "phase": "pre-launch", "stateFile": state_file, "root": root,
    "source": "/Applications/Claude.app", "clone": clone, "profile": profile,
    "sentinel": sentinel, "sentinelSha256": sentinel_hash, "executable": executable,
    "launchArgument": launch_arg, "launchMode": launch_mode, "primaryPid": None,
    "sourceBefore": source_before, "sourceAfter": source_after,
    "cloneBefore": clone_before, "cloneAfter": clone_after,
    "sourceBundleId": source_bundle_id, "cloneBundleId": clone_bundle_id,
    "bundleIdPreserved": source_bundle_id == clone_bundle_id,
    "sourceCFBundleIconName": source_icon_name or None,
    "sourceHasAssetsCar": source_assets_car == "true",
    "configuredCFBundleIconFile": "CodeAIDockTest.icns",
    "strictSignatureValid": clone_after["strictStatus"] == 0,
    "signatureChanged": clone_before.get("cdHash") != clone_after.get("cdHash"),
    "designatedRequirementChanged": dr_changed,
    "entitlementsCompared": True,
    "entitlementsPreserved": clone_before.get("entitlementsSha256") == clone_after.get("entitlementsSha256"),
    "sourceUnchanged": all(source_before.get(key) == source_after.get(key) for key in keys),
    "launchStarted": False, "processIconExported": False, "dockVisualConfirmed": False,
    "cleanupCompleted": False,
}
pathlib.Path(state_file).write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY

  if [[ "$launch_mode" == "open" ]]; then
    local open_status=0
    /usr/bin/open -n "$clone" --args "$launch_arg" >/dev/null 2>&1 || open_status=$?
    if [[ "$open_status" -ne 0 ]]; then
      json_error "launch-open" "open -n failed for the exact temporary clone path"
      exit 5
    fi
    pid=""
  else
    /usr/bin/nohup "$executable" "$launch_arg" >/dev/null 2>&1 &
    pid=$!
  fi
  local attempt
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if [[ "$launch_mode" == "open" ]]; then
      pid="$(find_valid_primary_pid "$clone" "$executable" "$launch_arg" || true)"
    fi
    if [[ -n "$pid" ]] && validate_pid "$pid" "$clone" "$executable" "$launch_arg"; then
      break
    fi
    /bin/sleep 1
  done
  if ! validate_pid "$pid" "$clone" "$executable" "$launch_arg"; then
    /usr/bin/python3 - "$root" "$sign_status" <<'PY'
import json, sys
root = sys.argv[1]
load = lambda name: json.load(open(root + "/" + name + "/snapshot.json", encoding="utf-8"))
source_before, source_after = load("source-before"), load("source-after")
clone_before, clone_after = load("clone-before"), load("clone-after")
before_dr = clone_before.get("designatedRequirement")
after_dr = clone_after.get("designatedRequirement")
dr_changed = None if not before_dr or not after_dr else before_dr != after_dr
keys = ("deepStatus", "strictStatus", "infoPlistSha256", "executableSha256",
        "entitlementsSha256", "cdHash", "teamId", "designatedRequirement")
print(json.dumps({
    "ok": False,
    "phase": "launch",
    "diagnostic": "fixture process did not remain alive with the exact clone executable and profile argument",
    "resignStatus": int(sys.argv[2]),
    "strictSignatureValid": clone_after["strictStatus"] == 0,
    "signatureChanged": clone_before.get("cdHash") != clone_after.get("cdHash"),
    "teamIdBefore": clone_before.get("teamId"),
    "teamIdAfter": clone_after.get("teamId"),
    "designatedRequirementChanged": dr_changed,
    "entitlementsCompared": True,
    "entitlementsPreserved": clone_before.get("entitlementsSha256") == clone_after.get("entitlementsSha256"),
    "sourceUnchanged": all(source_before.get(key) == source_after.get(key) for key in keys),
    "launchStarted": True,
    "launchRemainedAlive": False,
    "processIconExported": False,
    "dockVisualConfirmed": False,
    "cleanupPending": True,
}, sort_keys=True))
PY
    exit 5
  fi

  local helper_status=0
  for attempt in 1 2 3 4 5; do
    helper_status=0
    "$icon_helper" "$pid" "$icon_export" >/dev/null 2>&1 || helper_status=$?
    [[ "$helper_status" -eq 0 && -f "$icon_export" ]] && break
    /bin/sleep 1
  done
  local observed_executable=""
  if [[ -f "$root/process-executable.txt" ]]; then
    observed_executable="$(<"$root/process-executable.txt")"
  fi

  /usr/bin/python3 - \
    "$state_file" "$root" "$SOURCE_APP" "$clone" "$profile" "$sentinel" \
    "$executable" "$launch_arg" "$pid" "$icon_export" "$helper_status" "$observed_executable" \
    "$(bundle_value "$SOURCE_APP" "CFBundleIdentifier")" \
    "$(bundle_value "$clone" "CFBundleIdentifier")" \
    "$(bundle_value "$SOURCE_APP" "CFBundleIconName")" \
    "$(if [[ -f "$SOURCE_APP/Contents/Resources/Assets.car" ]]; then echo true; else echo false; fi)" \
    "$(sha256_file "$sentinel")" <<'PY'
import json
import pathlib
import sys

(state_file, root, source, clone, profile, sentinel, executable, launch_arg, pid,
 icon_export, helper_status, observed_executable, source_bundle_id, clone_bundle_id,
 source_icon_name, source_assets_car, sentinel_hash) = sys.argv[1:]
load = lambda path: json.load(open(path, encoding="utf-8"))
clone_before = load(root + "/clone-before/snapshot.json")
clone_after = load(root + "/clone-after/snapshot.json")
source_before = load(root + "/source-before/snapshot.json")
source_after = load(root + "/source-after/snapshot.json")
integrity_keys = (
    "deepStatus", "strictStatus", "infoPlistSha256", "executableSha256",
    "entitlementsSha256", "cdHash", "teamId", "designatedRequirement",
)
state = {
    "schema": 1,
    "stateFile": state_file,
    "root": root,
    "source": source,
    "clone": clone,
    "profile": profile,
    "sentinel": sentinel,
    "sentinelSha256": sentinel_hash,
    "executable": executable,
    "launchArgument": launch_arg,
    "primaryPid": int(pid),
    "sourceBefore": source_before,
    "sourceAfter": source_after,
    "cloneBefore": clone_before,
    "cloneAfter": clone_after,
    "sourceBundleId": source_bundle_id,
    "cloneBundleId": clone_bundle_id,
    "bundleIdPreserved": source_bundle_id == clone_bundle_id,
    "sourceCFBundleIconName": source_icon_name or None,
    "sourceHasAssetsCar": source_assets_car == "true",
    "configuredCFBundleIconFile": "CodeAIDockTest.icns",
    "processIconExported": int(helper_status) == 0 and pathlib.Path(icon_export).is_file(),
    "processIconPath": icon_export if pathlib.Path(icon_export).is_file() else None,
    "observedProcessExecutable": observed_executable or None,
    "launchStarted": True,
    "dockVisualConfirmed": False,
    "signatureChanged": clone_before.get("cdHash") != clone_after.get("cdHash"),
    "entitlementsCompared": True,
    "entitlementsPreserved": clone_before.get("entitlementsSha256") == clone_after.get("entitlementsSha256"),
    "sourceUnchanged": all(source_before.get(key) == source_after.get(key) for key in integrity_keys),
    "cleanupCompleted": False,
}
pathlib.Path(state_file).write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(json.dumps({
    "ok": True,
    "phase": "prepare",
    "stateFile": state_file,
    "root": root,
    "pid": int(pid),
    "executable": executable,
    "profile": profile,
    "launchArgument": launch_arg,
    "processIconExported": state["processIconExported"],
    "processIconPath": state["processIconPath"],
    "dockVisualConfirmed": False,
    "sourceUnchanged": state["sourceUnchanged"],
    "bundleIdPreserved": state["bundleIdPreserved"],
    "strictSignatureValid": clone_after["strictStatus"] == 0,
}, sort_keys=True))
PY
  PREPARE_RETAIN=true
  trap - EXIT
}

cleanup() {
  require_macos
  local state_file="${1:-}"
  if [[ -z "$state_file" ]] || ! validate_state_location "$state_file"; then
    json_error "cleanup" "state file must use the HU-0007 prefix directly under TMPDIR"
    exit 2
  fi
  if [[ ! -e "$state_file" && ! -L "$state_file" ]]; then
    /usr/bin/python3 - "$state_file" <<'PY'
import json, sys
print(json.dumps({"ok": True, "phase": "cleanup", "stateFile": sys.argv[1], "cleanupCompleted": True, "alreadyAbsent": True}, sort_keys=True))
PY
    return 0
  fi
  if [[ -L "$state_file" ]]; then
    json_error "cleanup" "state file must not be a symbolic link"
    exit 2
  fi
  local state_owner state_mode
  state_owner="$(/usr/bin/stat -f '%Su' "$state_file")"
  state_mode="$(/usr/bin/stat -f '%Lp' "$state_file")"
  if [[ "$state_owner" != "$(/usr/bin/id -un)" || "$state_mode" != "600" ]]; then
    json_error "cleanup" "state file owner or permissions are invalid"
    exit 2
  fi
  if [[ ! -f "$state_file" ]]; then
    json_error "cleanup" "an existing explicit state file is required"
    exit 2
  fi

  local values root source clone profile sentinel executable launch_arg primary_pid sentinel_hash
  values="$(/usr/bin/python3 - "$state_file" <<'PY'
import json, pathlib, sys
s = json.load(open(sys.argv[1], encoding="utf-8"))
if s.get("schema") != 1:
    raise SystemExit(2)
for key in ("root", "source", "clone", "profile", "sentinel", "executable", "launchArgument", "primaryPid", "sentinelSha256"):
    print(s[key])
PY
)" || {
    json_error "cleanup" "state file is invalid"
    exit 2
  }
  local lines=()
  while IFS= read -r line; do lines+=("$line"); done <<<"$values"
  root="${lines[0]}"
  source="${lines[1]}"
  clone="${lines[2]}"
  profile="${lines[3]}"
  sentinel="${lines[4]}"
  executable="${lines[5]}"
  launch_arg="${lines[6]}"
  primary_pid="${lines[7]}"
  sentinel_hash="${lines[8]}"

  local canonical_tmp canonical_root
  canonical_tmp="$(cd "${TMPDIR%/}" && pwd -P)"
  canonical_root="$(cd "$root" 2>/dev/null && pwd -P || true)"
  if [[ -z "$canonical_root" ]]; then
    /bin/rm -f "$state_file"
    /usr/bin/python3 - "$root" <<'PY'
import json, sys
print(json.dumps({"ok": True, "phase": "cleanup", "root": sys.argv[1], "cleanupCompleted": True, "alreadyAbsent": True}, sort_keys=True))
PY
    return 0
  fi
  if [[ "$canonical_root" != "$canonical_tmp"/code-ai-hu0007.* ]] || \
     [[ "$clone" != "$root/$CLONE_NAME" ]] || \
     [[ "$profile" != "$root/profile" ]] || \
     [[ "$source" != "$SOURCE_APP" ]] || \
     [[ "$executable" != "$clone"/Contents/MacOS/* ]] || \
     [[ "$launch_arg" != "--user-data-dir=$profile" ]]; then
    json_error "cleanup" "state paths failed the HU-0007 containment checks"
    exit 3
  fi

  local sentinel_intact=false
  if [[ -f "$sentinel" ]] && [[ "$(sha256_file "$sentinel")" == "$sentinel_hash" ]]; then
    sentinel_intact=true
  fi

  local fixture_pids=()
  local fixture_pid
  while IFS= read -r fixture_pid; do
    [[ -n "$fixture_pid" ]] && fixture_pids+=("$fixture_pid")
  done < <(clone_processes "$clone")
  if /bin/kill -0 "$primary_pid" 2>/dev/null && ! validate_pid "$primary_pid" "$clone" "$executable" "$launch_arg"; then
    json_error "cleanup" "primary PID is alive but no longer matches the fixture identity; nothing was terminated"
    exit 4
  fi
  for fixture_pid in "${fixture_pids[@]}"; do
    local command
    command="$(/bin/ps -ww -p "$fixture_pid" -o command= 2>/dev/null || true)"
    if [[ "$command" != *"$clone/Contents/"* ]]; then
      json_error "cleanup" "a candidate PID failed exact clone containment; nothing was terminated"
      exit 4
    fi
  done
  for fixture_pid in "${fixture_pids[@]}"; do
    /bin/kill -TERM "$fixture_pid"
  done

  local attempt
  for attempt in 1 2 3 4 5 6 7 8; do
    [[ -z "$(clone_processes "$clone")" ]] && break
    /bin/sleep 1
  done
  local remaining
  remaining="$(clone_processes "$clone")"
  if [[ -n "$remaining" ]]; then
    json_error "cleanup" "validated fixture processes did not exit after TERM; root retained"
    exit 5
  fi

  snapshot_bundle "$SOURCE_APP" "$root/source-cleanup"
  local source_unchanged=false
  if snapshot_equal "$root/source-before/snapshot.json" "$root/source-cleanup/snapshot.json"; then
    source_unchanged=true
  fi
  if [[ "$source_unchanged" != true ]]; then
    json_error "cleanup" "source integrity snapshot changed; root retained for diagnosis"
    exit 6
  fi

  /bin/rm -rf "$root"
  /bin/rm -f "$state_file"
  /usr/bin/python3 - "$root" "$primary_pid" "$sentinel_intact" "$source_unchanged" <<'PY'
import json, sys
print(json.dumps({
    "ok": True,
    "phase": "cleanup",
    "root": sys.argv[1],
    "primaryPid": int(sys.argv[2]),
    "sentinelIntactBeforeRemoval": sys.argv[3] == "true",
    "sourceUnchanged": sys.argv[4] == "true",
    "remainingFixtureProcesses": 0,
    "cleanupCompleted": True,
}, sort_keys=True))
PY
}

self_test() {
  /usr/bin/python3 <<'PY'
def designated_requirement_changed(before, after):
    return None if not before or not after else before != after

cases = (
    (None, "requirement-a", None, "absent-before"),
    ("requirement-a", None, None, "absent-after"),
    ("requirement-a", "requirement-a", False, "equal"),
    ("requirement-a", "requirement-b", True, "different"),
)
for before, after, expected, label in cases:
    actual = designated_requirement_changed(before, after)
    if actual is not expected:
        raise SystemExit(f"{label}: expected {expected!r}, got {actual!r}")
print('{"ok":true,"phase":"self-test","designatedRequirementTriStateCases":4}')
PY
}

usage() {
  /usr/bin/printf 'Usage: %s dry-run | self-test | prepare [state-file] | prepare-open [state-file] | cleanup <state-file>\n' "$SCRIPT_NAME"
}

case "${1:-}" in
  dry-run)
    dry_run
    ;;
  self-test)
    self_test
    ;;
  prepare)
    prepare "${2:-}" direct
    ;;
  prepare-open)
    prepare "${2:-}" open
    ;;
  cleanup)
    cleanup "${2:-}"
    ;;
  *)
    usage
    exit 2
    ;;
esac
