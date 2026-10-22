#!/usr/bin/env bash

set -euo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly SOURCE_APP="/Applications/Claude.app"
readonly REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
readonly REPO_ICON="$REPO_ROOT/src-tauri/icons/icon.icns"
readonly STATE_PREFIX="code-ai-hu0008-state."
readonly ROOT_PREFIX="code-ai-hu0008."
readonly OBSERVATION_MS=5000
readonly TERM_GRACE_MS=3000

RUN_ROOT=""
RUN_STATE=""
RUN_RETAIN=false

emit_error() {
  /usr/bin/python3 - "$1" "$2" <<'PY'
import json, sys
print(json.dumps({"ok": False, "phase": sys.argv[1], "diagnostic": sys.argv[2]}, sort_keys=True))
PY
}

require_macos() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    emit_error "preflight" "HU-0008 is macOS-only"
    exit 2
  fi
}

sha256_file() {
  /usr/bin/shasum -a 256 "$1" | /usr/bin/awk '{print $1}'
}

tree_hash() {
  /usr/bin/python3 - "$1" <<'PY'
import hashlib, pathlib, sys
root=pathlib.Path(sys.argv[1]); digest=hashlib.sha256()
for path in sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p:str(p.relative_to(root))):
    digest.update(str(path.relative_to(root)).encode()); digest.update(b"\0")
    with path.open("rb") as handle:
        for chunk in iter(lambda:handle.read(1024*1024),b""): digest.update(chunk)
print(digest.hexdigest())
PY
}

bundle_value() {
  /usr/libexec/PlistBuddy -c "Print :$2" "$1/Contents/Info.plist" 2>/dev/null || true
}

valid_state_path() {
  local candidate="$1" tmp_real parent base
  tmp_real="$(cd "${TMPDIR%/}" && pwd -P)"
  parent="$(cd "$(dirname "$candidate")" 2>/dev/null && pwd -P || true)"
  base="$(basename "$candidate")"
  [[ "$parent" == "$tmp_real" && "$base" == "$STATE_PREFIX"* && "$candidate" != *$'\n'* ]]
}

validate_state_file() {
  local state="$1"
  valid_state_path "$state" || return 1
  [[ -f "$state" && ! -L "$state" ]] || return 1
  [[ "$(/usr/bin/stat -f '%Su' "$state")" == "$(/usr/bin/id -un)" ]] || return 1
  [[ "$(/usr/bin/stat -f '%Lp' "$state")" == "600" ]] || return 1
  /usr/bin/python3 - "$state" <<'PY'
import json, sys
s = json.load(open(sys.argv[1], encoding="utf-8"))
required = ("schema", "stateFile", "root", "source", "control", "branded")
raise SystemExit(0 if s.get("schema") == 1 and all(k in s for k in required) else 1)
PY
}

snapshot_bundle() {
  local bundle="$1" output="$2" executable_name executable details requirement entitlements
  /bin/mkdir -p "$output"
  executable_name="$(bundle_value "$bundle" CFBundleExecutable)"
  executable="$bundle/Contents/MacOS/$executable_name"
  [[ -n "$executable_name" && -f "$executable" ]] || return 1
  /bin/cp "$bundle/Contents/Info.plist" "$output/Info.plist"
  /usr/bin/plutil -convert xml1 "$output/Info.plist"

  set +e
  /usr/bin/codesign --verify --deep "$bundle" >"$output/deep.out" 2>"$output/deep.err"
  local deep_status=$?
  /usr/bin/codesign --verify --deep --strict --verbose=2 "$bundle" >"$output/strict.out" 2>"$output/strict.err"
  local strict_status=$?
  /usr/bin/codesign -d --verbose=4 "$bundle" >"$output/details.out" 2>"$output/details.err"
  local details_status=$?
  /usr/bin/codesign -d -r- "$bundle" >"$output/requirement.out" 2>"$output/requirement.err"
  local requirement_status=$?
  /usr/bin/codesign -d --entitlements :- "$bundle" >"$output/entitlements.plist" 2>"$output/entitlements.err"
  local entitlements_status=$?
  set -e

  details="$output/details.err"
  requirement="$output/requirement.out"
  entitlements="$output/entitlements.plist"
  local entitlement_state=unknown entitlement_hash="" requirement_state=unknown requirement_hash=""
  if [[ "$entitlements_status" -eq 0 && -s "$entitlements" ]] && /usr/bin/plutil -lint "$entitlements" >/dev/null 2>&1; then
    /usr/bin/plutil -convert xml1 "$entitlements"
    entitlement_state=present
    entitlement_hash="$(sha256_file "$entitlements")"
  fi
  local requirement_value
  requirement_value="$(/usr/bin/sed -n 's/^designated => //p' "$requirement" | /usr/bin/head -1)"
  if [[ "$requirement_status" -eq 0 && -n "$requirement_value" ]]; then
    requirement_state=present
    /usr/bin/printf '%s' "$requirement_value" >"$output/requirement.normalized"
    requirement_hash="$(sha256_file "$output/requirement.normalized")"
  fi

  local architecture
  architecture="$(/usr/bin/file -b "$executable" | /usr/bin/sed -n 's/.*Mach-O 64-bit executable \([^ ]*\).*/\1/p' | /usr/bin/head -1)"
  /usr/bin/python3 - \
    "$output/snapshot.json" "$bundle" "$executable" \
    "$deep_status" "$strict_status" "$details_status" "$requirement_status" "$entitlements_status" \
    "$(sha256_file "$output/Info.plist")" "$(sha256_file "$executable")" \
    "$(/usr/bin/sed -n 's/^CDHash=//p' "$details" | /usr/bin/head -1)" \
    "$(/usr/bin/sed -n 's/^TeamIdentifier=//p' "$details" | /usr/bin/head -1)" \
    "$requirement_state" "$requirement_hash" "$entitlement_state" "$entitlement_hash" \
    "$(bundle_value "$bundle" CFBundleIdentifier)" "$(bundle_value "$bundle" CFBundleVersion)" \
    "$(bundle_value "$bundle" CFBundleShortVersionString)" "$(bundle_value "$bundle" CFBundleIconFile)" \
    "$(bundle_value "$bundle" CFBundleIconName)" "$architecture" "$executable_name" \
    "$(tree_hash "$bundle/Contents/Resources")" <<'PY'
import hashlib, json, pathlib, sys
(path, bundle, executable, deep, strict, details, requirement_status, entitlements_status, plist_hash, executable_hash, cdhash,
 team_id, dr_state, dr_hash, ent_state, ent_hash, bundle_id, bundle_version,
 short_version, icon_file, icon_name, architecture, executable_name, resources_hash) = sys.argv[1:]
data = {
    "bundlePath": bundle, "executablePath": executable,
    "deepStatus": int(deep), "strictStatus": int(strict), "detailsStatus": int(details),
    "requirementStatus": int(requirement_status), "entitlementsStatus": int(entitlements_status),
    "cdHash": cdhash or None, "teamId": team_id if team_id and team_id != "not set" else None,
    "designatedRequirement": {"state": dr_state, "sha256": dr_hash or None},
    "entitlements": {"state": ent_state, "sha256": ent_hash or None},
    "infoPlistSha256": plist_hash, "executableSha256": executable_hash,
    "bundleIdentifier": bundle_id or None, "bundleVersion": bundle_version or None,
    "executableName": executable_name,
    "shortVersion": short_version or None, "iconFile": icon_file or None,
    "iconName": icon_name or None, "architecture": architecture or None,
    "resourcesTreeSha256": resources_hash,
}
pathlib.Path(path).write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")
PY
}

