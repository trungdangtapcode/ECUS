"""Reject ignored private files and recognizable credentials in Git snapshots."""

import argparse
import re
import subprocess
from pathlib import Path

PATTERNS = {
    "private_key": re.compile(rb"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    "openai_key": re.compile(rb"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b"),
    "github_token": re.compile(rb"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[\w]{30,})\b"),
    "aws_access_key": re.compile(rb"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "slack_token": re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{24,}\b"),
    "google_api_key": re.compile(rb"\bAIza[A-Za-z0-9_-]{35}\b"),
}


def git(*args: str, input_data: bytes | None = None) -> bytes:
    return subprocess.run(["git", *args], input=input_data, check=True, capture_output=True).stdout


def local_secrets() -> list[bytes]:
    """Compare local credential values without printing or persisting them."""
    result = []
    path = Path(".env")
    if path.is_file():
        for line in path.read_text().splitlines():
            key, separator, value = line.partition("=")
            if not separator or not re.search(r"(?:KEY|TOKEN|SECRET|PASSWORD)$", key.strip()):
                continue
            value = value.strip().strip("\"'")
            if len(value) >= 16 and value.lower() not in {"replace-with-a-secret"}:
                result.append(value.encode())
    return result


def ignored_paths(paths: list[str]) -> list[str]:
    if not paths:
        return []
    process = subprocess.run(
        ["git", "check-ignore", "--no-index", "-z", "--stdin"],
        input=b"\0".join(path.encode() for path in paths) + b"\0",
        capture_output=True,
    )
    if process.returncode not in {0, 1}:
        raise RuntimeError("Git could not evaluate the repository ignore rules.")
    return [part.decode() for part in process.stdout.split(b"\0") if part]


def check(*, staged: bool, history: bool) -> int:
    if history:
        objects = git("rev-list", "--objects", "--all").decode().splitlines()
        entries = [line.split(" ", 1) for line in objects if " " in line]
        entries = [
            (object_id, path)
            for object_id, path in entries
            if git("cat-file", "-t", object_id).strip() == b"blob"
        ]
    else:
        paths = [path.decode() for path in git("ls-files", "-z").split(b"\0") if path]
        if staged:
            paths = [
                path.decode()
                for path in git(
                    "diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"
                ).split(b"\0")
                if path
            ]
        entries = [(f":{path}", path) for path in paths]
    failures = [(path, "private_path") for path in ignored_paths([path for _, path in entries])]
    secrets = local_secrets()
    for object_id, path in entries:
        content = git("cat-file", "blob", object_id)
        for name, pattern in PATTERNS.items():
            if pattern.search(content):
                failures.append((path, name))
        if any(value in content for value in secrets):
            failures.append((path, "local_credential_value"))
    if failures:
        for path, category in sorted(set(failures)):
            print(f"BLOCKED {category}: {path}")
        print("Private values were not printed. Remove the affected files or credentials.")
        return 1
    scope = "history" if history else "staged snapshot" if staged else "index"
    print(f"Git safety check passed: {len(entries)} blobs in {scope}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    scope = parser.add_mutually_exclusive_group()
    scope.add_argument("--staged", action="store_true")
    scope.add_argument("--history", action="store_true")
    options = parser.parse_args()
    return check(staged=options.staged, history=options.history)


if __name__ == "__main__":
    raise SystemExit(main())
