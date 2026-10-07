# Quickstart: 001-ait-core (AI Tour Matching)

This guide provides exact commands to set up, seed, test, and run the feature slice from a fresh clone on **macOS** and **Windows** using only free tools.

---

## 1. Prerequisites

- **Node.js**: `>= 22.0.0` (Free, available via [nodejs.org](https://nodejs.org))
- **Git**: `>= 2.40`
- **Python** (for running the synthetic seed validation script in `data/`): `>= 3.11` (or `uv`)

---

## 2. Setup from Fresh Clone

### macOS & Linux
```bash
# 1. Clone & checkout branch
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 001-ait-core

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env 2>/dev/null || cat << 'EOF' > .env
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=mock-key-for-test
DATABASE_URL=file:./dev.db
EOF
```

### Windows (PowerShell)
```powershell
# 1. Clone & checkout branch
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 001-ait-core

# 2. Install dependencies
npm install

# 3. Environment configuration
if (!(Test-Path .env)) {
@"
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=mock-key-for-test
DATABASE_URL=file:./dev.db
"@ | Out-File -FilePath .env -Encoding utf8
}
```

---

## 3. Seed Data Verification & Loading

Verify the canonical synthetic seed data before running tests:

### macOS / Linux / Windows
```bash
python data/scripts/validate_seed.py
```
*Expected output: All 46 CSV tables validated, foreign keys intact, 0 errors.*

---

## 4. Run Automated Tests (Test-First Verification)

Run the full automated test suite verifying business rules `BR-001` through `BR-022`:

```bash
# Run all tests
npm test

# Run contract tests only
npx vitest run tests/contract/

# Run business rules unit tests only
npx vitest run tests/unit/
```

### Seed Data Assertion Check
Included automated test fixture loads canonical seed data from `data/seed/` and validates:
- Exactly 4 verified villages exist in Hanoi (`Bat Trang`, `Van Phuc`, `Duong Lam`, `Chuong`).
- Seeded verified experiences belong to verified providers.

---

## 5. Start the Application

Start the local development server:

```bash
npm run dev
```

Open your browser at:
- **Matching Interface (Screen AIT121)**: `http://localhost:3000/ai-matching`
- **Health Check & API**: `http://localhost:3000/api/ait/sessions`