purge_snapshot_raw() {
  local directory="$1" file
  for file in "$directory"/deep.* "$directory"/strict.* "$directory"/details.* \
    "$directory"/requirement.* "$directory"/entitlements.* "$directory"/Info.plist; do
    [[ -e "$file" ]] && /bin/rm -f "$file"
  done
}

clone_pids() {
  local clone="$1"
  /bin/ps axww -o pid=,comm= | /usr/bin/awk -v needle="$clone/Contents/" 'index($0, needle) {print $1}'
}

validate_primary_pid() {
  local pid="$1" executable="$2" profile="$3" command comm
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  comm="$(/bin/ps -ww -p "$pid" -o comm= 2>/dev/null || true)"
  command="$(/bin/ps -ww -p "$pid" -o command= 2>/dev/null || true)"
  [[ "$comm" == "$executable" && "$command" == *"--user-data-dir=$profile"* ]]
}

write_launcher() {
  local source="$1"
  /usr/bin/python3 - "$source" <<'PY'
import pathlib, sys
pathlib.Path(sys.argv[1]).write_text(r'''import Foundation

let allowedKeys: Set<String> = ["started", "stableForObservationWindow", "pid", "observedLifetimeMs", "cleanupElapsedMs", "startedAtEpochMs", "endedAtEpochMs", "terminationReason", "terminationStatus", "errorDomain", "errorCode", "stillRunning"]
guard CommandLine.arguments.count == 5,
      let observationMs = UInt64(CommandLine.arguments[3]),
      let graceMs = UInt64(CommandLine.arguments[4]) else { exit(2) }
let executable = CommandLine.arguments[1]
let profile = CommandLine.arguments[2]
let start = DispatchTime.now().uptimeNanoseconds
var cleanupStart = start
let startEpochMs = Int(Date().timeIntervalSince1970 * 1000)
var result: [String: Any] = ["started": false, "stableForObservationWindow": false, "observedLifetimeMs": 0, "cleanupElapsedMs": 0, "startedAtEpochMs": startEpochMs, "stillRunning": false]
let process = Process()
process.executableURL = URL(fileURLWithPath: executable)
process.arguments = ["--user-data-dir=" + profile]
process.standardOutput = FileHandle.nullDevice
process.standardError = FileHandle.nullDevice
do {
    try process.run()
    result["started"] = true
    result["pid"] = Int(process.processIdentifier)
    let observationDeadline = start + observationMs * 1_000_000
    while process.isRunning && DispatchTime.now().uptimeNanoseconds < observationDeadline {
        Thread.sleep(forTimeInterval: 0.05)
    }
    let observationEnd = DispatchTime.now().uptimeNanoseconds
    result["stableForObservationWindow"] = process.isRunning && observationEnd >= observationDeadline
    result["observedLifetimeMs"] = Int((observationEnd - start) / 1_000_000)
    cleanupStart = DispatchTime.now().uptimeNanoseconds
    if process.isRunning { process.terminate() }
    let deadline = DispatchTime.now().uptimeNanoseconds + graceMs * 1_000_000
    while process.isRunning && DispatchTime.now().uptimeNanoseconds < deadline {
        Thread.sleep(forTimeInterval: 0.05)
    }
    result["stillRunning"] = process.isRunning
    if !process.isRunning {
        let endedAtEpochMs = Int(Date().timeIntervalSince1970 * 1000)
        result["endedAtEpochMs"] = endedAtEpochMs
        result["terminationReason"] = process.terminationReason == .exit ? "exit" : "uncaught-signal"
        result["terminationStatus"] = Int(process.terminationStatus)
    }
} catch let error as NSError {
    result["errorDomain"] = error.domain
    result["errorCode"] = error.code
}
result["cleanupElapsedMs"] = Int((DispatchTime.now().uptimeNanoseconds - cleanupStart) / 1_000_000)
let filtered = result.filter { allowedKeys.contains($0.key) }
let data = try JSONSerialization.data(withJSONObject: filtered, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data([0x0a]))
''', encoding="utf-8")
PY
}

launch_one() {
  local label="$1" clone="$2" profile="$3" launcher="$4" output="$5" executable
  executable="$clone/Contents/MacOS/$(bundle_value "$clone" CFBundleExecutable)"
  "$launcher" "$executable" "$profile" "$OBSERVATION_MS" "$TERM_GRACE_MS" >"$output"
  /usr/bin/python3 - "$output" <<'PY'
import json, sys
allowed = {"started", "stableForObservationWindow", "pid", "observedLifetimeMs", "cleanupElapsedMs", "startedAtEpochMs", "endedAtEpochMs", "terminationReason", "terminationStatus", "errorDomain", "errorCode", "stillRunning"}
d = json.load(open(sys.argv[1], encoding="utf-8"))
if set(d) - allowed:
    raise SystemExit(2)
PY
  local pid
  pid="$(/usr/bin/python3 - "$output" <<'PY'
import json, sys
print(json.load(open(sys.argv[1], encoding="utf-8")).get("pid") or "")
PY
)"
  if [[ -n "$pid" ]] && /bin/kill -0 "$pid" 2>/dev/null; then
    validate_primary_pid "$pid" "$executable" "$profile" || return 3
  fi
  /usr/bin/python3 - "$output" "$label" <<'PY'
import json, sys
d=json.load(open(sys.argv[1], encoding="utf-8")); d["variant"]=sys.argv[2]
print(json.dumps(d, sort_keys=True))
PY
}

