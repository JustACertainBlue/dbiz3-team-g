# Run the EXP prototype

Requires Node.js 22 or newer and Python 3 or `uv`. Run from the repository root:

```text
npm install
python data/scripts/validate_seed.py
npm test
npm run lint
npm run dev
```

If the laptop uses `uv` instead of standalone Python, run `uv run data/scripts/validate_seed.py`. Open `http://localhost:3000/explore`. Browse as Guest, open a card, Provider profile and Experience detail. Guest pricing and contact information remain hidden; Quote/Chat lead to Login. To inspect approved Agency-only fields and local personalization, use **Dùng doanh nghiệp mẫu**. This development control uses synthetic data and is disabled in production. Select a category to create an explicit preference signal and observe Agency-only re-ranking. Guest analytics require the opt-in checkbox; without it, browsing still works and nonessential events are not recorded.

The local prototype reads `data/seed/*.csv`. New interactions, preference changes and ranking exposures are held in the development server's memory and disappear on restart. `data/schema.sql` remains the canonical PostgreSQL schema; this prototype does not claim durable database integration. Media metadata exists, but image binaries are not supplied, so the UI uses placeholders. Quote/Chat need Auth and Chat adapters before their buttons can be enabled for a real Agency.

Read [implementation-status.md](implementation-status.md) before marking any EXP story complete. Pure ranking, assessment and optimization rules are covered by `npm test`; weekly scheduling, atomic database promotion, complete detail-visit capture and live rollback are not wired in this prototype.
