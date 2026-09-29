# Memory

Decisions and facts that should survive a new chat. Add a dated line when something important changes.

## Names

- UI title: ChainWatch
- GitHub: https://github.com/Priyanshucodes-100/BitWieser (`main`)
- Demo case: RansomPay, seeded entity `entity-17`

## Product decisions

- IP is the first-seen peer, not identity. Synthetic data only. No live intercept.
- Clustering key is first-seen `src_ip`. One IP with many transactions is one entity, not dropped data.
- Rules stay visible. Isolation Forest is fit per file on an 11-number vector and adds an "Anomaly model" reason. It does not replace the rules.
- HIGH is at least 0.75. MEDIUM is at least 0.40.
- Mixer proximity still includes a text check for `mix`, plus a separate CoinJoin-like check. Do not call either a mixer registry.
- Country and ASN: file value wins, then `backend/data/geoip/geoip.csv`, then a first-octet fallback. GeoLite2 CSVs in that folder replace the small CSV. The UI shows full country names. Filters still use the code.
- Large ingest graphs show the top-risk slice. Opening a row shows that cluster.
- Overview page graph is still wired to `entity-17` for the picture. KPIs do follow the latest generate. That mismatch is an open task.

## Runtime

- API: `http://127.0.0.1:3001`. UI dev server: `http://localhost:5173`.
- `npm run dev` in `backend/` starts bundled Postgres on port 54329 when 5432 is closed. Data directory: `.pgdata-live/` (not committed).
- A blank page with "Failed to fetch GraphView" was a stuck Vite dependency cache for Cytoscape, not a missing feature. Restart Vite after clearing `frontend/node_modules/.vite` if it happens again. The graph is imported with the page, not as a lazy chunk.
- Do not commit installers, `.env`, or upload dumps.

## 2026-09-30

- Added the six guide files: `PRD.md`, `architecture.md`, `rules.md`, `design.md`, `tasks.md`, `memory.md`.
- `architecture.md` describes the three run modes, the page-to-API map, the generate pipeline, and the Postgres tables.
- Country dropdown and hop paths show English names (India, Netherlands, and so on).