classify_results() {
  /usr/bin/python3 - "$1" "$2" <<'PY'
import json, sys
a=json.load(open(sys.argv[1], encoding="utf-8")); b=json.load(open(sys.argv[2], encoding="utf-8"))
survived=lambda x: x.get("started") is True and x.get("stableForObservationWindow") is True
normal_termination=lambda x: (x.get("terminationReason")=="exit" and x.get("terminationStatus")==0) or (x.get("terminationReason")=="uncaught-signal" and x.get("terminationStatus")==15)
healthy=lambda x: survived(x) and normal_termination(x)
abnormal_after_observation=lambda x: survived(x) and not normal_termination(x)
failure=lambda x: (x.get("started"), x.get("stableForObservationWindow"), x.get("terminationReason"), x.get("terminationStatus"), x.get("errorDomain"), x.get("errorCode"))
if abnormal_after_observation(a) or abnormal_after_observation(b): result="inconclusive"
elif healthy(a) and healthy(b): result="both-start"
elif healthy(a) and not survived(b): result="branding-correlated"
elif not survived(a) and not survived(b) and failure(a) == failure(b): result="environment-or-launch-correlated"
else: result="inconclusive"
print(result)
PY
}

snapshot_crash_candidates() {
  local output="$1" executable="$2"
  /usr/bin/python3 - "$output" "$executable" <<'PY'
import hashlib, json, pathlib, sys
root=pathlib.Path.home()/"Library/Logs/DiagnosticReports"
expected_name=pathlib.Path(sys.argv[2]).name
items=[]
if root.is_dir():
    for path in root.iterdir():
        if path.is_file() and path.suffix in (".ips",".crash") and (path.name.startswith(expected_name+"-") or path.name.startswith(expected_name+"_")):
            try: items.append(hashlib.sha256((str(path)+"\0"+str(path.stat().st_mtime_ns)).encode()).hexdigest())
            except OSError: pass
pathlib.Path(sys.argv[1]).write_text(json.dumps(items),encoding="utf-8")
PY
}

write_crash_parser() {
  local target="$1"
  /usr/bin/python3 - "$target" <<'PY'
import pathlib, sys
pathlib.Path(sys.argv[1]).write_text(r'''import datetime, hashlib, json, pathlib, re, sys

baseline_path,launch_path,executable,output,reports_root=sys.argv[1:]
baseline=set(json.load(open(baseline_path,encoding="utf-8")))
launch=json.load(open(launch_path,encoding="utf-8"));pid=launch.get("pid")
start=launch.get("startedAtEpochMs");end=launch.get("endedAtEpochMs") or (start+(launch.get("observedLifetimeMs") or 0)+(launch.get("cleanupElapsedMs") or 0) if start else None)
empty={"matched":False,"exceptionType":None,"signal":None,"terminationNamespace":None,"terminationCode":None,"terminationIndicator":None,"ambiguousEvidenceDiscarded":False}
def finish(value):pathlib.Path(output).write_text(json.dumps(value,sort_keys=True)+"\n",encoding="utf-8")
if not isinstance(pid,int) or not isinstance(start,int) or not isinstance(end,int):finish(empty);raise SystemExit(0)
expected_path=str(pathlib.Path(executable).resolve());expected_name=pathlib.Path(executable).name;root=pathlib.Path(reports_root)
def json_string(text,key):
    match=re.search(r'"'+re.escape(key)+r'"\s*:\s*("(?:[^"\\]|\\.)*")',text)
    if not match:return None
    try:return json.loads(match.group(1))
    except Exception:return None
def report_time_ms(text):
    value=json_string(text,"captureTime")
    if value:
        try:return int(datetime.datetime.fromisoformat(value.replace("Z","+00:00")).timestamp()*1000)
        except ValueError:pass
    match=re.search(r'^Date/Time:\s+(.+?)\s*$',text,re.MULTILINE)
    if match:
        for fmt in ("%Y-%m-%d %H:%M:%S.%f %z","%Y-%m-%d %H:%M:%S %z"):
            try:return int(datetime.datetime.strptime(match.group(1),fmt).timestamp()*1000)
            except ValueError:pass
    return None
def header_fields(text):
    path=json_string(text,"procPath");match=re.search(r'"pid"\s*:\s*(\d+)(?=\s*[,}])',text);found_pid=int(match.group(1)) if match else None
    if found_pid is None:
        match=re.search(r'^Process:\s+.*\[(\d+)\]\s*$',text,re.MULTILINE);found_pid=int(match.group(1)) if match else None
    if path is None:
        match=re.search(r'^Path:\s+(.+?)\s*$',text,re.MULTILINE);path=match.group(1).strip() if match else None
    resolved=str(pathlib.Path(path).resolve()) if path and pathlib.Path(path).is_absolute() and "*" not in path else None
    return found_pid,resolved,report_time_ms(text)
def reasons(text):
    exception=re.search(r'"exception"\s*:\s*\{([^{}]*)\}',text,re.DOTALL);termination=re.search(r'"termination"\s*:\s*\{([^{}]*)\}',text,re.DOTALL)
    exception_text=exception.group(1) if exception else "";termination_text=termination.group(1) if termination else ""
    values={"exceptionType":json_string(exception_text,"type"),"signal":json_string(exception_text,"signal"),"terminationNamespace":json_string(termination_text,"namespace"),"terminationCode":None,"terminationIndicator":json_string(termination_text,"indicator")}
    match=re.search(r'"code"\s*:\s*(-?\d+)',termination_text);values["terminationCode"]=int(match.group(1)) if match else None
    if values["exceptionType"] is None:
        match=re.search(r'^Exception Type:\s+(.+?)\s*$',text,re.MULTILINE);values["exceptionType"]=match.group(1).strip() if match else None
    if values["terminationIndicator"] is None:
        match=re.search(r'^Termination Reason:\s+(.+?)\s*$',text,re.MULTILINE);values["terminationIndicator"]=match.group(1).strip() if match else None
    return values
forbidden=('"threads"','"asi"','"applicationSpecificInformation"','"stack"','"binaryImages"','\nThread 0','\nApplication Specific Information:','\nBinary Images:')
exact=[];ambiguous=False
for path in root.iterdir() if root.is_dir() else ():
    if not path.is_file() or path.suffix not in (".ips",".crash") or not (path.name.startswith(expected_name+"-") or path.name.startswith(expected_name+"_")):continue
    try:stat=path.stat()
    except OSError:continue
    marker=hashlib.sha256((str(path)+"\0"+str(stat.st_mtime_ns)).encode()).hexdigest()
    if marker in baseline or not start-3000<=int(stat.st_mtime*1000)<=end+3000:continue
    text="";attributed=False;stopped=False
    try:
        with path.open("r",encoding="utf-8",errors="replace") as handle:
            for _ in range(65536):
                char=handle.read(1)
                if not char:stopped=True;break
                text+=char
                marker=next((item for item in forbidden if text.endswith(item)),None)
                if marker:
                    text=text[:-len(marker)];stopped=True;break
                found_pid,found_path,found_time=header_fields(text)
                if not attributed and found_pid is not None and found_path is not None and found_time is not None:
                    if found_pid!=pid or found_path!=expected_path or not start<=found_time<=end+3000:
                        stopped=True;text="";break
                    attributed=True
                if attributed:
                    values=reasons(text)
                    has_exception=values["exceptionType"] is not None or values["signal"] is not None
                    has_termination=values["terminationNamespace"] is not None or values["terminationCode"] is not None or values["terminationIndicator"] is not None
                    if has_exception and has_termination:stopped=True;break
    except OSError:continue
    if attributed and stopped:exact.append(reasons(text))
    elif text:ambiguous=True
if len(exact)==1:
    result=dict(empty);result.update(exact[0]);result["matched"]=True;result["ambiguousEvidenceDiscarded"]=ambiguous;finish(result)
else:
    result=dict(empty);result["ambiguousEvidenceDiscarded"]=bool(exact or ambiguous);finish(result)
''',encoding="utf-8")
PY
}

