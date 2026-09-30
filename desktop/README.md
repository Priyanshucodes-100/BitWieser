# ChainWatch desktop (extra)

This folder only wraps the existing project. It does **not** change `frontend/` or `backend/`.

Double-click **ChainWatch** on the other laptop. The same console opens in a window. No Node.js or Postgres install on that laptop after you copy the built app.

## On this computer (one-time)

```bash
cd desktop
npm install
npm start
```

`npm start` opens the window from the current repo.

## Build an installer for another laptop

Build on the **same OS** you will run it on. Postgres binaries inside the app are OS-specific.

```bash
cd desktop
npm install

npm run dist:win      # Windows → desktop/release/ChainWatch Setup 1.0.8.exe
npm run dist:mac      # macOS  → desktop/release/ChainWatch-1.0.0.dmg
npm run dist:linux    # Linux  → desktop/release/ChainWatch-1.0.0.AppImage
```

Copy that file to the other laptop. Install or double-click. ChainWatch starts.

## What the wrapper does

1. Starts a local Postgres if one is not already running (`localhost:5432`).
2. Starts your existing API on port `3001`.
3. Opens the same UI in a desktop window.

Still offline. Still the same ingest → generate → alerts / graph flow.
