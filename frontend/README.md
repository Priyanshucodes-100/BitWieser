# ChainWatch frontend

Offline investigation console for SIH 26146 (NTRO): ranked Bitcoin-traffic alerts, SHAP-like reasons, and link analysis. Synthetic **RansomPay** data only. Talks to the Fastify API on port 3001.

## Run

Start Postgres and the API first (see the repo root README), then:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. `VITE_API_URL` defaults to `http://localhost:3001`.

## Three-minute demo

1. **Ingest** → Load demo dataset (128 events) → **Generate data**.
2. **Alerts** → open **Entity-17** → walk the reason bars (`fan_out_speed`, `ip_reuse`, `mixer_proximity`, `country_hops`).
3. **Graph** → Vic → A → split → MixIn → Cash1. Click IP `103.21.8.44` in the inspector.

Press `/` to focus global search (txid / wallet / IP).

## Disclaimers

Network-layer IP is first-seen peer IP, not identity. Dataset is synthetic. No live-intercept or seized data.