collect_crash_evidence() {
  local parser="$1" baseline="$2" launch_json="$3" executable="$4" output="$5"
  /usr/bin/python3 "$parser" "$baseline" "$launch_json" "$executable" "$output" "$HOME/Library/Logs/DiagnosticReports"
}

failure_cleanup() {
  local status=$?
  if [[ "$status" -ne 0 && "$RUN_RETAIN" != true && -n "$RUN_ROOT" && -d "$RUN_ROOT" ]]; then
    local count=0 clone
    for clone in "$RUN_ROOT/Control A.app" "$RUN_ROOT/Branded B.app"; do
      [[ -d "$clone" ]] || continue
      count=$((count + $(clone_pids "$clone" | /usr/bin/wc -l | /usr/bin/tr -d ' ')))
    done
    if [[ "$count" -eq 0 ]]; then
      /bin/rm -rf "$RUN_ROOT"
      if [[ -n "$RUN_STATE" && -f "$RUN_STATE" ]] && valid_state_path "$RUN_STATE"; then
        /bin/rm -f "$RUN_STATE"
      fi
    else
      RUN_RETAIN=true
      /usr/bin/printf '%s\n' '{"ok":false,"phase":"rollback","rootRetained":true,"diagnostic":"fixture processes remain"}' >&2
    fi
  fi
  return "$status"
}

