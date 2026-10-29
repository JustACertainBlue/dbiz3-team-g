# 05 — Review playbook (Step 7 Verify + PR review)

Used for AIT rounds 1–2; reuse it for every module. The reviewer does not commit to the author's
branch and never merges. Output = one report pasted in GitHub → PR → Files changed → Review
changes → Comment / Approve / Request changes.

## A. Get the branch (read-only)

```bash
git switch main && git pull
git fetch --all --prune
git branch -r                                  # find the feature branch, e.g. origin/00x-bkg-core
git switch <branch>                            # tracks origin automatically
git --no-pager log --oneline -5                # note the exact commit you review
uv run tools/start_feature.py --use specs/<folder>
uv run tools/start_feature.py --check          # must print OK (G4)
python data/scripts/validate_seed.py           # must PASS
```

Then follow `specs/<folder>/quickstart.md` from the top exactly as written (install, seed, tests,
run). Anything you had to do that the quickstart does not say is a finding (G1).

## B. Static checks

```bash
<test command from quickstart>                         # paste last line (G3)
git --no-pager diff main...HEAD --stat                 # what changed
git --no-pager grep -n -i "<strings that must not exist>" -- src tests specs   # stale data, e.g. old village names
git --no-pager grep -n -i "api_key\|password\|secret\|token" -- . ':!*.lock'   # G7
git status                                             # nothing unexpected
```

- Every BR and acceptance scenario of the slice → find its test (name usually cites `BR-0xx` / `AS-x`).
- Pick one BR: find the test **and** the line of code that applies it.
- Tests that call service functions directly prove the function, not the feature. Check that at
  least one test goes through the same entry point the UI uses (API route / handler), including
  multi-step flows on one session.

## C. Behaviour checks: compute expected results from the seed first

Before clicking, write the table "input → expected output" from `data/seed/*.csv` and the spec.
Then run each case and fill "actual". Design rules learned on AIT:

- Run each case **in a fresh session** and again **as a later turn in one session**. State that
  leaks between turns is invisible in fresh-session tests (AIT B1).
- Include boundary and no-result cases (capacity just below/above, impossible budget, past start
  time, exactly 72h, terminal states).
- Repeat every "create" action twice: uniqueness/idempotency rules (quote per Agency–Experience,
  one Active chat per pair, one booking per slot) only show up on the second click (AIT B3/B4).
- Check identical outputs for different inputs: a constant score or the same list for every query
  means the logic is not wired to the input (AIT B2).
- For each layer, note what is real vs mocked (UI → API → service → storage → external API).
  Mocks are fine for Alpha if they are listed in checklist §3; hidden mocks are not.
- Use DevTools → Network to see whether a button calls the server at all.

## D. Classify each finding

| Class | Meaning | Effect |
|---|---|---|
| Blocking | Must FR / BR of the slice wrong, test missing for a BR, quickstart broken, secret committed | Request changes |
| Limitation | Deliberately not built in Alpha (Should FR, external API mocked, login) | must be in checklist §3; not blocking if written |
| Non-blocking | Docs drift, naming, cosmetic | comment |

Always cite the spec ID (FR/BR/AS/AC) for each finding, and double-check the ID against §5 / §5.2
of the module spec (AIT round 2 mislabelled a budget case as BR-011; it is BR-005).

## E. Report template

```markdown
## Step 7 Verify – Round <n> (commit <sha7>) – <Approve | Request changes>

### ✅ Verified
- `--check` OK, `validate_seed` PASS, <x files / y tests pass>
- <behaviour that works, with the input used>

### ❌ Blocking
1. **<short title> (<FR/BR/AS>)**: input → actual vs expected.

### 🧪 Test gap
<which BR/AS has no test, or which entry point is untested>

### ⚠️ Non-blocking / to log in Known limitations
- ...

### Re-verify checklist for round <n+1>
<exact cases to rerun>
```

## F. Clean up after a review

```bash
# stop the dev server with Ctrl+C first
git status
git switch main
# build artefacts left untracked after switching (Next.js example): remove only after checking `git status`
rm -rf .next && rm -f next-env.d.ts
```

Ask the human before deleting anything (AGENTS.md rule 5).
