import { DISCLAIMERS } from '@/theme/tokens'
import { PageHeader } from '@/components/ui/primitives'

const STEPS = [
  { n: '01', title: 'Load a capture', body: 'CSV, JSON, or XML, or the demo dataset. Nothing is pulled from the live Bitcoin network.' },
  { n: '02', title: 'Cluster', body: 'Rows with the same first-seen source IP become one entity. That IP is a peer observation, not a person.' },
  { n: '03', title: 'Score', body: 'Written rules plus an Isolation Forest fit on this file. Peel chains, CoinJoin-like transactions, and shared inputs are called out.' },
  { n: '04', title: 'Review', body: 'Open a lead for the reason, the evidence transactions, and the link graph. A HIGH neighbor can pass a smaller score one hop.' },
] as const

const BANDS = [
  { level: 'HIGH', rule: '0.75 and above' },
  { level: 'MEDIUM', rule: '0.40 to 0.74' },
  { level: 'LOW', rule: 'below 0.40' },
] as const

export function AboutPage() {
  return (
    <div>
      <PageHeader
        kicker="About"
        title="ChainWatch"
        description="Offline console for Bitcoin traffic captures. Ranked leads, written reasons, and a link graph."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <section className="panel p-4">
          <p className="label">How a file becomes a lead</p>
          <ol className="mt-4 space-y-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="tabular text-sm text-beige-muted">{step.n}</span>
                <div>
                  <p className="text-sm font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-sm text-beige-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-4">
          <section className="panel p-4">
            <p className="label">Risk bands</p>
            <ul className="mt-4 space-y-2">
              {BANDS.map((band) => (
                <li key={band.level} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white">{band.level}</span>
                  <span className="tabular text-beige-muted">{band.rule}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-beige-muted">
              Country and ASN come from the capture, or from the local GeoIP table when those fields are empty.
            </p>
          </section>

          <section className="panel p-4">
            <p className="label">Limits</p>
            <ul className="mt-4 space-y-2">
              {DISCLAIMERS.map((line) => (
                <li key={line} className="list-row about-point text-sm text-beige-dim">
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-beige-muted">A flag is a lead to review. It is not proof of identity.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