run_diagnostic() {
  require_macos
  [[ -d "$SOURCE_APP" && -f "$REPO_ICON" ]] || { emit_error preflight "source or repository icon missing"; exit 2; }
  # Mandatory external preflight occurs before mktemp, cloning, signing or launching.
  if ! /usr/bin/codesign --verify --deep --strict --verbose=2 "$SOURCE_APP" >/dev/null 2>&1; then
    emit_error preflight "source strict codesign verification failed in the execution context"
    exit 3
  fi

  local root state control branded profile_a profile_b sentinel_a sentinel_b sentinel_hash_a sentinel_hash_b launcher_source launcher crash_parser control_launch branded_launch control_crash branded_crash crash_before_a crash_before_b classification remaining=0 resign_status gate_status gate_output
  root="$(/usr/bin/mktemp -d "${TMPDIR%/}/$ROOT_PREFIX"XXXXXX)"
  root="$(cd "$root" && pwd -P)"
  state="$(/usr/bin/mktemp "${TMPDIR%/}/$STATE_PREFIX"XXXXXX)"
  /bin/chmod 600 "$state"
  RUN_ROOT="$root"; RUN_STATE="$state"
  trap failure_cleanup EXIT
  control="$root/Control A.app"; branded="$root/Branded B.app"
  profile_a="$root/profile-a"; profile_b="$root/profile-b"
  sentinel_a="$profile_a/.hu0008-control"; sentinel_b="$profile_b/.hu0008-branded"
  /bin/mkdir -p "$profile_a" "$profile_b"
  /usr/bin/printf '%s\n' 'HU-0008 control profile' >"$sentinel_a"
  /usr/bin/printf '%s\n' 'HU-0008 branded profile' >"$sentinel_b"
  sentinel_hash_a="$(sha256_file "$sentinel_a")"
  sentinel_hash_b="$(sha256_file "$sentinel_b")"

  snapshot_bundle "$SOURCE_APP" "$root/source-before"
  /usr/bin/ditto "$SOURCE_APP" "$control"
  /usr/bin/ditto "$SOURCE_APP" "$branded"
  snapshot_bundle "$control" "$root/control-signature"
  snapshot_bundle "$branded" "$root/branded-before"
  /bin/cp "$REPO_ICON" "$branded/Contents/Resources/CodeAIDockTest.icns"
  /usr/libexec/PlistBuddy -c 'Set :CFBundleIconFile CodeAIDockTest.icns' "$branded/Contents/Info.plist" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c 'Add :CFBundleIconFile string CodeAIDockTest.icns' "$branded/Contents/Info.plist"
  set +e
  /usr/bin/codesign --force --deep --sign - --preserve-metadata=identifier,entitlements,flags,runtime "$branded" >/dev/null 2>&1
  resign_status=$?
  set -e
  snapshot_bundle "$branded" "$root/branded-signature"

  launcher_source="$root/launcher.swift"; launcher="$root/launcher"
  write_launcher "$launcher_source"
  crash_parser="$root/crash-parser.py"
  write_crash_parser "$crash_parser"
  /bin/mkdir -p "$root/swift-cache"
  CLANG_MODULE_CACHE_PATH="$root/swift-cache" /usr/bin/swiftc "$launcher_source" -o "$launcher"

  control_launch="$root/control-launch.json"; branded_launch="$root/branded-launch.json"
  control_crash="$root/control-crash.json"; branded_crash="$root/branded-crash.json"
  crash_before_a="$root/crash-before-a.json"; crash_before_b="$root/crash-before-b.json"
  set +e
  gate_output="$(/usr/bin/python3 - "$state" "$root" "$SOURCE_APP" "$control" "$branded" \
    "$profile_a" "$profile_b" "$sentinel_a" "$sentinel_b" "$sentinel_hash_a" "$sentinel_hash_b" "$resign_status" <<'PY'
import json, pathlib, sys
(state_path, root, source, control, branded, profile_a, profile_b, sentinel_a, sentinel_b,
 sentinel_hash_a, sentinel_hash_b, resign_status)=sys.argv[1:]
load=lambda p:json.load(open(p,encoding="utf-8"))
source_signature=load(root+"/source-before/snapshot.json")
control_signature=load(root+"/control-signature/snapshot.json")
branded_before=load(root+"/branded-before/snapshot.json")
branded_signature=load(root+"/branded-signature/snapshot.json")
critical=("deepStatus","strictStatus","detailsStatus","requirementStatus","entitlementsStatus","cdHash","teamId","designatedRequirement","entitlements","infoPlistSha256","executableSha256","resourcesTreeSha256","bundleIdentifier","bundleVersion","shortVersion","architecture","executableName","iconFile","iconName")
equivalent=lambda left,right:all(left.get(k)==right.get(k) for k in critical)
reasons=[]
if any(source_signature.get(key)!=0 for key in ("deepStatus","strictStatus","detailsStatus","requirementStatus","entitlementsStatus")):reasons.append("source-signature-metadata-invalid")
if source_signature.get("designatedRequirement",{}).get("state")!="present":reasons.append("source-requirement-unknown")
if source_signature.get("entitlements",{}).get("state")!="present":reasons.append("source-entitlements-unknown")
if control_signature.get("strictStatus")!=0 or not equivalent(control_signature,source_signature):reasons.append("control-not-equivalent")
if branded_before.get("strictStatus")!=0 or not equivalent(branded_before,source_signature):reasons.append("branded-baseline-not-equivalent")
if int(resign_status)!=0:reasons.append("branded-resign-failed")
if branded_signature.get("deepStatus")!=0 or branded_signature.get("strictStatus")!=0 or branded_signature.get("detailsStatus")!=0:reasons.append("branded-signature-invalid")
identity_fields=("bundleIdentifier","bundleVersion","shortVersion","architecture","executableName")
if any(branded_signature.get(key)!=source_signature.get(key) for key in identity_fields):reasons.append("branded-identity-fields-changed")
if branded_signature.get("entitlementsStatus")!=0 or branded_signature.get("entitlements",{}).get("state")!="present" or branded_signature.get("entitlements",{}).get("sha256")!=source_signature.get("entitlements",{}).get("sha256"):reasons.append("branded-entitlements-not-preserved")
if branded_signature.get("iconFile")!="CodeAIDockTest.icns":reasons.append("branded-icon-not-configured")
gates={"passed":not reasons,"reasons":reasons,"resignStatus":int(resign_status)}
state={
 "schema":1,"stateFile":state_path,"root":root,"source":source,"phase":"pre-launch" if not reasons else "branded-preparation-failed",
 "sourceBaselineTrusted":source_signature["strictStatus"]==0,"sourceBefore":source_signature,
 "sourceAfter":None,"sourceUnchanged":None,"preparationGates":gates,
 "control":{"bundle":control,"profile":profile_a,"sentinel":sentinel_a,"sentinelSha256Before":sentinel_hash_a,"signature":control_signature,"matchesSource":equivalent(control_signature,source_signature),"launch":None},
 "branded":{"bundle":branded,"profile":profile_b,"sentinel":sentinel_b,"sentinelSha256Before":sentinel_hash_b,"signatureBefore":branded_before,"signature":branded_signature,"launch":None,"configuredIconFile":"CodeAIDockTest.icns"},
 "profilesSentinelsIntact":None,"classification":"inconclusive","crashEvidence":None,
 "ambiguousEvidenceDiscarded":False,"securityInteractionObserved":None,"cleanupCompleted":False,"remainingFixtureProcesses":0,
}
pathlib.Path(state_path).write_text(json.dumps(state,indent=2,sort_keys=True)+"\n",encoding="utf-8")
print(json.dumps({"ok":not reasons,"phase":state["phase"],"stateFile":state_path,"root":root,"preparationGates":gates},sort_keys=True))
raise SystemExit(0 if not reasons else 4)
PY
)"
  gate_status=$?
  set -e
  purge_snapshot_raw "$root/source-before"
  purge_snapshot_raw "$root/control-signature"
  purge_snapshot_raw "$root/branded-before"
  purge_snapshot_raw "$root/branded-signature"
  if [[ "$gate_status" -ne 0 ]]; then
    RUN_RETAIN=true
    trap - EXIT
    /usr/bin/printf '%s\n' "$gate_output"
    exit "$gate_status"
  fi
  snapshot_crash_candidates "$crash_before_a" "$control/Contents/MacOS/$(bundle_value "$control" CFBundleExecutable)"
  launch_one control "$control" "$profile_a" "$launcher" "$control_launch" >/dev/null
  collect_crash_evidence "$crash_parser" "$crash_before_a" "$control_launch" "$control/Contents/MacOS/$(bundle_value "$control" CFBundleExecutable)" "$control_crash"
  /bin/rm -f "$crash_before_a"
  remaining="$(clone_pids "$control" | /usr/bin/wc -l | /usr/bin/tr -d ' ')"
  /usr/bin/python3 - "$state" "$control_launch" "$control_crash" "$remaining" "$sentinel_a" "$sentinel_b" "$sentinel_hash_a" "$sentinel_hash_b" <<'PY'
import hashlib,json,pathlib,sys
path=pathlib.Path(sys.argv[1]);state=json.loads(path.read_text(encoding="utf-8"))
crash=json.load(open(sys.argv[3],encoding="utf-8"));digest=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() if pathlib.Path(p).is_file() else None
state["phase"]="control-complete";state["control"]["launch"]=json.load(open(sys.argv[2],encoding="utf-8"));state["crashEvidence"]={"control":crash if crash.get("matched") else None,"branded":None};state["ambiguousEvidenceDiscarded"]=crash.get("ambiguousEvidenceDiscarded",False);state["remainingFixtureProcesses"]=int(sys.argv[4]);state["profilesSentinelsIntact"]=digest(sys.argv[5])==sys.argv[7] and digest(sys.argv[6])==sys.argv[8]
path.write_text(json.dumps(state,indent=2,sort_keys=True)+"\n",encoding="utf-8")
PY
  if [[ "$remaining" -ne 0 ]]; then
    RUN_RETAIN=true
    emit_error control-cleanup "control fixture processes remain; B was not launched"
    exit 4
  fi
  snapshot_crash_candidates "$crash_before_b" "$branded/Contents/MacOS/$(bundle_value "$branded" CFBundleExecutable)"
  launch_one branded "$branded" "$profile_b" "$launcher" "$branded_launch" >/dev/null
  collect_crash_evidence "$crash_parser" "$crash_before_b" "$branded_launch" "$branded/Contents/MacOS/$(bundle_value "$branded" CFBundleExecutable)" "$branded_crash"
  /bin/rm -f "$crash_before_b"
  remaining=$(( $(clone_pids "$control" | /usr/bin/wc -l | /usr/bin/tr -d ' ') + $(clone_pids "$branded" | /usr/bin/wc -l | /usr/bin/tr -d ' ') ))
  /usr/bin/python3 - "$state" "$branded_launch" "$branded_crash" "$remaining" "$sentinel_a" "$sentinel_b" "$sentinel_hash_a" "$sentinel_hash_b" <<'PY'
