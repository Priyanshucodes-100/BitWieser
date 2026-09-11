export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS ingest_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  case_name TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  parse_errors INTEGER NOT NULL DEFAULT 0,
  geoip_enriched INTEGER NOT NULL DEFAULT 0,
  last_ingest_at TIMESTAMPTZ,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  ingest_id TEXT NOT NULL REFERENCES ingest_jobs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (ingest_id, seq)
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generate_jobs (
  id TEXT PRIMARY KEY,
  ingest_id TEXT NOT NULL REFERENCES ingest_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  step TEXT,
  error TEXT,
  event_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_rows (
  generate_id TEXT NOT NULL REFERENCES generate_jobs(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (generate_id, entity_id)
);

CREATE TABLE IF NOT EXISTS entity_details (
  scope TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (scope, entity_id)
);

CREATE TABLE IF NOT EXISTS graphs (
  scope TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (scope, entity_id)
);

CREATE TABLE IF NOT EXISTS alerts (
  scope TEXT NOT NULL,
  id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (scope, id)
);

CREATE INDEX IF NOT EXISTS events_ingest_idx ON events (ingest_id);
CREATE INDEX IF NOT EXISTS alerts_scope_rank_idx ON alerts (scope, rank);
CREATE INDEX IF NOT EXISTS entity_rows_rank_idx ON entity_rows (generate_id, rank);
`
