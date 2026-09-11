import type { RiskLevel } from '../types/intel.js'

export function toRiskLevel(confidence: number): RiskLevel {
  if (confidence >= 0.75) return 'HIGH'
  if (confidence >= 0.4) return 'MEDIUM'
  return 'LOW'
}
