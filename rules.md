# Rules for changes

Read `PRD.md`, `architecture.md`, and `design.md` before editing. Do one item from `tasks.md` at a time. After a decision or a bug, add a short note to `memory.md`.

## Do

- Keep the product offline. Synthetic or user-supplied capture files only.
- Treat IP as the first-seen peer, not a person. Keep the banner and About limits.
- Keep existing pages and the current visual system. Extend them. Do not invent a new layout.
- Put scoring, clustering, and graph payloads in the backend pipeline.
- Show country names in the UI through `countryName` / `countryPath` in `frontend/src/lib/format.ts`. Keep stored values as ISO codes so filters still match.
- When a HIGH result is added, give it a written reason the analyst can read.
- Typecheck the package you edit (`npx tsc -b` in `frontend`, `npx tsc --noEmit` in `backend`).
- After a UI change, check the affected page in the browser.
- Commit source only. Do not commit `.env`, `uploads/`, `node_modules`, `dist`, `desktop/release`, `desktop/pack`, or `.pgdata-live`.

## Do not

- Add login, payments, live chain access, or cloud intel APIs.
- Claim FastAPI, MaxMind-as-already-running, or a pretrained neural net. Isolation Forest in `backend/src/ml` is the model. GeoIP is the local CSV, with a first-octet fallback.
- Replace the rule score with a black box. The model adds a reason. It does not hide the rules.
- Draw every cluster from a large file on one canvas. Keep the overview cap.
- Rename ChainWatch in the UI, or restyle buttons, type, and color on a whim.
- Force-push `main`.

## Errors

- API errors return `{ message }` and a proper status. The UI uses the existing error state, not a new toast system, unless that page already uses toasts.
- If Postgres is down, `npm run dev` in `backend/` should start the bundled database. Do not require Docker.

## Libraries already in use

React, Vite, Tailwind, Cytoscape, Lucide, Fastify, `pg`, `fast-xml-parser`. Do not add a second UI kit or a second graph library.
