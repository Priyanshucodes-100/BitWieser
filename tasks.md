# Tasks

Work one open task at a time. Do not rebuild finished items.

## Done

- Ingest CSV, JSON, XML, and the demo dataset
- Generate job with ranked entities, alerts, entity detail, and graph
- Rule score plus Isolation Forest, peel chain, CoinJoin-like, common-input, and one-hop risk propagation
- Local GeoIP table and country names in the UI
- About page with the lead flow, risk bands, and limits
- Desktop installer and `npm run live` without Docker
- Overview graph capped so a large file still draws

## Open

1. Export the ranked table and the top reasons as a JSON file from the UI.
2. Point the Overview graph at the hottest cluster from the last generate, not only the seeded Entity-17 graph when a new file has been generated.
3. Add a few backend tests around `scoreCluster` and one known capture that must come out HIGH and layering.
4. Bind the packaged desktop API to `127.0.0.1` only, matching the offline story.

## Not tasks

Login, payments, a live Bitcoin node, a new page set, or a visual redesign.
