# ChainWatch

ChainWatch is an offline tool for looking at Bitcoin traffic captures. You load a file, and it turns the rows into a short list of leads. Each lead has a reason and a picture of the links.

The IP in a row is the peer that was seen first. It is not a person's identity. The app does not connect to the live Bitcoin network, and it does not call any cloud lookup service.

## What you can do with it

1. Load a CSV, JSON, or XML capture, or use the built-in demo.
2. Press **Generate data**.
3. Read the ranked list. HIGH means the score is 0.75 or more. MEDIUM is 0.40 or more.
4. Open a lead to see why it was flagged, the wallets, the timeline, and the graph.

## How a file is handled

1. **Load.** The file is read. A row is kept only if it has a usable source IP or transaction id.
2. **Fill gaps.** If the country or network owner is missing, it is filled from a list stored in `backend/data/geoip/geoip.csv`.
3. **Group.** Rows with the same first-seen source IP become one entity. Addresses that spend together on one transaction are treated as one owner.
4. **Score.** Written checks cover fast splits, the same IP showing up again, country changes, large or tiny amounts, peel chains, and CoinJoin-like patterns. An Isolation Forest then marks groups that look unusual in this file. A high-risk group can pass a smaller score one step to a linked group.
5. **Save and show.** The leads and the graph are stored in PostgreSQL. You review them in the app.

A flag is something to look at. It is not proof.

## Use the desktop app

On Windows, install **ChainWatch Setup** from `desktop/release` on the machine that built it, or build it yourself (see below). Open ChainWatch from the Start menu. You do not need to install Node.js, Docker, or PostgreSQL. The app keeps its own database on that computer.

## Run it from the code

You need Node.js 20 or newer.

From the project folder:

```bash
npm install
npm run live
```

The first run sets up a local database and builds the screen. That can take a few minutes. Then open `http://127.0.0.1:3001`. Stop it with Ctrl+C.

If you want the screen and the API in two terminals instead:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The API is on port 3001. `npm run dev` in `backend` starts a database for you if one is not already running.

## Screens

| Screen | What it is for |
| --- | --- |
| Overview | Counts, top leads, and one cluster graph |
| Ingest | Load a file or the demo, then generate |
| Alerts | Filter the ranked list |
| Entity | The reason, wallets, IPs, and timeline |
| Graph | The links. Click a node to read it |
| About | How scoring works, and the limits |

## Project folders

| Folder | What is in it |
| --- | --- |
| `frontend/` | The screen (React, Vite, TypeScript) |
| `backend/` | The API (Fastify) and the scoring |
| `backend/fixtures/` | Small sample capture files |
| `backend/data/geoip/` | The offline country and network list |
| `desktop/` | The Windows app wrapper |
| `docs/` | Notes on the approach, design, and open tasks |

## Settings

Copy `backend/.env.example` to `backend/.env` if you want to change the defaults.

| Setting | Usual value |
| --- | --- |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgres://chainwatch:chainwatch@localhost:5432/chainwatch` |
| `CORS_ORIGIN` | `http://localhost:5173` |

The screen uses `VITE_API_URL` in `frontend/.env`. Leave it as `http://localhost:3001` when you run the two terminals. `npm run live` talks to the API on the same address, so it does not need that setting.

## Build the Windows installer

From `desktop`, after `npm install`:

```bash
npm run dist:win
```

The setup file is written for Windows. Install that file on the other computer. It does not need Node.js.
