# 07 — Session 10 and 11 requirements (course summary)

Summary of the DBIZ3 Session 10 slides ("Module Integration and Testing") and Session 11 slides
("Product Completion and Deployment Ready"). The slides are the source; this file only lists what the
team must produce. If anything here conflicts with the course materials, the course materials win.

## Milestones

| Milestone | Session | Meaning |
|---|---|---|
| MVP Alpha | 8 | Each core module runs its P1 user story |
| MVP Beta | 10 | Modules integrated into one system, running on the team's machines |
| Hosted product | 11 | The system runs on the internet; anyone with the link can reach it |
| **MVP RC** | **before 12** | Remaining features completed; after this point only bug fixes |

The hosted version is used in Session 12 (senior reviewers evaluate the hosted version), Session 13
(street tests with real users via the public link) and Session 14 (monitoring).

## Session 10 — Module Integration and Testing

Key idea: defects appear at the interfaces between modules. Each module can pass its own tests while
the combination fails. Integration is complete when every required interface has been checked and
conforms to its interface specification (ISO/IEC/IEEE 24748-6).

Recommended strategy: bottom-up order, incremental merges, full test suite on every merge (CI).

### Deliverables

| Deliverable | Location | Notes |
|---|---|---|
| Integration contract | `docs/test/integration-contract.md` | One row/section per interface: sender, receiver, fields with type and required flag, error behaviour; mark every disagreement between the two specifications |
| Integration and test plan | `docs/test/test-plan.md` | Order of integration, what is tested where, completion criteria |
| Contract tests | team test folder | At least 4 per interface: 1 normal case, 2 boundary values, 1 failure case. Every test name cites the FR or BR it checks (a test without an ID does not count). Show each test fails when the code or stub is deliberately broken |
| Merged pull requests | GitHub | Reviewed by a member who did not write the code, with at least one specific comment ("LGTM" without reading is not a review). The file owner merges |
| Defect reports | GitHub Issues | Template below; the issue is closed by the PR that fixes it |
| Release tag | `v0.1-integration` on `main` | Annotated tag. Team rule: a tag is never moved or deleted once pushed |
| AI Use Log | `docs/ai-use-log.md` | Which parts were AI-generated and the name of the person who checked them |

### Review criteria (for every PR)

1. The change matches the cited requirement and business rule.
2. Field names, types and error behaviour match the §5.1 contract on both sides of the interface.
3. Tests exist for the new behaviour, including boundary values and failure cases.
4. No test was weakened, skipped or edited to pass.
5. No secret, `.env` file, real personal data or hand-edited seed file is included.
6. AI-generated parts are recorded in the AI Use Log with the name of the person who checked them.

### Defect report template (GitHub Issue)

```
Title: [SENDER→RECEIVER] short description
Steps: exact input and steps to reproduce
Expected: behaviour, with spec reference (FR/BR, spec section)
Actual: what happened
Environment: main @ <tag or commit>, runtime versions
Interface: SENDER → RECEIVER (which call/table/event)
Owner: <module owner> · Reviewer: <other side's owner>
Severity: High/Medium/Low + why
Fix: PR #<n>, test <name>
```

### Eight origins of integration defects (checklist when writing contract tests)

1. Field-name mismatch.
2. Data type, unit and format mismatch (e.g. price as text, local time vs UTC).
3. Boundary errors (`>` vs `>=`): test just below, at and just above every threshold.
4. Missing values and unhandled errors (None, timeouts, unavailable service).
5. State and timing (race conditions, wrong event order).
6. Environment and configuration differences (missing env var, unlisted dependency).
7. Regressions introduced by merging (semantic conflicts that Git merges without complaint).
8. Defects introduced by AI-generated changes (edited tests, invented functions, out-of-scope edits).

### Debugging procedure

Reproduce → Read (full error and traceback) → Locate (one module, one interface, one line) →
Hypothesise (one testable sentence) → Fix at the root cause → Verify (re-run, add a test that fails
without the fix, run the full suite).

Accepted AI fix: explains the root cause, changes code not tests, minimal diff, adds a test that fails
without the fix, full suite passes, recorded in the AI Use Log.

### Repository protection

- `.gitignore` for `.env`; `.env.example` lists every required variable without values.
- A secret pushed to GitHub is exposed even if deleted later: revoke and reissue it.
- Branch protection on `main`: changes only through a pull request with approval and passing checks;
  applies to members and AI agents alike.
- Commands that rewrite or delete history (`push --force`, `reset --hard`, deleting tags) are not
  delegated to an agent.

## Session 11 — Product Completion and Deployment Ready

Key idea: completing the features means completing the connections. Every connection must answer four
questions:

| Question | Where it is written |
|---|---|
| What is sent and received? | Input/Output in the Function List / spec §5.1 |
| Who is allowed? | EARS |
| Does anyone wait, and for how long? | EARS |
| What does the user see when it fails? | EARS |

EARS patterns: `WHEN <normal event>, THE SYSTEM SHALL …` and
`IF <unwanted situation>, THEN THE SYSTEM SHALL …` (failures, unauthorised access, timeouts,
duplicates). Every failure found when testing from outside the team becomes one EARS line in the spec.

### Hosting levels

1. No-code builder · 2. Static site · 3. Static + BaaS · 4. Serverless functions · 5. Always-on server.
Choose with three questions: own backend that must run continuously? (yes → web service);
Streamlit/Gradio? ; needs a database? (check what the platform provides and how long the free plan lasts).
Free-plan limits change often and must be re-checked before deploying.

Deployment process: push through a reviewed PR → connect repo to platform → declare environment
variables on the platform (never in code) → get the public URL and open it from a device outside the
team → read build/runtime logs when something fails. Secrets live only in the backend.

### Deliverables

| Deliverable | Level | Pass criterion |
|---|---|---|
| **Public link** | Required | Another team opens it on a phone over mobile data (not the classroom Wi-Fi) and runs one Must-have flow. A product that runs only locally does not pass |
| ADR on the hosting option | Recommended | States the choice, the reason and the trade-off accepted |
| Notes: local versus internet | Recommended | List of errors met during deployment and how each was fixed |
| **Spec with new EARS lines** | Required | At least one line on a failure case found when testing from outside |
| Extension task | Encouraged | One of: LLM call from the server side (key in env var), minimal sign-in blocking a page, or an API endpoint callable by another team — running on the hosted version; add one EARS line before implementing |
