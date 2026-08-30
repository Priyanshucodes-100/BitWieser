import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { FileJson, FileSpreadsheet, FileCode2 } from 'lucide-react'
import { generateFromLoaded, ingestMock, loadCaptureFile } from '@/api/client'
import { GENERATE_STEPS } from '@/api/pipeline'
import { GraphView } from '@/components/graph/GraphCanvas'
import { EntitiesTable, filterEntityRows, sortEntityRows, type EntitySortKey } from '@/components/intel/EntitiesTable'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/primitives'
import { useAppState } from '@/context/AppState'
import { formatTs } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AlertType, EntityTableRow, GraphPayload, RiskLevel } from '@/types/intel'

const ACCEPTED = ['.csv', '.json', '.xml'] as const

const FIELDS: Array<{ name: string; example: string; required: string }> = [
  { name: 'timestamp', example: '2026-08-19T10:01:02Z', required: 'yes' },
  { name: 'src_ip', example: '103.21.8.44', required: 'yes' },
  { name: 'dst_ip', example: '185.64.1.10', required: 'yes' },
  { name: 'src_port', example: '49122', required: 'yes' },
  { name: 'dst_port', example: '8333', required: 'yes' },
  { name: 'txid', example: 'a11ce01d…1001', required: 'yes' },
  { name: 'input_addresses[]', example: 'bc1qvic…', required: 'yes' },
  { name: 'output_addresses[]', example: 'bc1qa000…', required: 'yes' },
  { name: 'input_amounts[]', example: '2.4012', required: 'yes' },
  { name: 'output_amounts[]', example: '2.4', required: 'yes' },
  { name: 'fee', example: '0.00012', required: 'yes' },
  { name: 'script_type', example: 'p2wpkh', required: 'no' },
  { name: 'geo_country', example: 'IN', required: 'enriched' },
  { name: 'asn', example: 'AS24560', required: 'enriched' },
]

const RISK_OPTS: Array<RiskLevel | 'ALL'> = ['ALL', 'HIGH', 'MEDIUM', 'LOW']
const TYPE_OPTS: Array<AlertType | 'ALL'> = ['ALL', 'layering', 'ip-reuse', 'mixer-proximity', 'anomaly']