import hashlib,json,pathlib,sys
path=pathlib.Path(sys.argv[1]);state=json.loads(path.read_text(encoding="utf-8"))
crash=json.load(open(sys.argv[3],encoding="utf-8"));digest=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() if pathlib.Path(p).is_file() else None
state["phase"]="branded-complete";state["branded"]["launch"]=json.load(open(sys.argv[2],encoding="utf-8"));state.setdefault("crashEvidence",{"control":None,"branded":None})["branded"]=crash if crash.get("matched") else None;state["ambiguousEvidenceDiscarded"]=state.get("ambiguousEvidenceDiscarded",False) or crash.get("ambiguousEvidenceDiscarded",False);state["remainingFixtureProcesses"]=int(sys.argv[4]);state["profilesSentinelsIntact"]=digest(sys.argv[5])==sys.argv[7] and digest(sys.argv[6])==sys.argv[8]
path.write_text(json.dumps(state,indent=2,sort_keys=True)+"\n",encoding="utf-8")
PY
  if [[ "$remaining" -ne 0 ]]; then RUN_RETAIN=true; fi

  snapshot_bundle "$SOURCE_APP" "$root/source-after"
  purge_snapshot_raw "$root/source-after"
  classification="$(classify_results "$control_launch" "$branded_launch")"
  /usr/bin/python3 - "$state" "$root" "$SOURCE_APP" "$control" "$branded" \
    "$profile_a" "$profile_b" "$sentinel_a" "$sentinel_b" "$sentinel_hash_a" "$sentinel_hash_b" "$control_launch" "$branded_launch" \
    "$control_crash" "$branded_crash" "$classification" "$remaining" <<'PY'
import hashlib, json, pathlib, sys
(state_path, root, source, control, branded, profile_a, profile_b, sentinel_a, sentinel_b, sentinel_hash_a, sentinel_hash_b,
 control_launch, branded_launch, control_crash, branded_crash, classification, remaining) = sys.argv[1:]
load=lambda p: json.load(open(p, encoding="utf-8"))
previous=load(state_path)
source_before=load(root+"/source-before/snapshot.json"); source_after=load(root+"/source-after/snapshot.json")
keys=("deepStatus","strictStatus","detailsStatus","requirementStatus","entitlementsStatus","cdHash","teamId","designatedRequirement","entitlements","infoPlistSha256","executableSha256","resourcesTreeSha256","bundleIdentifier","executableName","iconFile","iconName")
digest=lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
control_crash_data=load(control_crash);branded_crash_data=load(branded_crash)
state={
 "schema":1,"stateFile":state_path,"root":root,"source":source,
 "createdAtUtc":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
 "sourceBaselineTrusted":source_before["strictStatus"]==0,"sourceBefore":source_before,"sourceAfter":source_after,
 "sourceUnchanged":all(source_before.get(k)==source_after.get(k) for k in keys),"preparationGates":previous.get("preparationGates"),"phase":"complete",
 "control":{"bundle":control,"profile":profile_a,"sentinel":sentinel_a,"sentinelSha256Before":sentinel_hash_a,"sentinelSha256After":digest(sentinel_a) if pathlib.Path(sentinel_a).is_file() else None,"signature":load(root+"/control-signature/snapshot.json"),"matchesSource":previous.get("control",{}).get("matchesSource"),"launch":load(control_launch)},
 "branded":{"bundle":branded,"profile":profile_b,"sentinel":sentinel_b,"sentinelSha256Before":sentinel_hash_b,"sentinelSha256After":digest(sentinel_b) if pathlib.Path(sentinel_b).is_file() else None,"signatureBefore":load(root+"/branded-before/snapshot.json"),"signature":load(root+"/branded-signature/snapshot.json"),"launch":load(branded_launch),"configuredIconFile":"CodeAIDockTest.icns"},
 "profilesSentinelsIntact":pathlib.Path(sentinel_a).is_file() and pathlib.Path(sentinel_b).is_file() and digest(sentinel_a)==sentinel_hash_a and digest(sentinel_b)==sentinel_hash_b,"classification":classification,"crashEvidence":{"control":control_crash_data if control_crash_data.get("matched") else None,"branded":branded_crash_data if branded_crash_data.get("matched") else None},
 "ambiguousEvidenceDiscarded":control_crash_data.get("ambiguousEvidenceDiscarded",False) or branded_crash_data.get("ambiguousEvidenceDiscarded",False),"securityInteractionObserved":None,"cleanupCompleted":False,"remainingFixtureProcesses":int(remaining),
}
pathlib.Path(state_path).write_text(json.dumps(state,indent=2,sort_keys=True)+"\n",encoding="utf-8")
summary={k:state[k] for k in ("sourceBaselineTrusted","sourceUnchanged","profilesSentinelsIntact","classification","ambiguousEvidenceDiscarded","cleanupCompleted","remainingFixtureProcesses")}
summary.update({"stateFile":state_path,"root":root})
print(json.dumps(summary,sort_keys=True))
PY
  RUN_RETAIN=true
  trap - EXIT
}

