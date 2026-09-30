# ChainWatch API

Fastify and PostgreSQL. The screen talks to this API on port 3001.

## Run

From the project folder, `npm run live` starts this API and the screen together.

To run the API on its own:

```bash
cd backend
npm install
npm run dev
```

If PostgreSQL is not already running, `npm run dev` starts a local database. You can also point `DATABASE_URL` in `.env` at a Postgres you installed yourself.

`GET http://127.0.0.1:3001/health` returns `{ "status": "ok", "offline": true, "service": "chainwatch-api" }`.

An empty database is filled with the demo case (Entity-17) on first start.

## Env

| Variable | Default |
| --- | --- |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgres://chainwatch:chainwatch@localhost:5432/chainwatch` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `UPLOAD_DIR` | `uploads` |

Capture files are stored under `backend/uploads/`.
