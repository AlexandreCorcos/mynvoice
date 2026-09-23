#!/usr/bin/env python3
"""MYNVOICE push gate (AI_RULES R2, docs/rules/R02-delivery-pipeline.md).

There is no staging: local is the validation stage, `main` is production. The
gate stands at the push to `main` and, **for Tier C only**, requires:

  receipts qa + review   for the pushed tree (the review team approved it)
  a version bump         frontend/package.json bumped and meta.json matching (R5)
  a green suite          backend pytest (unit + guards) on exactly the pushed tree

Tier A (docs) and Tier B (routine code) are never blocked here — `/gate` advises,
the author self-reviews. The point is speed on the routine and firmness on the
sensitive (money, auth, isolation, migrations, storage, deploy).

It runs in two layers:
  git layer      .githooks/pre-push (any client). Git hands it the refs.
  harness layer  a Claude Code PreToolUse hook on Bash|PowerShell: turns the git
                 layer on (core.hooksPath) and refuses `--no-verify` / force push to main.

Modes: harness | pre-push <remote> <url> | record <kind> [rev] | status
Env:   SKIP_QUALITY_GATE=1  the OWNER's emergency skip (never an agent's)
       QUALITY_GATE_SUITE_CMD  JSON argv replacing the pytest suite (tests)

Threat model: forgetting, not fraud. Stdlib only; Python 3.11+; Windows and Linux.
"""
from __future__ import annotations

import contextlib
import datetime as dt
import json
import os
import re
import shlex
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
LAUNCHER = ".claude/hooks/quality-gate"

ZERO = re.compile(r"^0+$")
PROTECTED = ("main",)
KINDS = ("qa", "review", "suite")

PKG = "frontend/package.json"
META = "frontend/public/meta.json"

# classification: docs need nothing, tooling needs the suite, code needs everything
TOOLING_PREFIXES = (".claude/", ".githooks/", ".github/", "backend/tests/")
TOOLING_FILES = {"AI_RULES.md", "CLAUDE.md", "backend/pytest.ini",
                 "backend/requirements-dev.txt", ".gitignore", ".gitattributes"}
DOC_SUFFIXES = (".md", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")

# Tier C (AI_RULES R2): sensitive blast radius. The gate blocks ONLY this tier.
TIER_C_PREFIXES = ("backend/alembic/", "backend/app/models/", "backend/app/core/",
                   ".claude/hooks/", ".githooks/")
TIER_C_FILES = {"backend/app/main.py", "backend/app/api/deps.py",
                "docker-compose.yml", "docker-compose.prod.yml",
                "backend/Dockerfile", "backend/Dockerfile.prod", "backend/entrypoint.sh"}
TIER_C_WORDS = (
    "auth", "login", "token", "session", "password", "cookie", "csrf", "stepup", "step_up",
    "admin", "sysctrl", "sys_ctrl", "permission", "invoice", "payment", "expense", "ledger",
    "period", "closing", "money", "tax", "total", "price", "refund", "donation",
    "storage", "upload", "isolation", "user_id",
)

GIT_HOOK_VARS = ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_PREFIX", "GIT_COMMON_DIR",
                 "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_NAMESPACE",
                 "GIT_QUARANTINE_PATH")
CLEAN_ENV = {k: v for k, v in os.environ.items() if k not in GIT_HOOK_VARS}


# ---------------------------------------------------------------------------
# plumbing

def _utf8_std() -> None:
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


