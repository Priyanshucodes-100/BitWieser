# ChainWatch (SIH 26146 · NTRO)

Offline Bitcoin-traffic investigation console. Synthetic **RansomPay** data only.

IP is first-seen peer, not identity. No live intercept, no seized data, no cloud intel APIs.

## What it does

Load a capture (CSV / JSON / XML) or the demo dataset → **Generate data** → ranked entities with risk, filters, entity detail, and graphs.

## Run

You need **Node.js 20+** and **PostgreSQL 16**. Docker is optional.

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

## Env

**Backend** (`backend/.env`)

| Variable | Default |
| --- | --- |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgres://chainwatch:chainwatch@localhost:5432/chainwatch` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `UPLOAD_DIR` | `uploads` |

**Frontend** (`frontend/.env`)

| Variable | Default |
| --- | --- |
| `VITE_API_URL` | `http://localhost:3001` |

## Disclaimers

- Offline — synthetic data
- IP is first-seen peer, not identity
- No live-intercept or seized data
