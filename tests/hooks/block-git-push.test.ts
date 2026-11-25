import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Tests for .claude/hooks/block-git-push.mjs (Node, so it runs the same on macOS and Windows).
// Rule (human decision 2026-11-05, deviation from constitution V, build log section 4 row 46): the agent
// may push a feature branch to a named remote and open PRs; it never pushes to main, never force-pushes,
// never deletes remote refs, never pushes tags, --mirror or --all, and never merges a pull request.
// Since 2026-11-08 it may run `git merge origin/main` as a single command on a feature branch.
// The cases are the ones of the former Python test (tests/hooks/test_block_git_push.py).

const SCRIPT = resolve(__dirname, '../../.claude/hooks/block-git-push.mjs')
const MARKER = 'Blocked by .claude/hooks/block-git-push.mjs'
const WRAP = "perl -e 'alarm 120; exec @ARGV' "

const BLOCKED: string[] = [
  // no explicit branch: could be main
    "git push",
    "git push origin",
    "git push origin HEAD",
    "git push -u origin HEAD",
  // main in any spelling
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
  // force
    "git push --force origin feat/x",
    "git push --force origin feat/x 2>&1",
    "git push -f origin feat/x",
    "git push -uf origin feat/x",
    "git push --force-with-lease origin feat/x",
    "git push --force-with-lease=feat/x origin feat/x",
    "git push --force-if-includes origin feat/x",
    "git push origin +feat/x",
    'sh -c "git push --force origin feat/x"',
  // delete
    "git push --delete origin feat/x",
    "git push -d origin feat/x",
    "git push origin :feat/x",
    "git push --prune origin feat/x",
  // tags
    "git push --tags origin feat/x",
    "git push --follow-tags origin feat/x",
    "git push origin v1",
    "git push origin refs/tags/v1",
    "git push origin tag v1",
    "git push origin dup",  // dup is both a branch and a tag
    "git -c push.followTags=true push origin feat/x",
  // mirror / all
    "git push --mirror origin",
    "git push --all origin",
  // anything the hook cannot prove safe
    "git push origin no-such-branch",
    "git push https://github.com/example/repo.git feat/x",
    "git push origin $(git branch --show-current)",
    "git push origin `git branch --show-current`",
    "git push --repo=origin feat/x",
    'git commit -m "chore: block git push via a PreToolUse hook"',
  // merge stays human
    "gh pr merge 47",
    "gh pr merge --squash --delete-branch 47",
    WRAP + "gh pr merge 47",
    "gh api -X PUT repos/example/repo/pulls/47/merge",
]

