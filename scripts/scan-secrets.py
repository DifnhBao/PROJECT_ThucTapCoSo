"""Run official Gitleaks on deliverable files and optionally all Git refs.

Raw redacted scanner output stays in ignored .local-backups. Published JSON
contains finding metadata only, never source lines or matched secret values.
"""
import argparse
import collections
import re
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--gitleaks", required=True)
parser.add_argument("--history", action="store_true")
parser.add_argument("--range", dest="log_range")
parser.add_argument("--output", default="docs/verification/evidence/T03")
args = parser.parse_args()
if args.log_range and not re.fullmatch(r"[0-9a-f]{40}\.\.[0-9a-f]{40}", args.log_range):
    parser.error("--range requires baseSHA..headSHA")
root = Path(__file__).resolve().parents[1]
private = (root / ".local-backups/security-scan").resolve()
private.mkdir(parents=True, exist_ok=True)
stage = Path(tempfile.mkdtemp(prefix="tree-", dir=private)).resolve()
assert stage.is_relative_to(private)
output = (root / args.output).resolve()
assert output.is_relative_to(root)
output.mkdir(parents=True, exist_ok=True)
paths = subprocess.check_output(["git", "ls-files", "-c", "-o", "--exclude-standard", "-z"], cwd=root).decode().split("\0")
for name in set(paths):
    source = root / name
    if not name or not source.is_file() or source.is_symlink():
        continue
    target = (stage / name).resolve()
    assert target.is_relative_to(stage)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)

summary = {}
for scope in (["tree", "history"] if args.history else ["tree"]):
    raw = private / f"{scope}-redacted.json"
    command = [str(Path(args.gitleaks).resolve()), "git" if scope == "history" else "dir", str(root if scope == "history" else stage),
               "--redact=100", "--no-banner", "--exit-code=0", "--report-format=json", f"--report-path={raw}"]
    command += [f"--log-opts={args.log_range or '--all'}"] if scope == "history" else ["--max-archive-depth=3"]
    with (private / f"{scope}.log").open("w", encoding="utf-8") as log:
        subprocess.run(command, stdout=log, stderr=log, check=True, cwd=root)
    findings = json.loads(raw.read_text(encoding="utf-8-sig"))
    safe = [{key: finding.get(key) for key in ["RuleID", "File", "StartLine", "EndLine", "Commit", "Fingerprint", "Description"]} for finding in findings]
    for item in safe:
        if scope == "tree":
            item["File"] = str(Path(item["File"]).relative_to(stage))
            item["Fingerprint"] = f'{item["File"]}:{item["RuleID"]}:{item["StartLine"]}'
    (output / f"secrets-{scope}-after.json").write_text(json.dumps(safe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary[scope] = {"findings": len(safe), "rules": dict(collections.Counter(f["RuleID"] for f in safe))}

# Only delete our newly created staging directory, after checking its absolute root.
assert stage.resolve().is_relative_to(private) and stage.name.startswith("tree-")
shutil.rmtree(stage)
print(json.dumps(summary))