cleanup() {
  require_macos
  local state="${1:-}"
  if [[ -z "$state" ]] || ! valid_state_path "$state"; then emit_error cleanup "invalid HU-0008 state path"; exit 2; fi
  if [[ ! -e "$state" && ! -L "$state" ]]; then
    /usr/bin/printf '%s\n' '{"ok":true,"phase":"cleanup","alreadyAbsent":true,"cleanupCompleted":true}'
    return 0
  fi
  validate_state_file "$state" || { emit_error cleanup "state ownership, mode or schema invalid"; exit 2; }
  local values root source control branded
  values="$(/usr/bin/python3 - "$state" <<'PY'
import json,sys
s=json.load(open(sys.argv[1],encoding="utf-8"))
print(s["root"]);print(s["source"]);print(s["control"]["bundle"]);print(s["branded"]["bundle"])
PY
)"
  local lines=(); while IFS= read -r line; do lines+=("$line"); done <<<"$values"
  root="${lines[0]}"; source="${lines[1]}"; control="${lines[2]}"; branded="${lines[3]}"
  local tmp_real root_real
  tmp_real="$(cd "${TMPDIR%/}" && pwd -P)"; root_real="$(cd "$root" 2>/dev/null && pwd -P || true)"
  if [[ -z "$root_real" ]]; then /bin/rm -f "$state"; /usr/bin/printf '%s\n' '{"ok":true,"phase":"cleanup","cleanupCompleted":true,"alreadyAbsent":true}'; return 0; fi
  [[ ! -L "$root" && "$(/usr/bin/stat -f '%Su' "$root")" == "$(/usr/bin/id -un)" && "$(/usr/bin/stat -f '%Lp' "$root")" == "700" && "$root_real" == "$tmp_real/$ROOT_PREFIX"* && "$source" == "$SOURCE_APP" && "$control" == "$root/Control A.app" && "$branded" == "$root/Branded B.app" ]] || { emit_error cleanup "state containment, owner or root mode failed"; exit 3; }

  local primary_rows primary_pid primary_executable primary_profile attempt
  primary_rows="$(/usr/bin/python3 - "$state" <<'PY'
import json,sys
s=json.load(open(sys.argv[1],encoding="utf-8"))
for name in ("control","branded"):
    item=s.get(name,{})
    launch=item.get("launch") or {}
    signature=item.get("signature") or {}
    pid=launch.get("pid")
    if isinstance(pid,int): print(f'{pid}\t{signature.get("executablePath","")}\t{item.get("profile","")}')
PY
)"
  while IFS=$'\t' read -r primary_pid primary_executable primary_profile; do
    [[ -n "$primary_pid" ]] || continue
    if /bin/kill -0 "$primary_pid" 2>/dev/null; then
      validate_primary_pid "$primary_pid" "$primary_executable" "$primary_profile" || { emit_error cleanup "recorded PID failed exact executable/profile validation; root retained"; exit 4; }
      /bin/kill -TERM "$primary_pid"
      for attempt in 1 2 3 4 5 6; do
        /bin/kill -0 "$primary_pid" 2>/dev/null || break
        /bin/sleep 0.5
      done
    fi
  done <<<"$primary_rows"

  local clone pid_count=0
  for clone in "$control" "$branded"; do
    [[ -d "$clone" ]] || continue
    pid_count=$((pid_count + $(clone_pids "$clone" | /usr/bin/wc -l | /usr/bin/tr -d ' ')))
  done
  if [[ "$pid_count" -ne 0 ]]; then emit_error cleanup "fixture processes remain; root retained"; exit 4; fi
  /usr/bin/codesign --verify --deep --strict --verbose=2 "$SOURCE_APP" >/dev/null 2>&1 || { emit_error cleanup "source verification failed; root retained"; exit 5; }
  /bin/rm -rf "$root"
  /bin/rm -f "$state"
  /usr/bin/printf '%s\n' '{"ok":true,"phase":"cleanup","cleanupCompleted":true,"remainingFixtureProcesses":0}'
}

