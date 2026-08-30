import type { RiskLevel } from '@/types/intel'

export function toRiskLevel(confidence: number): RiskLevel {
  if (confidence >= 0.75) return 'HIGH'
  if (confidence >= 0.4) return 'MEDIUM'
  return 'LOW'
}

export function riskLabel(level: RiskLevel): string {
  return level
}

export function riskClass(level: RiskLevel): string {
  if (level === 'HIGH') return 'risk-high'
  if (level === 'MEDIUM') return 'risk-medium'
  return 'risk-low'
}

export function riskBarClass(level: RiskLevel): string {
  if (level === 'HIGH') return 'risk-bar-high'
  if (level === 'MEDIUM') return 'risk-bar-medium'
  return 'risk-bar-low'
}
