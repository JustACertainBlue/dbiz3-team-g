# Environment Readiness Report

**Project:** Hanoi Artisan Bridge (Team G)  
**Course:** DBIZ3 AI-native Product Development (VJCBI College, FTU)  
**Session:** Session 6 / Session 7 Midterm Readiness  
**Date:** 30 September 2026  
**Status:** All Members Ready (Pass)  

---

## 1. Member Readiness Summary

| Member Name | GitHub Account | OS | Access Path | T1 (Workstation) | T2 (Seed Clean) | T3 (Agent Read) | Overall Status |
|---|---|---|---|---|---|---|---|
| **Vũ Tuấn Phong** | `JustACertainBlue` | Windows 11 | Path B (Antigravity) | PASS | PASS | PASS | READY |
| **Vũ Khánh Linh** | `linhkhanh-vu` | macOS Sonoma | Path B (Antigravity) | PASS | PASS | PASS | READY |
| **Nguyễn Thu** | `nguyenthu-0505` | Windows 11 | Path B (Antigravity) | PASS | PASS | PASS | READY |
| **Đào Trúc Linh** | `linh-daotruc` | Windows 11 | Path B (Antigravity) | PASS | PASS | PASS | READY |
| **Vũ Thu Phương** | `thuvutp-prog` | Windows 11 | Path B (Antigravity) | PASS | PASS | PASS | READY |

*Note: All team members operate on Path B (Google Antigravity Agent) with identical tooling and access.*

---

## 2. Test Execution Details

### 2.1 Check T1: Workstation Environment Check
- **Command:** `uv run tools/check_env.py --repo`
- **Required Baseline:**
  - Python: `>= 3.11` (Python 3.12 verified via `uv`)
  - Git: `>= 2.40`
  - GitHub CLI (`gh`): `>= 2.0` (authenticated with team repo access)
  - Package Managers: `uv >= 0.5.0`, `node >= 22.0.0`
  - Spec Kit: `specify-cli >= 1.0.1`
- **Results:** 0 FAIL across all 5 member workstations.

### 2.2 Check T2: Seed Generator & Tree Cleanliness
- **Command:**
  ```bash
  python data/seed/generate_seed.py
  git status --porcelain
  ```
- **Validation:**
  - The deterministic synthetic seed script generates all 46 entity CSV tables.
  - Foreign key and data integrity assertions pass 100%.
  - Execution produces 0 git diff; `git status --porcelain` returns an empty string (clean working tree).

### 2.3 Check T3: AI Agent Read-Back Verification
- **Test Prompt:**  
  *"Read AGENTS.md, docs/prd.md, and docs/spec/docs/function-list.md. What is the authoritative source for requirements and what is the current MVP scope?"*
- **Outcome:**
  - The Antigravity agent on each member's machine correctly identified `docs/spec/` as the single source of truth for requirements and `data/` as the single source of truth for data.
  - No discrepancies between member environments.

---

## 3. Discrepancy & Resolution Log (Session 6 Setup)

| Discrepancy Observed | Root Cause | Resolution Applied |
|---|---|---|
| Line ending differences between macOS and Windows | Default git autocrlf variations across OS | `.gitattributes` added to enforce `* text=auto eol=lf` across all text files. |
| In-repo duplicate folder during initial clone | Nested git clone command executed inside existing root | Data package consolidated into canonical `data/` folder and spec documents standardized. |
| Agent rule activation mode | Antigravity always-on rule file not seeded by default | Added `.agents/rules/antigravity-rules.md` to workspace root for automatic rule injection. |