export function IngestPage() {
  const { ingest, setIngest, pushToast, selectNode } = useAppState()
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [datasetReady, setDatasetReady] = useState(true)
  const resultsRef = useRef<HTMLElement | null>(null)
  const [generateStep, setGenerateStep] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [results, setResults] = useState<EntityTableRow[] | null>(null)
  const [overviewGraph, setOverviewGraph] = useState<GraphPayload | null>(null)
  const [risk, setRisk] = useState<RiskLevel | 'ALL'>('ALL')
  const [type, setType] = useState<AlertType | 'ALL'>('ALL')
  const [country, setCountry] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<EntitySortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const loadFile = useCallback(
    async (file?: File) => {
      if (!file) return
      const lower = file.name.toLowerCase()
      if (!ACCEPTED.some((ext) => lower.endsWith(ext))) {
        pushToast({
          tone: 'warn',
          title: 'Unsupported file',
          body: 'Accepts .csv, .json, or .xml.',
        })
        return
      }
      setBusy(true)
      setGenerateError(null)
      setResults(null)
      setOverviewGraph(null)
      try {
        const res = await loadCaptureFile(file)
        setIngest(res.data)
        setDatasetReady(true)
        pushToast({ tone: 'ok', title: res.message })
      } catch (err) {
        setDatasetReady(false)
        setGenerateError(err instanceof Error ? err.message : 'Failed to load the capture file.')
      } finally {
        setBusy(false)
      }
    },
    [pushToast, setIngest],
  )

  const loadDemo = useCallback(async () => {
    setBusy(true)
    setGenerateError(null)
    setResults(null)
    setOverviewGraph(null)
    try {
      const res = await ingestMock()
      setIngest(res.data)
      setDatasetReady(true)
      pushToast({ tone: 'ok', title: res.message })
    } catch (err) {
      setDatasetReady(false)
      setGenerateError(err instanceof Error ? err.message : 'Failed to load the demo dataset.')
    } finally {
      setBusy(false)
    }
  }, [pushToast, setIngest])

  const generate = useCallback(async () => {
    setBusy(true)
    setGenerateError(null)
    setGenerateStep(GENERATE_STEPS[0] ?? 'Validating records')
    try {
      const res = await generateFromLoaded((step) => setGenerateStep(step))
      setDatasetReady(true)
      setResults(res.rows)
      setOverviewGraph(res.graph)
      setIngest({
        ...ingest,
        loaded: true,
        lastIngestAt: new Date().toISOString(),
        eventCount: res.eventCount,
      })
      window.setTimeout(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        resultsRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      }, 50)
    } catch (err) {
      setResults(null)
      setOverviewGraph(null)
      setGenerateError(
        err instanceof Error
          ? err.message
          : 'Generation failed. The backend could not validate, enrich, or score this dataset.',
      )
    } finally {
      setBusy(false)
      setGenerateStep(null)
    }
  }, [ingest, setIngest])

  const countries = useMemo(() => {
    const set = new Set<string>()
    for (const row of results ?? []) {
      for (const hop of row.countryHops) set.add(hop)
    }
    return ['ALL', ...[...set].sort()]
  }, [results])

  const visibleRows = useMemo(() => {
    if (!results) return []
    return sortEntityRows(
      filterEntityRows(results, { risk, type, country, dateFrom, dateTo, minAmount, q }),
      sortBy,
      sortDir,
    )
  }, [results, risk, type, country, dateFrom, dateTo, minAmount, q, sortBy, sortDir])

  const onSort = (col: EntitySortKey) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(col)
      setSortDir(col === 'rank' || col === 'entity' ? 'asc' : 'desc')
    }
  }

  return (
    <div>
      <PageHeader kicker="Ingest" title="Load capture" description="Load a dataset, then generate scored entities." />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              void loadFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'grid place-items-center rounded-[12px] border px-6 py-16 text-center',
              dragOver ? 'bg-[var(--cw-raised-hover)]' : 'bg-[var(--cw-raised)]',
            )}
            style={{ borderColor: 'var(--cw-border)' }}
          >
            <p className="label">Drop capture</p>
            <p className="mt-2 text-sm text-beige-muted">CSV / JSON / XML</p>
            <label className="btn-pill btn-pill-primary mt-5 cursor-pointer">
              Choose file
              <input
                type="file"
                accept=".csv,.json,.xml"
                className="sr-only"
                aria-label="Upload capture file"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  void loadFile(file)
                }}
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadDemo()}
              className="btn-pill btn-pill-ghost mt-3"
            >
              {busy && !generateStep ? 'Loading…' : 'Load demo dataset'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              className="btn-pill btn-pill-primary mt-3"
            >
              {generateStep ? generateStep : 'Generate data'}
            </button>
            {!datasetReady ? (
              <p className="mt-2 text-xs text-beige-muted">Load a file or the demo dataset before generating.</p>
            ) : (
              <p className="mt-2 text-xs text-beige-muted">{ingest.datasetName} loaded · {ingest.eventCount} rows</p>
            )}
            <div className="mt-4 flex items-center justify-center gap-4 text-beige-muted">
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              <FileJson className="h-4 w-4" aria-hidden />
              <FileCode2 className="h-4 w-4" aria-hidden />
            </div>
          </div>

          {generateStep ? (
            <div className="panel mt-4 p-4" role="status" aria-live="polite">
              <p className="label mb-3">Generation progress</p>
              <ol className="space-y-2 text-sm">
                {GENERATE_STEPS.map((step) => {
                  const current = step === generateStep
                  const done = GENERATE_STEPS.indexOf(step) < GENERATE_STEPS.indexOf(generateStep as (typeof GENERATE_STEPS)[number])
                  return (
                    <li key={step} className={current ? 'text-beige' : 'text-beige-muted'}>
                      {done ? 'Done · ' : current ? 'Running · ' : ''}
                      {step}
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : null}

          {generateError ? (
            <div className="mt-4">
              <ErrorState message={generateError} onRetry={datasetReady ? () => void generate() : undefined} />
            </div>
          ) : null}

          <div className="panel mt-4 p-4">
            <p className="label mb-3">Fields</p>
            <div className="flex flex-wrap gap-1.5">
              {FIELDS.map((f) => (
                <span key={f.name} className="filter-pill" title={`${f.example} · ${f.required}`}>
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="panel p-4">
          <p className="label">Last ingest</p>
          <dl className="mt-4 space-y-3 text-sm">
            <Row k="Dataset" v={ingest.datasetName} />
            <Row k="Case" v={ingest.caseName} />
            <Row k="Rows" v={String(ingest.eventCount)} />
            <Row k="Parse errors" v={String(ingest.parseErrors)} />
            <Row k="GeoIP enriched" v={String(ingest.geoipEnriched)} />
            <Row k="Last ingest" v={ingest.lastIngestAt ? formatTs(ingest.lastIngestAt) : '—'} />
            <Row k="Mode" v={ingest.offline ? 'Offline mock' : 'Live'} />
          </dl>
          <p className="mt-6 text-xs text-beige-muted">Swap point: src/api/client.ts</p>
        </aside>
      </div>

      {results ? (
        <section ref={resultsRef} className="mt-6">
          <PageHeader
            kicker="Results"
            title="Generated entities"
            description={`${visibleRows.length} of ${results.length} entities · HIGH / MEDIUM / LOW marked on each row`}
          />
          {overviewGraph && overviewGraph.nodes.length > 0 ? (
            <div className="mb-4">
              <p className="label mb-2">Graph · all entities in this dataset</p>
              <GraphView
                nodes={overviewGraph.nodes}
                edges={overviewGraph.edges}
                focusNodeIds={overviewGraph.focusNodeIds}
                highlightPath={overviewGraph.highlightPath}
                onSelect={selectNode}
                autoHighlightPath
              />
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {RISK_OPTS.map((o) => (
              <button key={o} type="button" data-on={risk === o} className="filter-pill" onClick={() => setRisk(o)}>
                {o === 'ALL' ? 'All risk' : o}
              </button>
            ))}
            <span className="mx-1 h-4 w-px" style={{ background: 'var(--cw-border)' }} />
            {TYPE_OPTS.map((o) => (
              <button key={o} type="button" data-on={type === o} className="filter-pill" onClick={() => setType(o)}>
                {o === 'ALL' ? 'All types' : o}
              </button>
            ))}
            <Field label="Country">
              <select aria-label="Filter by country" value={country} onChange={(e) => setCountry(e.target.value)} className="control py-1">
                {countries.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="From">
              <input type="date" aria-label="Filter from date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="control py-1" />
            </Field>
            <Field label="To">
              <input type="date" aria-label="Filter to date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="control py-1" />
            </Field>
            <Field label="Min BTC">
              <input
                type="number"
                min="0"
                step="0.001"
                aria-label="Filter minimum amount"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="control w-24 py-1"
              />
            </Field>
            <input
              aria-label="Search entities"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Entity, type…"
              className="control ml-auto w-52"
            />
          </div>
          {visibleRows.length === 0 ? (
            <EmptyState
              title="No matching entities"
              body="Change risk, country, date, amount, or type filters."
              action={
                <button
                  type="button"
                  className="btn-pill btn-pill-ghost"
                  onClick={() => {
                    setRisk('ALL')
                    setType('ALL')
                    setCountry('ALL')
                    setDateFrom('')
                    setDateTo('')
                    setMinAmount('')
                    setQ('')
                  }}
                >
                  Reset filters
                </button>
              }
            />
          ) : (
            <EntitiesTable rows={visibleRows} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
          )}
        </section>
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-beige-muted">
      {label}
      {children}
    </label>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--cw-border)] pb-2">
      <dt className="text-beige-muted">{k}</dt>
      <dd className="text-right tabular text-beige">{v}</dd>
    </div>
  )
}
