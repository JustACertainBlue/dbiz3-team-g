# Quickstart: Admin Dashboard (ADM) — Core Slice

This guide provides exact commands to set up, load seed data, run automated tests, and launch the Admin Dashboard (`ADM`) from a fresh clone on **macOS** and **Windows** using only free tools.

---

## 1. Prerequisites

- **Node.js**: `>= 22.0.0` (Free, available via [nodejs.org](https://nodejs.org))
- **Git**: `>= 2.40`
- **Python**: `>= 3.11` (or `uv`) for seed data validation
- **Web Browser**: Chrome, Edge, Firefox, or Safari

---

## 2. Setup from Fresh Clone

### macOS & Linux
```bash
# 1. Clone repository & switch to feature branch
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 003-adm-core

# 2. Install dependencies
npm install

# 3. Environment configuration
cp .env.example .env 2>/dev/null || cat << 'EOF' > .env
NODE_ENV=development
PORT=3000
DATABASE_URL=file:./dev.db
EOF
```

### Windows (PowerShell)
```powershell
# 1. Clone repository & switch to feature branch
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 003-adm-core

# 2. Install dependencies
npm install

# 3. Environment configuration
if (!(Test-Path .env)) {
@"
NODE_ENV=development
PORT=3000
DATABASE_URL=file:./dev.db
"@ | Out-File -FilePath .env -Encoding utf8
}
```

---

## 3. Seed Data Verification & Loading

Before launching or testing, verify the canonical synthetic seed data:

### macOS / Linux / Windows
```bash
python data/scripts/validate_seed.py
```
*Expected output*: `All 46 tables checked. Coverage, references and business-rule fixtures valid.`

To regenerate or refresh deterministic synthetic seed data if needed:
```bash
python data/scripts/generate_seed.py
```

---

## 4. Run Automated Tests (Test-First Verification)

Run the full automated test suite verifying business rules `BR-001` through `BR-019`:

### Run all ADM tests
```bash
npx vitest run tests/adm/
```

### Run by category
```bash
# 1. Business rules & scope guard unit tests (BR-001 .. BR-019)
npx vitest run tests/adm/unit/

# 2. HTTP REST API contract tests (/api/adm/* endpoints)
npx vitest run tests/adm/contract/

# 3. Integration & role-switching flow tests
npx vitest run tests/adm/integration/
```

---

## 5. Start the Application

Start the local development server:

```bash
npm run dev
```

The application is served at `http://localhost:3000`.

---

## 6. Interactive Demo Path (Screen ADM079)

Navigate to the Admin Dashboard in your browser:
**URL**: [http://localhost:3000/admin](http://localhost:3000/admin)

The persistent top banner (`RoleSwitcher`) allows one-click persona switching:

### Step 1: Monitor as HDT Admin (Platform-Wide Scope)
1. In the top bar, click **🏛️ HDT Admin**.
2. **Observe UI adaptations**:
   - The active persona displays `🏛️ HDT Admin · Sở Du lịch Hà Nội`.
   - **Village Filter**: The dropdown is active and defaults to `All Villages`.
   - **Metric Cards**: Display platform-wide totals across all craft villages:
     - `Total Agencies` (includes all canonical statuses)
     - `Total Providers` (platform-wide count)
     - `Total Bookings` (platform-wide in selected period)
     - `Active Collaborations` (all distinct pairs with active bookings)
   - **Top 10 Collaborations**: Shows the top 10 Agency–Provider pairs across the entire platform.
3. **Test Filter Recalculation**:
   - Select `Bát Tràng` in the village filter $\rightarrow$ Cards, charts, booking table, and top pairs recalculate specifically for Bát Tràng.
   - Switch the time filter from `Last 30 days` to `Last 7 days` $\rightarrow$ Trend line updates to daily granularity; card trend percentages update.

### Step 2: Monitor as UBND Admin (Strict Village Scope)
1. In the top bar, click **🏛️ UBND Admin**.
2. **Observe Scoping & Isolation**:
   - The active persona displays `🏛️ UBND Admin · Xã Bát Tràng (Hội đồng Thẩm định)`.
   - **Village Filter Locked**: The dropdown is pre-set to `Bát Tràng` and grayed out / disabled (`BR-002`, `BR-003`). The tooltip/label confirms fixed assigned village scope.
   - **Provider Metrics**: Only Local Providers located in Bát Tràng are counted.
   - **Booking Monitoring Table**: Only bookings for Bát Tràng craft experiences are displayed.
   - **Collaboration Top 10**: Only Agency–Provider partnerships involving Bát Tràng artisans appear (`BR-010`).
3. **Verify Server-Side Security Guard**:
   - Any client-side request attempting to pass another `village_id` is automatically overridden on the server side (`AC-ADM-SCOPE`), ensuring zero cross-village data leakage (`SC-007`).

### Step 3: Test Entity Intersections & Sorting
1. Filter by a specific Tour Agency (e.g. `Indochina Heritage Voyages`).
2. Filter by a specific Local Provider (e.g. `Xưởng Gốm Hưng Thịnh Bát Tràng`).
3. Observe `AND` intersection (`BR-014`): The booking table and collaboration lists display only records involving that exact pair.
4. Toggle Top Collaborations sort between **Frequency** (highest booking volume) and **Recency** (latest completed collaboration date).

### Step 4: Verify Read-Only Protection
1. Inspect the booking list rows $\rightarrow$ They are read-only summary records; no lifecycle control buttons (confirm, cancel, complete) or profile editing forms exist (`BR-006`, `BR-013`).
