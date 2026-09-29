# Approach, model, and explainability

Offline Bitcoin-traffic investigation. A capture file (CSV, JSON, or XML) is validated, enriched, clustered, scored, and shown as ranked leads with a link graph. No live chain and no cloud intel API.

## Approach

1. Ingest timestamp, src/dst IP and port, txid, input/output addresses and amounts, fee, and script type.
2. Fill missing country and ASN from a local GeoIP table (`backend/data/geoip/geoip.csv`). If MaxMind GeoLite2 Country CSV files are placed in that folder, those are used instead. If the file has no match, a first-octet fallback remains.
3. Cluster rows by first-seen source IP. Within a cluster, common-input ownership marks addresses that spend together on one transaction as one owner.
4. Score with explicit features, then an Isolation Forest trained on this file only.
5. Propagate a decayed risk one hop from a HIGH cluster to a linked cluster that shares an address or IP.
6. Show the ranked list, the reasons, the evidence transactions, and the graph.

## Model

Isolation Forest (unsupervised), fit on the clusters in the loaded file. Each cluster is an 11-number vector: fan-out, speed, IP reuse, IP churn, countries, amount, dust, mixer text, peel-chain depth, CoinJoin-like structure, and common-input size. A short path in the trees means the cluster is easier to isolate than the rest of the file, so it receives an anomaly score. That score is added to the rule score and written as a reason. The same file always gets the same score (seeded from the vectors). There is no pretrained cloud model.

## Explainability

Every flag keeps the rule that fired (peel chain, CoinJoin-like, shared inputs, fan-out, IP reuse, and the rest) plus the model line, which names the two strongest vector features. Risk propagation names the seed cluster. HIGH is confidence at least 0.75. MEDIUM is at least 0.40.

## What this is not

The IP is the first-seen peer, not a person. The GeoIP table is a network hint, not identity. Graph structure features are not a trained graph neural network.
