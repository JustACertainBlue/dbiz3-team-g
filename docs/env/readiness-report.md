# Environment Readiness Report

**Project:** Hanoi Artisan Bridge (Team G)  
**Course:** DBIZ3 – AI-native Product Development, VJCBI College, Foreign Trade University  
**Session:** Session 6 – Development Environment Setup  
**Date:** 30 September 2026  
**Agent path:** Path B (Antigravity) – all members  

---

## 1. Member Readiness Summary

| GitHub Handle | OS | Agent | T1 (Workstation) | T2 (Seed Clean) | T3 (Agent Read) | Status |
|---|---|---|:---:|:---:|:---:|:---:|
| `JustACertainBlue` | Windows 11 | Antigravity | PASS | PASS | PASS | ✅ READY |
| `linhkhanh-vu` | macOS Sonoma | Antigravity | PASS | PASS | PASS | ✅ READY |
| `nguyenthu-0505` | Windows 11 | Antigravity | PASS | PASS | PASS | ✅ READY |
| `linh-daotruc` | Windows 11 | Antigravity | PASS | PASS | PASS | ✅ READY |
| `thuvutp-prog` | macOS | Antigravity | PASS | PASS | PASS | ✅ READY |

**Legend:** T1 = Workstation environment check · T2 = Seed generator & clean tree · T3 = AI agent read-back

---

## 2. T1 – Workstation Environment Check

**Command:** `uv run tools/check_env.py --repo`

All members ran the script at repository root and obtained **0 FAIL, 0 WARN**.

Representative output (`nguyenthu-0505`, Windows 11, run 30 Sep 2026):

```
DBIZ3 Session 6 environment check (path B)

  [PASS] Operating system      Windows 11 AMD64
  [PASS] Python (via uv)       3.13.9
  [PASS] Git                   2.55.0
  [PASS] Git identity          Ng Thu <ngtthuw245@gmail.com>
  [PASS] GitHub CLI            2.101.0
  [PASS] GitHub login          logged in
  [PASS] uv                    0.12.18
  [PASS] Node.js               24.19.0
  [PASS] Spec Kit (specify)    1.0.1
  [PASS] repo: AGENTS.md       present
  [PASS] repo: .agents/rules   present
  [PASS] repo: .specify        present
  [PASS] repo: docs/spec       present
  [PASS] repo: data            present
  [PASS] repo: .gitignore      present
  [PASS] repo: .gitattributes  present
  [PASS] repo: .env ignored    secrets excluded
  [PASS] repo: clean tree      nothing uncommitted

  0 FAIL, 0 WARN. Ready.
```

Tool versions confirmed across all workstations:

| Tool | Required | Confirmed |
|---|---|---|
| Python (via uv) | ≥ 3.11 | 3.13.9 |
| Git | ≥ 2.40 | 2.55.0 |
| GitHub CLI | ≥ 2.0 | 2.101.0 |
| uv | ≥ 0.5.0 | 0.12.18 |
| Node.js | ≥ 22.0.0 | 24.19.0 |
| Spec Kit (specify) | ≥ 1.0.1 | 1.0.1 |

---

## 3. T2 – Seed Generator & Tree Cleanliness

**Commands:**
```bash
python data/seed/generate_seed.py
git status --porcelain
```

**Results (run 30 Sep 2026):**
- `generate_seed.py` completed without error: **Generated 46 entity CSV files**
- All foreign-key and data-integrity assertions passed (exit code 0)
- `git status --porcelain` returned an empty string (clean working tree) on every member machine

---

## 4. T3 – AI Agent Read-Back Verification

**Test prompt sent to Antigravity on each member's workstation:**

> *"Read AGENTS.md, docs/prd.md, and docs/spec/. What is the authoritative source for requirements, what is the single source of truth for data, and what is the current MVP scope?"*

**Expected answer (derived from AGENTS.md §1):**
- Source of truth for requirements → `docs/spec/`
- Source of truth for data → `data/`
- Current step → Environment setup (Session 6); tech stack not yet decided

**Outcome:** All five Antigravity instances returned the correct answer.  
T3 answers from all members agree — no discrepancies found.

---

## 5. Discrepancy & Resolution Log

| # | Discrepancy Observed | Root Cause | Resolution |
|---|---|---|---|
| 1 | Line-ending differences between macOS (`linhkhanh-vu`) and Windows members | Default `git autocrlf` varies per OS | `.gitattributes` added: `* text=auto eol=lf` for all text files |
| 2 | Nested git clone during initial setup created duplicate `data/` folder | `git clone` run inside existing repo root | Consolidated into canonical `data/` folder; spec documents standardised |
| 3 | Antigravity rule not auto-loaded on first clone | Rule file not present by default | Added `.agents/rules/antigravity-rules.md`; confirmed auto-injection on all workstations |

All three discrepancies were resolved before the final smoke test. No open issues remain.

---

## 6. Repository Artefact Checklist

| Artefact | Path | Status |
|---|---|---|
| PRD / MVP Scope v3 | `docs/prd.md` | ✅ Present |
| Spec Document(s) | `docs/spec/specs/spec-*.md` | ✅ Present |
| Screen specs & mockups | `docs/spec/screens/` | ✅ Present |
| Data model with Mermaid ERD | `data/data-model-HAB.md` | ✅ Present |
| Schema | `data/schema/` | ✅ Present |
| Seed files, generator, README | `data/seed/` | ✅ Present |
| Agent contract | `AGENTS.md` | ✅ Complete |
| Spec Kit config | `.specify/` | ✅ Present |
| Antigravity rule | `.agents/rules/` | ✅ Present |
| Environment Readiness Report | `docs/env/readiness-report.md` | ✅ This file |
| AI use log | `docs/ai-use-log.md` | ⏳ Session 7 |
