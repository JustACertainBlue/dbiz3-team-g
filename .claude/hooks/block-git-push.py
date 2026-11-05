"""PreToolUse hook for the Bash tool: block every `git push` (constitution V).

The `Bash(git push:*)` deny rule in .claude/settings.json only matches commands that
start with `git push`, so a wrapper (`perl -e 'alarm 120; exec @ARGV' git push`,
`sh -c "git push"`, `timeout 60 git push`, `a && git push`, `git -C dir push`) slipped
through on 2026-11-05 (build log section 4, row 46). This hook looks for git followed by
the `push` subcommand anywhere in the command, after any git global options.

Contract (Claude Code hooks): JSON on stdin with tool_input.command; exit 2 with the
reason on stderr blocks the tool call; exit 0 lets it run. Standard library only, so it
runs the same on macOS and Windows. Tests: tests/hooks/test_block_git_push.py.
"""

import json
import re
import sys

REASON = "Constitution V: the agent never pushes; ask the human to push"

# One shell word: quoted string or run of non-space characters.
_ARG = r"""(?:"[^"]*"|'[^']*'|\S+)"""
# git global options that may stand between `git` and the subcommand.
_OPTION = (
    rf"(?:-[Cc]\s+{_ARG}"
    rf"|--(?:git-dir|work-tree|namespace|exec-path|config-env|super-prefix)(?:=|\s+){_ARG}"
    rf"|--?[\w-]+(?:={_ARG})?)"
)
# `git` (or /path/git, git.exe) at a word boundary, options, then the `push` subcommand.
PUSH = re.compile(
    rf"""(?:^|[\s;&|(`"'/\\])git(?:\.exe)?["']?(?:\s+{_OPTION})*\s+["']?push(?=$|[\s;&|)`"'])""",
    re.IGNORECASE | re.MULTILINE,
)


def is_git_push(command: str) -> bool:
    return PUSH.search(command) is not None


def main() -> int:
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace"))
    except ValueError:
        return 0
    if not isinstance(payload, dict):
        return 0
    tool_input = payload.get("tool_input")
    command = tool_input.get("command") if isinstance(tool_input, dict) else None
    if isinstance(command, str) and is_git_push(command):
        sys.stderr.write(REASON + "\n")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
