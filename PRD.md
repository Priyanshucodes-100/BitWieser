# Product

ChainWatch is an offline investigation console for Bitcoin network-traffic captures. An analyst loads a file and gets ranked entities, written reasons, and a link graph. The product name in the UI is ChainWatch. The GitHub repo is BitWieser.

## Problem

A capture is a pile of timestamps, peer IPs, ports, transaction IDs, addresses, and amounts. Manual hop-following does not scale. Cloud chain-analytics tools assume identity labels and a network connection this setting does not have.

## Users

An analyst reviewing a synthetic or lab capture on a local or air-gapped machine. They need leads they can defend in a review, not a named person behind an address.

## What it does

1. Ingest CSV, JSON, or XML, or load the synthetic RansomPay demo.
2. Validate rows and fill missing country and ASN from a local GeoIP table.
3. Cluster rows by first-seen source IP. That IP is a peer observation, not identity.
4. Score each cluster with explicit rules and an Isolation Forest fit on that file only.
5. Detect peel chains, CoinJoin-like transactions, and common-input ownership.
6. Pass a smaller risk score one hop from a HIGH cluster to a linked cluster.
7. Show a ranked table, alerts, an entity page (wallets, IPs, timeline, reasons), and a Cytoscape graph.

## Risk bands

- HIGH: confidence at least 0.75
- MEDIUM: at least 0.40
- LOW: below 0.40

A flag is a lead. It is not proof.

## Out of scope

- Live Bitcoin network, mempool, or chain APIs
- Cloud intel or attribution APIs
- Login, payments, or multi-user accounts
- Identifying the person behind an IP
- Drawing every cluster from a large file on one canvas (the overview shows the highest-risk slice)

## Success

An analyst can load a capture, generate leads, open one entity, read why it was flagged, and click the graph, with no internet.