def run(argv, cwd=None, timeout=60, stdin_text=None):
    try:
        p = subprocess.run(argv, cwd=cwd, env=CLEAN_ENV, input=stdin_text, text=True,
                           encoding="utf-8", errors="replace", timeout=timeout,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        return p.returncode, p.stdout or ""
    except FileNotFoundError as exc:
        return 127, f"{argv[0]}: not found ({exc})"
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s: {' '.join(map(str, argv))[:200]}"


def git(args, cwd):
    rc, out = run(["git", *args], cwd=cwd)
    return rc, out.strip()


def repo_root() -> str | None:
    for cwd in (None, HERE):
        rc, out = git(["rev-parse", "--show-toplevel"], cwd)
        if rc == 0 and out:
            return out
    return None


def gate_dir(root: str) -> str:
    rc, common = git(["rev-parse", "--git-common-dir"], root)
    common = os.path.abspath(os.path.join(root, common)) if rc == 0 else os.path.join(root, ".git")
    path = os.path.join(common, "quality-gate")
    os.makedirs(path, exist_ok=True)
    return path


def venv_python(root: str) -> str:
    for rel in ("backend/venv/Scripts/python.exe", "backend/venv/bin/python",
                "venv/Scripts/python.exe", "venv/bin/python",
                ".venv/Scripts/python.exe", ".venv/bin/python"):
        cand = os.path.join(root, rel)
        if os.path.isfile(cand):
            return cand
    return sys.executable


def ensure_hooks_path(root: str) -> None:
    rc, out = git(["config", "--local", "core.hooksPath"], root)
    if rc == 0 and out == ".githooks":
        return
    if os.path.isfile(os.path.join(root, ".githooks", "pre-push")):
        git(["config", "--local", "core.hooksPath", ".githooks"], root)


def tree_of(root: str, rev: str) -> str | None:
    rc, out = git(["rev-parse", "--verify", "-q", f"{rev}^{{tree}}"], root)
    return out if rc == 0 and out else None


def rev_exists(root: str, rev: str) -> bool:
    return git(["rev-parse", "--verify", "-q", f"{rev}^{{commit}}"], root)[0] == 0


def changed(root: str, base: str | None, tip: str) -> list[str]:
    if base is None:
        rc, out = git(["ls-tree", "-r", "--name-only", tip], root)
    else:
        rc, out = git(["diff", "--name-only", "--no-renames", base, tip], root)
    return [p for p in out.splitlines() if p] if rc == 0 else []


def _version_from(text: str) -> tuple[int, ...] | None:
    try:
        return tuple(int(x) for x in json.loads(text)["version"].split("."))
    except (ValueError, KeyError, TypeError):
        return None


def version_at(root: str, rev: str) -> tuple[int, ...] | None:
    rc, out = git(["show", f"{rev}:{PKG}"], root)
    return _version_from(out) if rc == 0 else None


def meta_at(root: str, rev: str) -> tuple[int, ...] | None:
    rc, out = git(["show", f"{rev}:{META}"], root)
    return _version_from(out) if rc == 0 else None


# ---------------------------------------------------------------------------
# classification

def classify(path: str) -> str:
    if path.startswith(TOOLING_PREFIXES) or path in TOOLING_FILES:
        return "tooling"
    if path.startswith("docs/") or (path.lower().endswith(DOC_SUFFIXES) and not path.startswith("frontend/")):
        return "docs"
    return "code"


def tier(paths) -> tuple[str, list[str]]:
    if all(classify(p) == "docs" for p in paths):
        return "A", []
    hot = [p for p in paths if classify(p) != "docs" and (
        p.startswith(TIER_C_PREFIXES) or p in TIER_C_FILES
        or any(w in p.lower() for w in TIER_C_WORDS))]
    return ("C", hot) if hot else ("B", [])


# ---------------------------------------------------------------------------
# receipts and markers (in the git common dir: shared by worktrees, never committed)

def receipt_path(root, tree, kind):
    return os.path.join(gate_dir(root), f"{tree}.{kind}")


def record(root: str, kind: str, rev: str = "HEAD") -> str:
    if kind not in KINDS:
        raise SystemExit(f"unknown receipt kind {kind!r}; one of {', '.join(KINDS)}")
    tree = tree_of(root, rev)
    if tree is None:
        raise SystemExit(f"cannot resolve {rev}")
    _, commit = git(["rev-parse", rev], root)
    _, branch = git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    with open(receipt_path(root, tree, kind), "w", encoding="utf-8") as fh:
        fh.write(f"kind={kind}\ntree={tree}\ncommit={commit}\nbranch={branch}\n"
                 f"recorded_at={dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')}\n")
    return tree


def has(root, tree, kind) -> bool:
    return os.path.isfile(receipt_path(root, tree, kind))


def record_marker(root, tree, kind):
    with open(receipt_path(root, tree, kind), "w", encoding="utf-8") as fh:
        fh.write(f"kind={kind}\ntree={tree}\n")


# ---------------------------------------------------------------------------
# running the suite on exactly the pushed tree

@contextlib.contextmanager
def checkout(root: str, sha: str):
    """The working tree when it IS the pushed commit (HEAD == sha, clean);
    otherwise a throwaway worktree at sha, so parallel sessions' edits never leak in."""
    _, head = git(["rev-parse", "HEAD"], root)
    _, dirty = git(["status", "--porcelain", "--untracked-files=normal"], root)
    if head == sha and not dirty:
        yield root
        return
    tmp = tempfile.mkdtemp(prefix="mynvoice-gate-")
    os.rmdir(tmp)
    rc, out = git(["worktree", "add", "--detach", "-q", tmp, sha], root)
    if rc != 0:
        raise RuntimeError(f"could not create a worktree for {sha[:10]}: {out[-300:]}")
    try:
        yield tmp
    finally:
        git(["worktree", "remove", "--force", tmp], root)
        git(["worktree", "prune"], root)


def _cmd_override(name):
    raw = os.environ.get(name)
    if not raw:
        return None
    argv = json.loads(raw)
    if not (isinstance(argv, list) and argv and all(isinstance(a, str) for a in argv)):
        raise SystemExit(f"{name} must be a JSON list of strings")
    return argv


def _tail(text: str, n: int = 25) -> str:
    return "\n".join(text.strip().splitlines()[-n:])


def run_suite(root: str, tree: str, workdir: str) -> str | None:
    if has(root, tree, "suite"):
        return None
    override = _cmd_override("QUALITY_GATE_SUITE_CMD")
    argv = override or [venv_python(root), "-m", "pytest", "-q", "--tb=short"]
    cwd = workdir if override else os.path.join(workdir, "backend")
    rc, out = run(argv, cwd=cwd, timeout=600)
    if rc != 0:
        return f"suite failed (exit {rc}):\n{_tail(out)}"
    record_marker(root, tree, "suite")
    return None


# ---------------------------------------------------------------------------
# the border: push to main

def _fmt(v):
    return ".".join(map(str, v)) if v else "?"


def check_main(root: str, sha: str, remote_sha: str, skip: bool) -> str | None:
    if skip:
        return None
    base = None if ZERO.match(remote_sha) or not rev_exists(root, remote_sha) else remote_sha
    paths = changed(root, base, sha)
    if not paths:
        return None
    t, hot = tier(paths)
    if t != "C":
        return None  # Tier A/B are not blocked; /gate advises

    tree = tree_of(root, sha)
    missing = [k for k in ("qa", "review") if not has(root, tree, k)]
    if missing:
        who = ("run the review team (AI_RULES R2): qa-engineer + code-reviewer"
               + (" + db-architect" if any(p.startswith(("backend/alembic/", "backend/app/models/")) for p in hot) else "")
               + " (+ security-engineer for auth/isolation/money)")
        return (f"Tier C push to main needs receipts {'+'.join(missing)} for tree {tree[:10]}.\n"
                f"{who}; on approval: bash {LAUNCHER} record qa && bash {LAUNCHER} record review\n"
                + (f"tier C because of: {', '.join(hot[:6])}\n" if hot else "")
                + "Any edit after the review changes the tree: record again.")

    if any(classify(p) == "code" for p in paths):
        new, old = version_at(root, sha), (version_at(root, base) if base else None)
        if new is None or (old is not None and new <= old):
            return (f"code changed but {PKG} was not bumped ({_fmt(old)} -> {_fmt(new)}). "
                    "Bump the version (R5), match meta.json, commit, record the receipts again.")
        if meta_at(root, sha) != new:
            return (f"{PKG} is {_fmt(new)} but {META} is {_fmt(meta_at(root, sha))}. "
                    "They must match (R5) or the update banner misfires.")

    if not has(root, tree, "suite"):
        with checkout(root, sha) as workdir:
            err = run_suite(root, tree, workdir)
            if err:
                return err
    return None


# ---------------------------------------------------------------------------
# harness layer

_WS = r"(?:[ \t]|\\\r?\n)+"
_VALUE = r"(?:\"[^\"\n]*\"|'[^'\n]*'|[^\s;&|\"'])+"
_Q = r"[\"']?"
_VALOPTS = r"(?:-C|-c|--git-dir|--work-tree|--namespace|--config-env)"
_GLOBAL = r"(?:" + _WS + r"(?:" + _Q + _VALOPTS + _Q + _WS + _VALUE + r"|(?!" + _Q + _VALOPTS + _Q + r"(?:\s|$))" + _Q + r"-[^\s;&|\"']+" + _Q + r"))*"


def git_invocations(cmd: str, sub: str) -> list[str]:
    pat = re.compile(r"(?:^|[^\w-])git(?:\.exe)?[\"')`]?" + _GLOBAL + _WS + _Q + re.escape(sub) + _Q + r"(?=[^\w-]|$)([^\n;&|]*)")
    return [m.group(1) for m in pat.finditer(cmd)]


def _words(args: str) -> list[str]:
    try:
        words = shlex.split(args, posix=True)
    except ValueError:
        words = args.split()
    return [w.strip("()'\"`") for w in words if w.strip("()'\"`")]


def _is_forced(words, targets) -> bool:
    for w in words:
        if w.startswith("--force"):
            return True
        if re.fullmatch(r"-[A-Za-z]+", w) and "f" in w[1:]:
            return True
    return any(t.startswith("+") for t in targets[1:])


def _decide_one(args: str, branch: str) -> tuple[str, str] | None:
    words = _words(args)
    if "--no-verify" in words:
        return "deny", "QUALITY GATE: `git push --no-verify` skips the push gate (R2). Push without it."
    targets = [w for w in words if not w.startswith("-")]
    dests = set()
    for spec in targets[1:]:
        dest = spec.lstrip("+").split(":")[-1].replace("refs/heads/", "")
        dests.add(branch if dest in ("HEAD", "@", "") else dest)
    if len(targets) <= 1 and branch:
        dests.add(branch)
    if "--all" in words or "--mirror" in words:
        dests.update(PROTECTED)
    if _is_forced(words, targets) and dests & set(PROTECTED):
        return "deny", "QUALITY GATE: no force push to main. Ask the owner."
    return None


def harness_decision(cmd: str, root: str | None) -> tuple[str, str] | None:
    cmd = re.sub(r"(?:\\|`)\r?\n", " ", cmd)
    pushes = git_invocations(cmd, "push")
    if not pushes:
        return None
    if re.search(r"core\.hookspath", cmd, re.I):
        return "deny", "QUALITY GATE: overriding core.hooksPath on a push switches the gate off (R2)."
    if "SKIP_QUALITY_GATE" in cmd:
        return "deny", "QUALITY GATE: SKIP_QUALITY_GATE is the owner's, never an agent's (R2)."
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"], root)[1] if root else ""
    for a in pushes:
        d = _decide_one(a, branch)
        if d and d[0] == "deny":
            return d
    return None


def mode_harness() -> int:
    try:
        data = json.loads((sys.stdin.read() or "{}").lstrip("﻿"))
        cmd = (data.get("tool_input") or {}).get("command") or ""
    except (ValueError, AttributeError):
        cmd = ""
    if not isinstance(cmd, str) or "git" not in cmd:
        return 0
    root = repo_root()
    if root:
        ensure_hooks_path(root)
    decision = harness_decision(cmd, root)
    if decision:
        verdict, reason = decision
        sys.stdout.write(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse", "permissionDecision": verdict,
            "permissionDecisionReason": reason}}))
    return 0


