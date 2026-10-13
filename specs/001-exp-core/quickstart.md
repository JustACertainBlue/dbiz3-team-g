# Run EXP US-1 from a fresh clone

Requires Node.js >=22 and Python 3 or `uv`. Run from the repository root on Windows PowerShell or macOS Terminal.

```text
npm install
python data/scripts/validate_seed.py
npm test
npm run dev
```

If the laptop uses `uv` instead of a standalone Python command, run `uv run data/scripts/validate_seed.py`. Open `http://localhost:3000/explore`. The default is Guest. Use the on-page development demo control to view an approved synthetic Agency. Open a card preview and navigate to an Experience detail destination. Try the Guest quote/chat actions: they lead to Login. An empty result is demonstrated in automated tests.

The local adapter reads `data/seed/*.csv` directly, so no `psql` command or database credentials are needed for this Session 8 slice. `data/schema.sql` remains the canonical PostgreSQL schema. The seed has media metadata but no image binary objects; card artwork is a placeholder. The complete P1 Provider/Experience detail journeys and P2 personalization are future slices.
