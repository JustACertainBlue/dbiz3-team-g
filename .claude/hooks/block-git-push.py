"""PreToolUse hook for the Bash tool: the agent may push feature branches, nothing more.

Rule (human decision 2026-11-05; a recorded deviation from constitution V, build log
section 4 row 46): the agent may push a feature branch to a named remote and open PRs.
It never pushes to main, never force-pushes, never deletes remote refs, never pushes
tags, --mirror or --all, and never merges (`gh pr merge`, or the merge API). The human
merges.

A permission prefix rule only sees commands that start with `git push`, so wrappers
(`perl -e 'alarm 120; exec @ARGV' git push`, `sh -c "..."`, `a && git push`,
`git -C dir push`) slipped through on 2026-11-05. This hook finds every git push anywhere
in the command and allows it only when it can prove the push is safe:

  git [-C <dir>] [--no-pager] push [-u|--set-upstream|-n|--dry-run|-v|-q|...]
      <remote-name> <refspec>...

where each refspec is `<local-branch>` or `<local-branch>:<branch>`, the source is an
existing local branch (not a tag, not HEAD), and the destination is not main. Anything
it cannot parse (command substitution, unknown options, URLs) is blocked.

Contract (Claude Code hooks): JSON on stdin with tool_input.command (and cwd); exit 2
with the reason on stderr blocks the tool call; exit 0 lets it run. Standard library
only, so it runs the same on macOS and Windows. Tests: tests/hooks/test_block_git_push.py.
"""

import json
import os
import re
import shlex
import subprocess
import sys

MARKER = "Blocked by .claude/hooks/block-git-push.py"
RULE = (
    "the agent may push only a feature branch to a named remote "
    "(never main, force, delete, tags, --mirror or --all) and never merges; ask the human"
)
PROTECTED_BRANCHES = {"main"}

# One shell word: quoted string or run of non-space characters.
_ARG = r"""(?:"[^"]*"|'[^']*'|\S+)"""
# git global options that may stand between `git` and the subcommand.
_OPTION = (
    rf"(?:-[Cc]\s+{_ARG}"
    rf"|--(?:git-dir|work-tree|namespace|exec-path|config-env|super-prefix)(?:=|\s+){_ARG}"
    rf"|--?[\w-]+(?:={_ARG})?)"
)
_LEAD = r"""(?P<lead>^|[\s;&|(`"'/\\])"""
GIT_PUSH = re.compile(
    rf"""{_LEAD}git(?:\.exe)?["']?(?P<opts>(?:\s+{_OPTION})*)\s+["']?push(?=$|[\s;&|)`"'])""",
    re.IGNORECASE | re.MULTILINE,
)
GH_MERGE = re.compile(
    rf"""{_LEAD}gh(?:\.exe)?\s+(?:pr\s+merge\b|api\b[^;&|\n]*/merge\b)""",
    re.IGNORECASE | re.MULTILINE,
)

SAFE_SHORT_FLAGS = set("unvq")
SAFE_LONG_FLAGS = {
    "--set-upstream", "--dry-run", "--verbose", "--quiet",
    "--progress", "--no-progress", "--no-verify", "--porcelain",
}
REMOTE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
# Shell redirections (`2>&1`, `>&2`, `&>log`, `> log`, `>>log`, `2>/dev/null`, `< in`) are not push
# arguments; they are removed before the arguments are split at shell operators.
REDIRECT = re.compile(r"""(?:\d*|&)(?:>>?|<)(?:&\d+|\s*(?:"[^"]*"|'[^']*'|[^\s;&|]+))""")


class Unsafe(Exception):
    pass


def _segment(command, match):
    """Text of the push arguments: up to the closing wrapper quote or the next shell operator."""
    rest = command[match.end():]
    quote = match.group("lead")
    if quote in ("'", '"') and quote in rest:
        rest = rest[: rest.index(quote)]
    rest = REDIRECT.sub(" ", rest)
    rest = re.split(r"[;&|\n]", rest, maxsplit=1)[0]
    if "$" in rest or "`" in rest:
        raise Unsafe("command substitution or variable in push arguments")
    return rest.split(")", 1)[0]