# ---------------------------------------------------------------------------
# git layer

def mode_pre_push() -> int:
    root = repo_root()
    if not root:
        sys.stderr.write("quality-gate: not inside a git repository\n")
        return 1
    skip = os.environ.get("SKIP_QUALITY_GATE") == "1"
    for line in sys.stdin.read().splitlines():
        parts = line.split()
        if len(parts) < 4:
            continue
        _, local_sha, remote_ref, remote_sha = parts[:4]
        branch = remote_ref.replace("refs/heads/", "")
        if branch not in PROTECTED:
            continue
        if ZERO.match(local_sha):
            err = f"deleting {branch} is not allowed."
        elif not ZERO.match(remote_sha) and not (
            rev_exists(root, remote_sha)
            and git(["merge-base", "--is-ancestor", remote_sha, local_sha], root)[0] == 0
        ):
            err = f"not a fast-forward of {branch} (a force push, or `git fetch` first)."
        else:
            err = check_main(root, local_sha, remote_sha, skip)
        if err:
            sys.stderr.write(f"\nQUALITY GATE - push to {branch} BLOCKED: {err}\n\n")
            return 1
        if skip:
            sys.stderr.write(f"quality-gate: SKIP_QUALITY_GATE=1, checks skipped for {branch} (owner's call)\n")
    return 0


