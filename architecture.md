# Architecture

ChainWatch is a local investigation console. A capture file goes in. Ranked entities, written reasons, and a link graph come out. Nothing calls the live Bitcoin network or a cloud intel API.

```text
Browser or Electron window
        |
        | HTTP  (localhost:5173 dev, or same origin on :3001)
        v
Fastify API  :3001
        |
        |  ingest / generate / read
        v
PostgreSQL
        ^
        |
pipeline: validate -> geo/ASN -> cluster by src_ip
          -> rules + Isolation Forest -> risk hop -> graphs
```

## Runtime modes

All three modes use the same API and the same pipeline.

| Mode | How it starts | Who it is for |
| --- | --- | --- |
| Dev | `frontend` on port 5173, `backend` on port 3001 | Working on the code |
| Live, no Docker | `npm run live` from the repo root | A browser on one URL |
| Desktop | Electron in `desktop/` | A double-click app with its own Postgres |

In dev, if nothing is listening on port 5432, `npm run dev` in `backend/` starts a bundled Postgres on port 54329. That data lives in `.pgdata-live/` and is not committed. The desktop app uses its own embedded Postgres and does not talk to the hosted site.

`VITE_API_URL` defaults to `http://localhost:3001`. An empty value means the page and the API share one origin, which is how `npm run live` is built.

## UI

React 18, TypeScript, Vite, Tailwind 4, React Router 6. Cytoscape draws the graphs.

| Route | Page | What it reads |
| --- | --- | --- |
| `/` | Overview | `GET /overview`, plus the Entity-17 graph |
| `/ingest` | Ingest | `POST /ingest`, then `POST /generate` |
| `/alerts` | Alerts | `GET /alerts` |
| `/alerts/:id` | Alert detail | `GET /alerts/:id` and that entity's graph |
| `/entities/:id` | Entity | `GET /entities/:id` and `GET /graph?entityId=` |
| `/graph` | Link analysis | `GET /graph` |
| `/about` | About | Static copy |

Shared chrome is `AppShell`: nav, search, Offline badge, theme toggle. Country codes stay in the API. `countryName` in `frontend/src/lib/format.ts` turns them into English names on screen.

Scoring does not run in the browser. The UI shows reasons the API stored.

## API

Fastify on port 3001.

| Method | Path | Role |
| --- | --- | --- |
| GET | `/health` | API and Postgres are up |
| POST | `/ingest` | Store a file or the demo |
| POST | `/generate` | Start scoring |
| GET | `/generate/:jobId` | Poll until `done` or `error` |
| GET | `/overview` | Counts and top alerts |
| GET | `/alerts` | Filtered alert list |
| GET | `/alerts/:id` | One alert |
| GET | `/entities/:id` | Entity detail |
| GET | `/graph` | Overview graph, or one cluster with `?entityId=` |
| GET | `/search` | Header search |

## Generate pipeline

`backend/src/services/pipeline.ts` runs after ingest.

1. Keep rows that have a usable `src_ip` or `txid`.
2. Fill missing country and ASN from `backend/data/geoip/geoip.csv`. GeoLite2 CSVs in that folder win if both are present. Otherwise a first-octet fallback remains.
3. Group rows by first-seen `src_ip`. One IP is one entity.
4. Add rule reasons: fan-out speed, IP reuse, IP churn, country hops, large amount, dust, mixer text.
5. Add pattern reasons from `backend/src/ml/patterns.ts`: peel chain, CoinJoin-like structure, common-input ownership.
6. Fit an Isolation Forest on this file only (`backend/src/ml/isolationForest.ts`). An unusual cluster gets an anomaly reason added to the rule score.
7. If a cluster shares an address or IP with a HIGH cluster, add a one-hop propagated score.
8. HIGH is confidence at least 0.75. MEDIUM is at least 0.40. Otherwise LOW.
9. Build a neighborhood graph per entity and a capped overview graph of the highest-risk clusters.

## Database

PostgreSQL. Payloads are JSON. The schema is in `backend/src/db/schema.ts`.

| Table | Holds |
| --- | --- |
| `ingest_jobs` | One loaded file or the demo |
| `events` | Parsed capture rows for that ingest |
| `generate_jobs` | Status of a scoring run |
| `entity_rows` | Ranked table for that run |
| `entity_details` | Wallets, IPs, timeline, reasons |
| `graphs` | Per-entity graph and the overview graph |
| `alerts` | Ranked alerts for that run |
| `app_state` | Which ingest and generate are current |

An empty database is seeded with the RansomPay demo (`entity-17`) from `backend/src/seed/demoDataset.ts`.

## Folders

| Path | Role |
| --- | --- |
| `frontend/src/pages` | Screens |
| `frontend/src/components` | Graph, tables, layout, shared controls |
| `frontend/src/api/client.ts` | HTTP calls |
| `backend/src/routes` | HTTP entry |
| `backend/src/services` | Ingest, generate, pipeline, reads |
| `backend/src/ml` | Features and Isolation Forest |
| `backend/src/db` | Pool, schema, queries |
| `desktop/` | Electron wrapper |
| `scripts/` | Live server and bundled Postgres |
| `docs/approach.md` | Model and explainability write-up |