const ALLOWED: string[] = [
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
  // shell redirections are not push arguments (found on 016-iac-attach)
    "git push -u origin feat/x 2>&1 | tail -3",
    WRAP + "git push -u origin feat/x 2>&1 | tail -3",
    "git push origin feat/x 2>/dev/null",
    "git push origin feat/x > push.log",
    "git push origin feat/x >>push.log 2>&1",
    "git push origin feat/x &>push.log",
    "git push origin feat/x < /dev/null",
  // unrelated commands
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

// `git merge origin/main` (human decision 2026-11-08): only on a feature branch, only as the whole command.
const MERGE_ALLOWED_ON_FEATURE: string[] = [
    "git merge origin/main",
    "git merge --no-edit origin/main",
    "git merge --no-ff --no-edit origin/main",
    "git --no-pager merge --no-edit origin/main",
    "git -C . merge origin/main",
    "git merge --no-edit origin/main 2>&1",
    "git merge --abort",
    "git merge --continue",
]
const MERGE_BLOCKED_ON_FEATURE: string[] = [
    "git merge origin/feat-y",
    "git merge main",
    "git merge origin/main feat/y",
    "git merge",
    "git merge -s ours origin/main",
    "git merge -X theirs origin/main",
    "git merge --squash origin/main",
    "git merge -m msg origin/main",
    "git merge --abort origin/main",
    "git -c merge.ff=false merge origin/main",
    "git switch main && git merge origin/main",
    "git checkout main; git merge origin/main",
    "git fetch && git merge origin/main",
    "git merge origin/main && git push origin feat/x",
    "git merge origin/main | tail -3",
    WRAP + "git merge origin/main",
    'sh -c "git merge origin/main"',
    "git merge $(echo origin/main)",
    "gh pr merge 47",
]
const MERGE_BLOCKED_ON_MAIN: string[] = [
    "git merge origin/main",
    "git merge --no-edit origin/main",
    "git merge --abort",
    "git merge feat/x",
]

const git = (repo: string, ...args: string[]) => {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
}
const COMMIT = ['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-q', '--allow-empty', '-m', 'init']
function makeRepo(prefix: string): string {
  const repo = mkdtempSync(join(tmpdir(), prefix))
  git(repo, 'init', '-q', '-b', 'main')
  git(repo, ...COMMIT)
  return repo
}

function runHook(payload: unknown, cwd: string) {
  const input = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const result = spawnSync(process.execPath, [SCRIPT], { input, cwd, encoding: 'utf8', timeout: 30_000 })
  return { code: result.status, stderr: result.stderr }
}
const bash = (command: string, cwd: string) => ({ tool_name: 'Bash', cwd, tool_input: { command } })

const repos: string[] = []
let main: string
let feature: string
let detached: string

beforeAll(() => {
  main = makeRepo('hook-repo-')
  git(main, 'branch', 'feat/x')
  git(main, 'branch', '016-iac-attach')
  git(main, 'tag', 'v1')
  git(main, 'branch', 'dup')
  git(main, 'tag', 'dup')
  feature = makeRepo('hook-repo-feature-')
  git(feature, 'switch', '-q', '-c', 'feat/x')
  detached = makeRepo('hook-repo-detached-')
  git(detached, 'switch', '-q', '--detach')
  repos.push(main, feature, detached)
})
afterAll(() => { for (const repo of repos) rmSync(repo, { recursive: true, force: true }) })

describe('block-git-push hook (node)', () => {
  it.each(BLOCKED)('blocks: %s', command => {
    const result = runHook(bash(command, main), main)
    expect(result.code, result.stderr).toBe(2)
    expect(result.stderr).toContain(MARKER)
  })

  it.each(ALLOWED)('allows: %s', command => {
    const result = runHook(bash(command, main), main)
    expect(result.code, result.stderr).toBe(0)
    expect(result.stderr).toBe('')
  })

  it.each(MERGE_ALLOWED_ON_FEATURE)('on a feature branch, allows: %s', command => {
    const result = runHook(bash(command, feature), feature)
    expect(result.code, result.stderr).toBe(0)
  })

  it.each(MERGE_BLOCKED_ON_FEATURE)('on a feature branch, blocks: %s', command => {
    const result = runHook(bash(command, feature), feature)
    expect(result.code, result.stderr).toBe(2)
    expect(result.stderr).toContain(MARKER)
  })

  it.each(MERGE_BLOCKED_ON_MAIN)('on main, blocks: %s', command => {
    const result = runHook(bash(command, main), main)
    expect(result.code, result.stderr).toBe(2)
    expect(result.stderr).toContain(MARKER)
  })

  it('on a detached HEAD, blocks git merge origin/main', () => {
    const result = runHook(bash('git merge origin/main', detached), detached)
    expect(result.code, result.stderr).toBe(2)
    expect(result.stderr).toContain(MARKER)
  })

  it.each([
    { tool_name: 'Bash', tool_input: {} },
    { tool_name: 'Read' },
    'not json',
  ])('ignores a payload without a command: %j', payload => {
    expect(runHook(payload, main).code).toBe(0)
  })

  it('reads the repository from the cwd of the payload, not from the process cwd', () => {
    // feat/x exists in the `main` repo only; the payload cwd points there, the process cwd does not.
    expect(runHook(bash('git push -u origin feat/x', main), tmpdir()).code).toBe(0)
    expect(runHook(bash('git push -u origin no-such-branch', main), tmpdir()).code).toBe(2)
  })

  it('is wired in .claude/settings.json with a command that works in any shell', () => {
    const settings = JSON.parse(readFileSync(resolve(__dirname, '../../.claude/settings.json'), 'utf8'))
    expect(settings.hooks.PreToolUse[0].hooks[0].command).toBe('node .claude/hooks/block-git-push.mjs')
  })
})