def mode_record(args) -> int:
    root = repo_root()
    if not root or not args:
        sys.stderr.write(f"usage: bash {LAUNCHER} record <{'|'.join(KINDS)}> [rev]\n")
        return 2
    tree = record(root, args[0], args[1] if len(args) > 1 else "HEAD")
    print(f"recorded {args[0]} for tree {tree[:10]}")
    return 0


def mode_status() -> int:
    root = repo_root()
    if not root:
        print("not inside a git repository")
        return 1
    _, branch = git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    tree = tree_of(root, "HEAD")
    base = "origin/main" if rev_exists(root, "origin/main") else None
    paths = changed(root, base, "HEAD") if base else []
    t, hot = tier(paths)
    _, hooks = git(["config", "--local", "core.hooksPath"], root)
    _, dirty = git(["status", "--porcelain", "--untracked-files=no"], root)
    print(f"branch {branch} · HEAD tree {tree[:10]} · uncommitted tracked edits: {'yes' if dirty else 'no'}")
    print(f"vs {base or '(no origin/main)'}: {len(paths)} path(s) · tier {t}" + (f" ({', '.join(hot[:5])})" if hot else ""))
    print("receipts for HEAD: " + (" ".join(k for k in KINDS if has(root, tree, k)) or "none"))
    new, old = version_at(root, "HEAD"), (version_at(root, base) if base else None)
    print(f"version {_fmt(old)} -> {_fmt(new)} · git layer: {'on' if hooks == '.githooks' else 'OFF'}")
    if t == "C":
        need = [k for k in ("qa", "review") if not has(root, tree, k)]
        print("next: " + ("Tier C — " + ("push allowed" if not need else f"record {'+'.join(need)} after review")))
    else:
        print(f"next: Tier {t} — push freely (gate does not block).")
    return 0


def main(argv) -> int:
    _utf8_std()
    mode = argv[1] if len(argv) > 1 else "status"
    if mode == "harness":
        return mode_harness()
    if mode == "pre-push":
        return mode_pre_push()
    if mode == "record":
        return mode_record(argv[2:])
    if mode == "status":
        return mode_status()
    sys.stderr.write(f"unknown mode {mode!r}\n")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
