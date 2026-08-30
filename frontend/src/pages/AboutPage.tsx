import { DISCLAIMERS } from '@/theme/tokens'
import { PageHeader } from '@/components/ui/primitives'

export function AboutPage() {
  return (
    <div className="max-w-xl">
      <PageHeader kicker="About" title="ChainWatch" />
      <ul className="space-y-2">
        {DISCLAIMERS.map((line) => (
          <li key={line} className="list-row about-point text-sm text-beige-dim">
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}