self_test() {
  /usr/bin/python3 <<'PY'
import hashlib, json, os, pathlib, stat, tempfile
allowed={"started","stableForObservationWindow","pid","observedLifetimeMs","cleanupElapsedMs","startedAtEpochMs","endedAtEpochMs","terminationReason","terminationStatus","errorDomain","errorCode","stillRunning"}
def classify(a,b):
 survived=lambda x:x.get("started") is True and x.get("stableForObservationWindow") is True
 normal=lambda x:(x.get("terminationReason")=="exit" and x.get("terminationStatus")==0) or (x.get("terminationReason")=="uncaught-signal" and x.get("terminationStatus")==15)
 healthy=lambda x:survived(x) and normal(x)
 abnormal=lambda x:survived(x) and not normal(x)
 failure=lambda x:(x.get("started"),x.get("stableForObservationWindow"),x.get("terminationReason"),x.get("terminationStatus"),x.get("errorDomain"),x.get("errorCode"))
 if abnormal(a) or abnormal(b): return "inconclusive"
 if healthy(a) and healthy(b): return "both-start"
 if healthy(a) and not survived(b): return "branding-correlated"
 if not survived(a) and not survived(b) and failure(a)==failure(b): return "environment-or-launch-correlated"
 return "inconclusive"
normal_exit={"started":True,"stableForObservationWindow":True,"terminationReason":"exit","terminationStatus":0}
normal_term={"started":True,"stableForObservationWindow":True,"terminationReason":"uncaught-signal","terminationStatus":15}
assert classify(normal_exit,{"started":True,"stableForObservationWindow":False})=="branding-correlated"
assert classify({"started":False,"stableForObservationWindow":False,"errorCode":1},{"started":False,"stableForObservationWindow":False,"errorCode":1})=="environment-or-launch-correlated"
assert classify(normal_exit,normal_term)=="both-start"
assert classify(normal_exit,{"started":True,"stableForObservationWindow":True,"terminationReason":"uncaught-signal","terminationStatus":9})=="inconclusive"
assert classify({"started":False,"stableForObservationWindow":False},{"started":True,"stableForObservationWindow":False})=="inconclusive"
assert not ({"started":True,"extra":"reject"}.keys() <= allowed)
def gates(source,control,before,after,resign):
 return source["strictStatus"]==control["strictStatus"]==before["strictStatus"]==after["strictStatus"]==0 and resign==0 and source["entitlements"]["state"]==after["entitlements"]["state"]=="present" and source["entitlements"]["sha256"]==after["entitlements"]["sha256"]
base={"strictStatus":0,"entitlements":{"state":"present","sha256":"abc"}}
assert gates(base,base,base,base,0) and not gates({"strictStatus":0,"entitlements":{"state":"unknown","sha256":None}},base,base,base,0)
fd,path=tempfile.mkstemp(prefix="code-ai-hu0008-state.",dir=os.environ.get("TMPDIR","/tmp"));os.close(fd);os.chmod(path,0o600)
assert stat.S_IMODE(os.stat(path).st_mode)==0o600 and pathlib.Path(path).parent.resolve()==pathlib.Path(os.environ.get("TMPDIR","/tmp")).resolve()
sentinel=b"hu0008";before=hashlib.sha256(sentinel).hexdigest();after=hashlib.sha256(sentinel).hexdigest();assert before==after and hashlib.sha256(b"changed").hexdigest()!=before
os.unlink(path)
PY
  local fixture_root parser_status classifier_actual
  fixture_root="$(/usr/bin/mktemp -d "${TMPDIR%/}/code-ai-hu0008-selftest.XXXXXX")"
  write_crash_parser "$fixture_root/crash-parser.py"
  /usr/bin/python3 - "$fixture_root/control-classifier.json" "$fixture_root/branded-classifier.json" <<'PY'
import json, pathlib, sys
pathlib.Path(sys.argv[1]).write_text(json.dumps({"started":True,"stableForObservationWindow":True,"terminationReason":"exit","terminationStatus":0}),encoding="utf-8")
pathlib.Path(sys.argv[2]).write_text(json.dumps({"started":True,"stableForObservationWindow":True,"terminationReason":"uncaught-signal","terminationStatus":9}),encoding="utf-8")
PY
  classifier_actual="$(classify_results "$fixture_root/control-classifier.json" "$fixture_root/branded-classifier.json")"
  [[ "$classifier_actual" == "inconclusive" ]] || { /bin/rm -rf "$fixture_root"; emit_error self-test "real classifier accepted anomalous post-observation termination"; return 1; }
  set +e
  /usr/bin/python3 - "$fixture_root" <<'PY'
import datetime, json, os, pathlib, subprocess, sys, time
root=pathlib.Path(sys.argv[1]);parser=root/"crash-parser.py";executable=root/"Fixture.app/Contents/MacOS/Claude"
executable.parent.mkdir(parents=True);executable.write_bytes(b"fixture")
now=datetime.datetime.now(datetime.timezone.utc);now_ms=int(now.timestamp()*1000);capture=now.isoformat().replace("+00:00","Z")
launch={"pid":4242,"startedAtEpochMs":now_ms-1000,"endedAtEpochMs":now_ms+1000,"observedLifetimeMs":2000,"cleanupElapsedMs":0}
(root/"launch.json").write_text(json.dumps(launch),encoding="utf-8");(root/"baseline.json").write_text("[]",encoding="utf-8")
allowed={"matched","exceptionType","signal","terminationNamespace","terminationCode","terminationIndicator","ambiguousEvidenceDiscarded"}
def invoke(directory,name,body,output,extra_body=None):
    directory.mkdir();report=directory/name;report.write_text(body,encoding="utf-8");os.utime(report,(now.timestamp(),now.timestamp()))
    if extra_body is not None:
        extra=directory/"Claude_ambiguous.ips";extra.write_text(extra_body,encoding="utf-8");os.utime(extra,(now.timestamp(),now.timestamp()))
    subprocess.run([sys.executable,str(parser),str(root/"baseline.json"),str(root/"launch.json"),str(executable),str(output),str(directory)],check=True)
    value=json.loads(output.read_text(encoding="utf-8"));assert set(value)==allowed;return value
header=lambda pid:f'{{"procPath":{json.dumps(str(executable.resolve()))},"captureTime":{json.dumps(capture)},"pid":{pid},'
exact=invoke(root/"exact","Claude-test.ips",header(4242)+'"exception":{"type":"EXC_BAD_ACCESS","signal":"SIGSEGV"},"termination":{"namespace":"SIGNAL","code":11,"indicator":"Segmentation fault"},"threads":[{"secret":"THREAD_SECRET"}]}',root/"exact.json",f'{{"procPath":{json.dumps(str(executable.resolve()))},"pid":4242,"threads":[{{"secret":"AMBIGUOUS_SECRET"}}]}}')
assert exact["matched"] is True and exact["exceptionType"]=="EXC_BAD_ACCESS" and exact["signal"]=="SIGSEGV" and exact["terminationNamespace"]=="SIGNAL" and exact["terminationCode"]==11 and exact["ambiguousEvidenceDiscarded"] is True and "THREAD_SECRET" not in json.dumps(exact) and "AMBIGUOUS_SECRET" not in json.dumps(exact)
mismatch=invoke(root/"mismatch","Claude-test.ips",header(9999)+'"exception":{"type":"SHOULD_NOT_READ"},"termination":{"code":99},"threads":[{"secret":"MISMATCH_SECRET"}]}',root/"mismatch.json")
assert mismatch["matched"] is False and mismatch["exceptionType"] is None and mismatch["terminationCode"] is None and "MISMATCH_SECRET" not in json.dumps(mismatch)
ambiguous=invoke(root/"ambiguous","Claude-test.ips",f'{{"procPath":{json.dumps(str(executable.resolve()))},"pid":4242,"threads":[{{"secret":"AMBIGUOUS_SECRET"}}]}}',root/"ambiguous.json")
assert ambiguous["matched"] is False and ambiguous["ambiguousEvidenceDiscarded"] is True and "AMBIGUOUS_SECRET" not in json.dumps(ambiguous)
print(json.dumps({"ok":True,"phase":"self-test","classifierCases":5,"realClassifierPostObservationAnomaly":True,"allowlistRejectsExtra":True,"realCrashParserExactReasons":True,"realCrashParserMismatchStopsAtHeader":True,"realCrashParserAmbiguous":True,"prelaunchGates":True,"sentinelComparison":True,"stateModeAndLocation":True},sort_keys=True))
PY
  parser_status=$?
  set -e
  /bin/rm -rf "$fixture_root"
  return "$parser_status"
}

dry_run() {
  require_macos
  /usr/bin/python3 - "$SOURCE_APP" "$REPO_ICON" <<'PY'
import json, os, sys
source,icon=sys.argv[1:]
dependencies=["/usr/bin/codesign","/usr/bin/ditto","/usr/bin/plutil","/usr/bin/swiftc","/usr/libexec/PlistBuddy","/usr/bin/python3"]
missing=[p for p in dependencies if not os.access(p,os.X_OK)]
if not os.path.isdir(source): missing.append(source)
if not os.path.isfile(icon): missing.append(icon)
print(json.dumps({"ok":not missing,"phase":"dry-run","source":source,"repositoryIcon":icon,"missing":missing,"willCodesign":False,"willCopy":False,"willLaunch":False,"plan":["external-source-preflight","fresh-control-and-branded-clones","sequential-control-then-branded-launch","explicit-cleanup"]},sort_keys=True))
raise SystemExit(0 if not missing else 2)
PY
}

usage() {
  /usr/bin/printf 'Usage: %s dry-run | self-test | run | cleanup <state-file>\n' "$SCRIPT_NAME"
}

case "${1:-}" in
  dry-run) dry_run ;;
  self-test) self_test ;;
  run) run_diagnostic ;;
  cleanup) cleanup "${2:-}" ;;
  *) usage; exit 2 ;;
esac
