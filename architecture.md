# Architecture

## Flow

1. The browser (or the Electron window) calls the Fastify API.
2. `POST /ingest` stores the capture in PostgreSQL.
3. `POST /generate` starts a job. The client polls `GET /generate/:jobId`.
4. The pipeline validates rows, enriches geo and ASN, clusters by first-seen `src_ip`, scores rules, fits Isolation Forest, propagates risk, and stores entities, alerts, and graphs.
5. Overview, Alerts, Entity, and Graph pages read those rows. Country codes are turned into names only in the UI.

## Stack

| Part | Choice |
| --- | --- |
| UI | React 18, TypeScript, Vite, Tailwind 4, React Router 6, Cytoscape |
| API | Fastify 5, TypeScript, port 3001 |
| Database | PostgreSQL. Dev can use a bundled database when port 5432 is down. Desktop uses embedded Postgres. |
| Desktop | Electron wrapper in `desktop/`. It does not replace the web app. |

There is no Python service and no cloud model API.

## Folders

| Path | Role |
| --- | --- |
| `frontend/src/pages` | Overview, Ingest, Alerts, Entity, Graph, About |
| `frontend/src/components` | Graph, tables, layout, shared UI |
| `frontend/src/api` | HTTP client and a client-side copy of graph building |
| `frontend/src/lib` | Formatting, including country names |
| `frontend/src/theme` | Palette and disclaimers |
| `backend/src/routes` | HTTP routes |
| `backend/src/services/pipeline.ts` | Validate, cluster, score, graph |
| `backend/src/ml` | Feature vector, peel / CoinJoin / common-input, Isolation Forest |
| `backend/src/lib/geoip.ts` | Local GeoIP lookup |
| `backend/data/geoip` | `geoip.csv`, or GeoLite2 CSVs if dropped in |
| `desktop/` | Windows installer wrapper |
| `scripts/` | `npm run live` and the no-Docker database starter |
| `docs/approach.md` | Model and explainability write-up |

## How pieces connect

- Frontend `VITE_API_URL` defaults to `http://localhost:3001`. An empty value means same origin (used when the API also serves the built UI).
- API `DATABASE_URL` points at Postgres. `npm run dev` in `backend/` starts a bundled database on port 54329 when nothing is listening on 5432.
- `npm run live` from the repo root builds the UI and serves UI plus API on port 3001.
- Scoring lives in the backend. The UI displays the stored reasons. Do not reimplement scoring in React.

## API

`GET /health`, `POST /ingest`, `POST /generate`, `GET /generate/:jobId`, `GET /overview`, `GET /alerts`, `GET /alerts/:id`, `GET /entities/:id`, `GET /graph`, `GET /search`.