def _git_dir(opts, base):
    directory = base
    try:
        words = shlex.split(opts)
    except ValueError:
        raise Unsafe("cannot parse git options")
    i = 0
    while i < len(words):
        word = words[i]
        if word == "-C" and i + 1 < len(words):
            directory = os.path.join(directory, words[i + 1])
            i += 2
        elif word in ("--no-pager", "-P"):
            i += 1
        else:
            raise Unsafe(f"git option {word} before push")
    return directory


def _ref_exists(directory, ref):
    try:
        result = subprocess.run(
            ["git", "-C", directory, "show-ref", "--verify", "--quiet", ref],
            capture_output=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        raise Unsafe("cannot run git to check the branch")
    return result.returncode == 0


def _strip_heads(name):
    return name[len("refs/heads/"):] if name.startswith("refs/heads/") else name


def _check_refspec(refspec, directory):
    if refspec.startswith("+"):
        raise Unsafe(f"force refspec {refspec}")
    if refspec.startswith(":"):
        raise Unsafe(f"delete refspec {refspec}")
    src, _, dst = refspec.partition(":")
    dst = dst or src
    if src.startswith("refs/") and not src.startswith("refs/heads/"):
        raise Unsafe(f"non-branch source {src}")
    if dst.startswith("refs/") and not dst.startswith("refs/heads/"):
        raise Unsafe(f"non-branch destination {dst}")
    src, dst = _strip_heads(src), _strip_heads(dst)
    if dst in PROTECTED_BRANCHES:
        raise Unsafe(f"push to {dst}")
    if src.upper() == "HEAD" or dst.upper() == "HEAD":
        raise Unsafe("HEAD refspec (name the branch)")
    if not _ref_exists(directory, f"refs/heads/{src}"):
        raise Unsafe(f"{src} is not a local branch")
    if _ref_exists(directory, f"refs/tags/{src}"):
        raise Unsafe(f"{src} is also a tag")


def check_push(command, match, base):
    directory = _git_dir(match.group("opts"), base)
    try:
        words = shlex.split(_segment(command, match))
    except ValueError:
        raise Unsafe("cannot parse push arguments")
    positional = []
    options_done = False
    for word in words:
        if options_done or not word.startswith("-"):
            positional.append(word)
        elif word == "--":
            options_done = True
        elif word.startswith("--"):
            if word not in SAFE_LONG_FLAGS:
                raise Unsafe(f"push option {word}")
        elif not set(word[1:]) <= SAFE_SHORT_FLAGS:
            raise Unsafe(f"push option {word}")
    if len(positional) < 2:
        raise Unsafe("push without an explicit remote and branch")
    remote, refspecs = positional[0], positional[1:]
    if not REMOTE_NAME.match(remote):
        raise Unsafe(f"remote {remote} is not a remote name")
    for refspec in refspecs:
        _check_refspec(refspec, directory)


def blocked_reason(command, base):
    if GH_MERGE.search(command):
        return "merging a pull request"
    for match in GIT_PUSH.finditer(command):
        try:
            check_push(command, match, base)
        except Unsafe as problem:
            return str(problem)
    return None


def main() -> int:
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace"))
    except ValueError:
        return 0
    if not isinstance(payload, dict):
        return 0
    tool_input = payload.get("tool_input")
    command = tool_input.get("command") if isinstance(tool_input, dict) else None
    if not isinstance(command, str):
        return 0
    base = payload.get("cwd") if isinstance(payload.get("cwd"), str) else os.getcwd()
    reason = blocked_reason(command, base)
    if reason:
        sys.stderr.write(f"{MARKER}: {reason}; {RULE}.\n")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
