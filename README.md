# ChainWatch

Offline Bitcoin-traffic investigation console. Synthetic **RansomPay** data only.

IP is first-seen peer, not identity. No live intercept, no seized data, no cloud intel APIs.

## What it does

Load a capture (CSV / JSON / XML) or the demo dataset → **Generate data** → ranked entities with risk, filters, entity detail, and graphs.

## Live (browser URL, no Docker)

Need **Node.js 20+** only. Visitors open the URL in a browser. They do not install Docker or Node.

On the machine that will serve it:

```bash
cd <this-repo>
npm install
npm run live
```

Open `http://127.0.0.1:3001`. First run prepares a local database and builds the UI (a few minutes). After that, `npm run live` is enough.

If that PC is on a network, others can use `http://<that-pc-ip>:3001` while this command is running. Stop it with Ctrl+C.

Cloud hosts (Render, Railway, a VPS) set `DATABASE_URL` and `PORT`; `npm run live` then uses that database instead of the bundled one.

Docker is optional: `docker compose -f docker-compose.yml -f docker-compose.live.yml up -d --build`

## Offline (what you already use)

Keep using the **desktop installer** or local `npm run dev`. That path does not talk to the hosted site. Files and the database stay on your laptop.

Local Vite on 5173 is unchanged: backend + frontend as below. Postgres is optional if you use `npm run live`.


### 1. Postgres

```bash
docker compose up -d db
```

Or any local Postgres. Default URL:

`postgres://chainwatch:chainwatch@localhost:5432/chainwatch`

### 2. Backend (`http://localhost:3001`)

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Health check:

`GET http://localhost:3001/health` → `{ "status": "ok", "offline": true, "service": "chainwatch-api" }`

Migrate also runs when the API starts. An empty database is seeded with the RansomPay demo (Entity-17).

### 3. Frontend (`http://localhost:5173`)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

`VITE_API_URL` defaults to `http://localhost:3001`.

## Demo

1. **Ingest** → Load demo dataset, or upload `backend/fixtures/sample-capture.xml`.
2. **Generate data**.
3. Open an entity for wallets, IPs, timeline, risk, and that cluster’s graph.
4. **Alerts** / **Graph** — Entity-17 is the seeded HIGH layering lead until you generate from a loaded capture.

## Layout

| Path | Role |
| --- | --- |
| `frontend/` | React 18 + Vite + TypeScript console |
| `backend/` | Fastify API + Postgres |
| `backend/fixtures/` | Sample CSV / XML captures |
| `docker-compose.yml` | Local Postgres 16 |
| `docker-compose.live.yml` | Hosted UI + API (does not replace the desktop app) |

## Env

**Backend** (`backend/.env`)

| Variable | Default |
| --- | --- |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgres://chainwatch:chainwatch@localhost:5432/chainwatch` |
| `HOST` | `0.0.0.0` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `UPLOAD_DIR` | `uploads` |
| `FRONTEND_DIST` | empty (set to frontend `dist` to serve UI on the API port) |

**Frontend** (`frontend/.env`)

| Variable | Default |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3001` (empty = same origin, for live Docker) |

## Disclaimers

- Offline — synthetic data
- IP is first-seen peer, not identity
- No live-intercept or seized data
