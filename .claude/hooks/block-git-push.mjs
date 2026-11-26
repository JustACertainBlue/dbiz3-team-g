// PreToolUse hook for the Bash tool: the agent may push feature branches and bring main into them.
//
// Rule (human decision 2026-11-05; a recorded deviation from constitution V, build log
// section 4 row 46): the agent may push a feature branch to a named remote and open PRs.
// It never pushes to main, never force-pushes, never deletes remote refs, never pushes
// tags, --mirror or --all, and never merges a pull request (`gh pr merge`, or the merge API).
// The human merges.
//
// Second rule (human decision 2026-11-08, build log section 4 row 78): to resolve conflicts
// between open PRs without force-pushing, the agent may run `git merge origin/main` while a
// feature branch is checked out, then push that branch normally. Any other `git merge` is
// blocked: on main or a detached HEAD, of any other ref, with other options, or inside a
// compound command (`git switch main && git merge ...` would merge into main after the check).
// Allowed form, as the whole command (shell redirections allowed):
//
//   git [-C <dir>] [--no-pager] merge [--no-edit|--no-ff|--ff-only|--stat|--no-stat|-q|-v|...] origin/main
//   git [-C <dir>] [--no-pager] merge --abort | --continue | --quit
//
// A permission prefix rule only sees commands that start with `git push`, so wrappers
// (`perl -e 'alarm 120; exec @ARGV' git push`, `sh -c "..."`, `a && git push`,
// `git -C dir push`) slipped through on 2026-11-05. This hook finds every git push anywhere
// in the command and allows it only when it can prove the push is safe:
//
//   git [-C <dir>] [--no-pager] push [-u|--set-upstream|-n|--dry-run|-v|-q|...]
//       <remote-name> <refspec>...
//
// where each refspec is `<local-branch>` or `<local-branch>:<branch>`, the source is an
// existing local branch (not a tag, not HEAD), and the destination is not main. Anything
// it cannot parse (command substitution, unknown options, URLs) is blocked.
//
// Contract (Claude Code hooks): JSON on stdin with tool_input.command (and cwd); exit 2
// with the reason on stderr blocks the tool call; exit 0 lets it run. Node standard library
// only, so it runs the same on macOS and Windows (`node .claude/hooks/block-git-push.mjs`).
// It is a port of the former block-git-push.py with the same rules and the same cases.
// Tests: tests/hooks/block-git-push.test.ts.

import { spawnSync } from 'node:child_process'
import path from 'node:path'

const MARKER = 'Blocked by .claude/hooks/block-git-push.mjs'
const RULE =
  'the agent may push only a feature branch to a named remote ' +
  '(never main, force, delete, tags, --mirror or --all), may run only `git merge origin/main` ' +
  'as a single command on a feature branch, and never merges a pull request; ask the human'
const PROTECTED_BRANCHES = new Set(['main'])

// One shell word: quoted string or run of non-space characters.
const ARG = /(?:"[^"]*"|'[^']*'|\S+)/.source
// git global options that may stand between `git` and the subcommand.
const OPTION =
  `(?:-[Cc]\\s+${ARG}` +
  `|--(?:git-dir|work-tree|namespace|exec-path|config-env|super-prefix)(?:=|\\s+)${ARG}` +
  `|--?[\\w-]+(?:=${ARG})?)`
