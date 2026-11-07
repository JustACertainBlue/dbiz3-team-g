"""Tests for .claude/hooks/block-git-push.py.

Rule (human decision 2026-11-05, deviation from constitution V, build log section 4 row 46):
the agent may push a feature branch to a named remote and open PRs; it never pushes to
main, never force-pushes, never deletes remote refs, never pushes tags, --mirror or --all,
and never merges (`gh pr merge`). Everything else stays allowed.

Standard library only. Run from the repository root on macOS or Windows:
    python -m unittest discover -s tests/hooks -v
"""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / ".claude" / "hooks" / "block-git-push.py"
MARKER = "Blocked by .claude/hooks/block-git-push.py"
WRAP = "perl -e 'alarm 120; exec @ARGV' "

BLOCKED = [
    # no explicit branch: could be main
    "git push",
    "git push origin",
    "git push origin HEAD",
    "git push -u origin HEAD",
    # main in any spelling
    "git push origin main",
    "git push -u origin main",
    "git push origin HEAD:main",
    "git push origin feat/x:main",
    "git push origin feat/x:refs/heads/main",
    "git push origin refs/heads/main",
    "git push origin feat/x main",
    WRAP + "git push -u origin main",
    'sh -c "git push origin main"',
    "git push origin main 2>&1 | tail -3",
    "git push 2>&1 origin main",
    "git push origin feat/x > out.log main",
    # force
    "git push --force origin feat/x",
    "git push --force origin feat/x 2>&1",
    "git push -f origin feat/x",
    "git push -uf origin feat/x",
    "git push --force-with-lease origin feat/x",
    "git push --force-with-lease=feat/x origin feat/x",
    "git push --force-if-includes origin feat/x",
    "git push origin +feat/x",
    'sh -c "git push --force origin feat/x"',
    # delete
    "git push --delete origin feat/x",
    "git push -d origin feat/x",
    "git push origin :feat/x",
    "git push --prune origin feat/x",
    # tags
    "git push --tags origin feat/x",
    "git push --follow-tags origin feat/x",
    "git push origin v1",
    "git push origin refs/tags/v1",
    "git push origin tag v1",
    "git push origin dup",  # dup is both a branch and a tag
    "git -c push.followTags=true push origin feat/x",
    # mirror / all
    "git push --mirror origin",
    "git push --all origin",
    # anything the hook cannot prove safe
    "git push origin no-such-branch",
    "git push https://github.com/example/repo.git feat/x",
    "git push origin $(git branch --show-current)",
    "git push origin `git branch --show-current`",
    "git push --repo=origin feat/x",
    'git commit -m "chore: block git push via a PreToolUse hook"',
    # merge stays human
    "gh pr merge 47",
    "gh pr merge --squash --delete-branch 47",
    WRAP + "gh pr merge 47",
    "gh api -X PUT repos/example/repo/pulls/47/merge",
]

ALLOWED = [
    "git push -u origin feat/x",
    "git push origin feat/x",
    "git push --set-upstream origin 016-iac-attach",
    "git push --dry-run origin feat/x",
    "git push -nu origin feat/x",
    "git push origin feat/x:feat/x",
    "git push origin feat/x:refs/heads/feat/x",
    "git -C . push -u origin feat/x",
    "git --no-pager push origin feat/x",
    WRAP + "git push -u origin 016-iac-attach",
    'sh -c "git push -u origin feat/x"',
    "npm test && git push -u origin feat/x",
    # shell redirections are not push arguments (found on 016-iac-attach)
    "git push -u origin feat/x 2>&1 | tail -3",
    WRAP + "git push -u origin feat/x 2>&1 | tail -3",
    "git push origin feat/x 2>/dev/null",
    "git push origin feat/x > push.log",
    "git push origin feat/x >>push.log 2>&1",
    "git push origin feat/x &>push.log",
    "git push origin feat/x < /dev/null",
    # unrelated commands
    "git pull",
    WRAP + "git pull",
    "git fetch origin",
    "git status --short",
    "git log --oneline -3",
    "git --no-pager log --grep push",
    'git commit -m "chore: block pushes via a PreToolUse hook"',
    "git stash push -m wip",
    "npm test",
    "gh pr create --base main --head feat/x",
    "gh pr view 45",
    "gh pr list --state merged",
    "echo push",
    "echo merge",
]


def git(repo, *args):
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


class BlockGitPushTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo = Path(tempfile.mkdtemp(prefix="hook-repo-"))
        git(cls.repo, "init", "-q", "-b", "main")
        git(cls.repo, "-c", "user.name=t", "-c", "user.email=t@example.com",
            "commit", "-q", "--allow-empty", "-m", "init")
        git(cls.repo, "branch", "feat/x")
        git(cls.repo, "branch", "016-iac-attach")
        git(cls.repo, "tag", "v1")
        git(cls.repo, "branch", "dup")
        git(cls.repo, "tag", "dup")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.repo, ignore_errors=True)

    def run_hook(self, payload):
        data = payload if isinstance(payload, str) else json.dumps(payload)
        return subprocess.run(
            [sys.executable, str(SCRIPT)],
            input=data,
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=self.repo,
            timeout=30,
        )

    def bash(self, command):
        return {"tool_name": "Bash", "cwd": str(self.repo), "tool_input": {"command": command}}

    def test_blocks_unsafe_push_and_merge(self):
        for command in BLOCKED:
            with self.subTest(command=command):
                result = self.run_hook(self.bash(command))
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn(MARKER, result.stderr)

    def test_allows_feature_branch_push_and_other_commands(self):
        for command in ALLOWED:
            with self.subTest(command=command):
                result = self.run_hook(self.bash(command))
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stderr, "")

    def test_ignores_payload_without_command(self):
        for payload in ({"tool_name": "Bash", "tool_input": {}}, {"tool_name": "Read"}, "not json"):
            with self.subTest(payload=payload):
                self.assertEqual(self.run_hook(payload).returncode, 0)


if __name__ == "__main__":
    unittest.main()
