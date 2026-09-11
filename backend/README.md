# ChainWatch API

Offline Fastify + PostgreSQL backend for SIH 26146 (NTRO). Synthetic RansomPay data only. No live intercept, no cloud intel APIs.

## Run

1. Start PostgreSQL (Docker or local).

```bash
# from repo root
docker compose up -d db
```

Local Postgres is fine too. Create a database matching `DATABASE_URL`.

2. Configure env and install.

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

API listens on `http://localhost:3001`. `GET /health` should return `{ "status": "ok", "offline": true, "service": "chainwatch-api" }`.

3. Frontend (separate terminal).

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Vite may proxy `/api` to `:3001`; the client uses `VITE_API_URL` (default `http://localhost:3001`).

Migrate also runs when the API starts, and seeds RansomPay (Entity-17) if the database is empty.

## Env

| Variable | Default |
| --- | --- |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgres://chainwatch:chainwatch@localhost:5432/chainwatch` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `UPLOAD_DIR` | `uploads` |

Capture files are stored under `backend/uploads/`.