const LEAD = /(?<lead>^|[\s;&|(`"'/\\])/.source
const TAIL = /(?=$|[\s;&|)`"'])/.source

const gitSubcommand = (name) =>
  new RegExp(`${LEAD}git(?:\\.exe)?["']?(?<opts>(?:\\s+${OPTION})*)\\s+["']?${name}${TAIL}`, 'gim')
const GH_MERGE = new RegExp(`${LEAD}gh(?:\\.exe)?\\s+(?:pr\\s+merge\\b|api\\b[^;&|\\n]*/merge\\b)`, 'im')

const SAFE_SHORT_FLAGS = new Set('unvq')
const SAFE_LONG_FLAGS = new Set([
  '--set-upstream', '--dry-run', '--verbose', '--quiet',
  '--progress', '--no-progress', '--no-verify', '--porcelain',
])
const MERGE_SOURCE = 'origin/main'
const SAFE_MERGE_FLAGS = new Set([
  '--no-edit', '--no-ff', '--ff', '--ff-only', '--stat', '--no-stat', '--log', '--no-log',
  '--quiet', '--verbose', '--progress', '--no-progress', '-q', '-v',
])
const MERGE_CONTROL = new Set(['--abort', '--continue', '--quit'])
const REMOTE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
// Shell redirections (`2>&1`, `>&2`, `&>log`, `> log`, `>>log`, `2>/dev/null`, `< in`) are not push
// arguments; they are removed before the arguments are split at shell operators.
const REDIRECT = /(?:\d*|&)(?:>>?|<)(?:&\d+|\s*(?:"[^"]*"|'[^']*'|[^\s;&|]+))/g

class Unsafe extends Error {}

// POSIX shell word splitting, like Python's shlex.split: quotes group, a backslash escapes.
function shlexSplit(text) {
  const words = []
  let current = ''
  let inWord = false
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (/\s/.test(c)) {
      if (inWord) { words.push(current); current = ''; inWord = false }
      i += 1
    } else if (c === "'") {
      const end = text.indexOf("'", i + 1)
      if (end === -1) throw new Unsafe('No closing quotation')
      current += text.slice(i + 1, end)
      inWord = true
      i = end + 1
    } else if (c === '"') {
      i += 1
      let closed = false
      while (i < text.length) {
        const d = text[i]
        if (d === '"') { closed = true; i += 1; break }
        if (d === '\\' && i + 1 < text.length && '"\\$`\n'.includes(text[i + 1])) {
          current += text[i + 1]
          i += 2
        } else {
          current += d
          i += 1
        }
      }
      if (!closed) throw new Unsafe('No closing quotation')
      inWord = true
    } else if (c === '\\') {
      if (i + 1 >= text.length) throw new Unsafe('No escaped character')
      current += text[i + 1]
      inWord = true
      i += 2
    } else {
      current += c
      inWord = true
      i += 1
    }
  }
  if (inWord) words.push(current)
  return words
}

const matchEnd = (match) => match.index + match[0].length

// Text of the push arguments: up to the closing wrapper quote or the next shell operator.
function segment(command, match) {
  let rest = command.slice(matchEnd(match))
  const quote = match.groups.lead
  if ((quote === "'" || quote === '"') && rest.includes(quote)) rest = rest.slice(0, rest.indexOf(quote))
  rest = rest.replace(REDIRECT, ' ')
  const stop = rest.search(/[;&|\n]/)
  if (stop !== -1) rest = rest.slice(0, stop)
  if (rest.includes('$') || rest.includes('`')) throw new Unsafe('command substitution or variable in push arguments')
  return rest.split(')')[0]
}

function gitDir(opts, base) {
  let directory = base
  let words
  try {
    words = shlexSplit(opts)
  } catch {
    throw new Unsafe('cannot parse git options')
  }
  let i = 0
  while (i < words.length) {
    const word = words[i]
    if (word === '-C' && i + 1 < words.length) {
      directory = path.resolve(directory, words[i + 1])
      i += 2
    } else if (word === '--no-pager' || word === '-P') {
      i += 1
    } else {
      throw new Unsafe(`git option ${word} before push`)
    }
  }
  return directory
}

function runGit(directory, args, what) {
  const result = spawnSync('git', ['-C', directory, ...args], { encoding: 'utf8', timeout: 10_000 })
  if (result.error) throw new Unsafe(`cannot run git to ${what}`)
  return result
}

function refExists(directory, ref) {
  return runGit(directory, ['show-ref', '--verify', '--quiet', ref], 'check the branch').status === 0
}

const stripHeads = (name) => (name.startsWith('refs/heads/') ? name.slice('refs/heads/'.length) : name)

function checkRefspec(refspec, directory) {
  if (refspec.startsWith('+')) throw new Unsafe(`force refspec ${refspec}`)
  if (refspec.startsWith(':')) throw new Unsafe(`delete refspec ${refspec}`)
  const colon = refspec.indexOf(':')
  let src = colon === -1 ? refspec : refspec.slice(0, colon)
  let dst = colon === -1 ? '' : refspec.slice(colon + 1)
  dst = dst || src
  if (src.startsWith('refs/') && !src.startsWith('refs/heads/')) throw new Unsafe(`non-branch source ${src}`)
  if (dst.startsWith('refs/') && !dst.startsWith('refs/heads/')) throw new Unsafe(`non-branch destination ${dst}`)
  src = stripHeads(src)
  dst = stripHeads(dst)
  if (PROTECTED_BRANCHES.has(dst)) throw new Unsafe(`push to ${dst}`)
  if (src.toUpperCase() === 'HEAD' || dst.toUpperCase() === 'HEAD') throw new Unsafe('HEAD refspec (name the branch)')
  if (!refExists(directory, `refs/heads/${src}`)) throw new Unsafe(`${src} is not a local branch`)
  if (refExists(directory, `refs/tags/${src}`)) throw new Unsafe(`${src} is also a tag`)
}

function checkPush(command, match, base) {
  const directory = gitDir(match.groups.opts, base)
  let words
  try {
    words = shlexSplit(segment(command, match))
  } catch (problem) {
    if (problem instanceof Unsafe && problem.message.startsWith('command substitution')) throw problem
    throw new Unsafe('cannot parse push arguments')
  }
  const positional = []
  let optionsDone = false
  for (const word of words) {
    if (optionsDone || !word.startsWith('-')) {
      positional.push(word)
    } else if (word === '--') {
      optionsDone = true
    } else if (word.startsWith('--')) {
      if (!SAFE_LONG_FLAGS.has(word)) throw new Unsafe(`push option ${word}`)
    } else if (![...word.slice(1)].every((flag) => SAFE_SHORT_FLAGS.has(flag))) {
      throw new Unsafe(`push option ${word}`)
    }
  }
  if (positional.length < 2) throw new Unsafe('push without an explicit remote and branch')
  const [remote, ...refspecs] = positional
  if (!REMOTE_NAME.test(remote)) throw new Unsafe(`remote ${remote} is not a remote name`)
  for (const refspec of refspecs) checkRefspec(refspec, directory)
}

function currentBranch(directory) {
  const result = runGit(directory, ['symbolic-ref', '--quiet', '--short', 'HEAD'], 'read the current branch')
  if (result.status !== 0) throw new Unsafe('merge on a detached HEAD')
  return result.stdout.trim()
}

function checkMerge(command, match, base) {
  // The branch check below reads HEAD before the command runs, so the merge must be the whole
  // command: anything chained before it (`git switch main && git merge ...`) could move HEAD.
  if (command.slice(0, match.index).trim() || match.groups.lead.trim()) {
    throw new Unsafe('git merge must be the whole command')
  }
  const rest = command.slice(matchEnd(match)).replace(REDIRECT, ' ')
  if (/[;&|\n$`()<>]/.test(rest)) throw new Unsafe('git merge must be the whole command')
  const directory = gitDir(match.groups.opts, base)
  let words
  try {
    words = shlexSplit(rest)
  } catch {
    throw new Unsafe('cannot parse merge arguments')
  }
  const flags = words.filter((word) => word.startsWith('-'))
  const positional = words.filter((word) => !word.startsWith('-'))
  const control = flags.filter((flag) => MERGE_CONTROL.has(flag))
  if (control.length > 0) {
    if (words.length !== 1) throw new Unsafe(`merge ${control[0]} takes no other argument`)
  } else {
    const unknown = flags.filter((flag) => !SAFE_MERGE_FLAGS.has(flag))
    if (unknown.length > 0) throw new Unsafe(`merge option ${unknown[0]}`)
    if (positional.length !== 1 || positional[0] !== MERGE_SOURCE) {
      throw new Unsafe(`merge of ${positional.join(' ') || 'nothing'} (only ${MERGE_SOURCE})`)
    }
  }
  const branch = currentBranch(directory)
  if (PROTECTED_BRANCHES.has(branch)) throw new Unsafe(`merge into ${branch}`)
}

export function blockedReason(command, base) {
  if (GH_MERGE.test(command)) return 'merging a pull request'
  for (const match of command.matchAll(gitSubcommand('push'))) {
    try {
      checkPush(command, match, base)
    } catch (problem) {
      if (problem instanceof Unsafe) return problem.message
      throw problem
    }
  }
  for (const match of command.matchAll(gitSubcommand('merge'))) {
    try {
      checkMerge(command, match, base)
    } catch (problem) {
      if (problem instanceof Unsafe) return problem.message
      throw problem
    }
  }
  return null
}

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function main() {
  let payload
  try {
    payload = JSON.parse(await readStdin())
  } catch {
    return 0
  }
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return 0
  const toolInput = payload.tool_input
  const command = toolInput && typeof toolInput === 'object' ? toolInput.command : undefined
  if (typeof command !== 'string') return 0
  const base = typeof payload.cwd === 'string' ? payload.cwd : process.cwd()
  const reason = blockedReason(command, base)
  if (reason) {
    process.stderr.write(`${MARKER}: ${reason}; ${RULE}.\n`)
    return 2
  }
  return 0
}

// Run only as a script, so the module can be imported without reading stdin.
if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1]?.endsWith('block-git-push.mjs')) {
  process.exitCode = await main()
}
