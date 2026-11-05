"""Tests for .claude/hooks/block-git-push.py (constitution V: the agent never pushes).

Standard library only. Run from the repository root on macOS or Windows:
    python -m unittest discover -s tests/hooks -v
"""

import json
import subprocess
import sys
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "block-git-push.py"
REASON = "Constitution V: the agent never pushes; ask the human to push"


def run_hook(payload):
    data = payload if isinstance(payload, str) else json.dumps(payload)
    return subprocess.run(
        [sys.executable, str(SCRIPT)],
        input=data,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=30,
    )


def bash(command):
    return {"tool_name": "Bash", "tool_input": {"command": command}}


BLOCKED = [
    "git push",
    "git push -u origin 015-iac-close",
    "git push --dry-run",
    "perl -e 'alarm 120; exec @ARGV' git push -u origin 015-iac-close",
    "perl -e 'alarm 5; exec @ARGV' git push --dry-run",
    'sh -c "git push origin main"',
    "bash -lc 'git push'",
    "timeout 60 git push",
    "git -C x push",
    'git -C "/some dir" push origin HEAD',
    "git -c core.sshCommand=ssh --no-pager push",
    "git --git-dir=.git --work-tree . push",
    "npm test && git push",
    "git status; git push",
    "git commit -m wip || git push --force",
    "cd repo && /usr/bin/git push",
    "git.exe push",
    "env GIT_TRACE=1 git push",
    "echo ok\ngit push",
    # Known false positive, accepted on purpose: a quoted "git push" inside an argument
    # looks the same as `sh -c "git push"`, so it is blocked too. Reword the text.
    'git commit -m "chore: block git push via a PreToolUse hook"',
]

ALLOWED = [
    "git pull",
    "perl -e 'alarm 120; exec @ARGV' git pull",
    "git fetch origin",
    "git status --short",
    "git log --oneline -3",
    "git --no-pager log --grep push",
    'git commit -m "chore: block pushes via a PreToolUse hook"',
    "git stash push -m wip",
    "npm test",
    "gh pr create --base main --head linh/block-push-hook",
    "echo push",
    "cat docs/build/build-log.md | grep pushed",
]


class BlockGitPushTest(unittest.TestCase):
    def test_blocks_push_in_any_form(self):
        for command in BLOCKED:
            with self.subTest(command=command):
                result = run_hook(bash(command))
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn(REASON, result.stderr)

    def test_allows_other_git_commands(self):
        for command in ALLOWED:
            with self.subTest(command=command):
                result = run_hook(bash(command))
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stderr, "")

    def test_ignores_payload_without_command(self):
        for payload in ({"tool_name": "Bash", "tool_input": {}}, {"tool_name": "Read"}, "not json"):
            with self.subTest(payload=payload):
                self.assertEqual(run_hook(payload).returncode, 0)


if __name__ == "__main__":
    unittest.main()
