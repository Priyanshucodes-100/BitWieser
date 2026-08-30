# ChainWatch frontend

Offline investigation console for SIH 26146 (NTRO): ranked Bitcoin-traffic alerts, SHAP-like reasons, and link analysis. Synthetic **RansomPay** data only. No backend, no cloud APIs, no CDN fonts.

## Run

```bash
cd frontend
npm install
npm run dev
```

If you use pnpm:

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Desktop-first (1920 / 1366; usable at 1280).

## Three-minute demo

1. **Ingest** → Load demo dataset (mock, 128 events).
2. **Alerts** → open **Entity-17** → walk the reason bars (`fan_out_speed`, `ip_reuse`, `mixer_proximity`, `country_hops`).
3. **Graph** → Vic → A → split → MixIn → Cash1. Click IP `103.21.8.44` in the inspector.

Press `/` to focus global search (txid / wallet / IP).

## Layout

| Path | Role |
| --- | --- |
| `src/types/intel.ts` | Shared types (Fastify contract shapes) |
| `src/mocks/demoDataset.ts` | RansomPay story + 128-event synthetic set |
| `src/api/client.ts` | Promise mock for `/ingest`, `/alerts`, `/graph/:entityId`, `/health` |
| `src/pages/` | Routes |
| `src/components/graph/` | Cytoscape canvas + inspector |
| `src/components/intel/` | Alerts table + explainability |

Swap `src/api/client.ts` to a Fastify `baseURL` later. JSON shapes stay the same.

## Disclaimers

Network-layer IP is first-seen peer IP, not identity. Dataset is synthetic. No live-intercept or seized data.
