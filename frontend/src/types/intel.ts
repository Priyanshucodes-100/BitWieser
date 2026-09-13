export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export type AlertType = 'layering' | 'ip-reuse' | 'mixer-proximity' | 'anomaly'

export type GraphNodeKind = 'wallet' | 'ip' | 'tx' | 'entity'

export type EdgeRelation = 'broadcast' | 'pays' | 'splits' | 'hops'

export interface Event {
  id: string
  timestamp: string
  srcIp: string
  dstIp: string
  srcPort: number
  dstPort: number
  txid: string
  inputAddresses: string[]
  outputAddresses: string[]
  inputAmounts: number[]
  outputAmounts: number[]
  fee: number
  scriptType: string
  geoCountry: string
  asn: string
}

export interface Wallet {
  id: string
  address: string
  label: string
  firstSeen: string
  lastSeen: string
  txCount: number
  risk: RiskLevel
  clusterId: string | null
}

export interface IpNode {
  id: string
  ip: string
  country: string
  countryCode: string
  asn: string
  asnOrg: string
  firstSeen: string
  lastSeen: string
  tags: string[]
}

export interface TxNode {
  id: string
  txid: string
  timestamp: string
  fee: number
  scriptType: string
  inputAddresses: string[]
  outputAddresses: string[]
  inputAmounts: number[]
  outputAmounts: number[]
  srcIp: string
  dstIp: string
  srcPort: number
  dstPort: number
  label: string
}

export interface GraphNode {
  id: string
  kind: GraphNodeKind
  label: string
  flagged: boolean
  risk?: RiskLevel
  subtitle: string
  properties: Record<string, string>
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  relation: EdgeRelation
  label: string
}

export interface Reason {
  feature: string
  contribution: number
  text: string
}

export interface Evidence {
  txid: string
  timestamp: string
  amountBtc: number
  srcIp: string
  dstIp: string
  geoCountry: string
  asn: string
  note: string
}

export interface EntityCluster {
  id: string
  name: string
  displayName: string
  wallets: string[]
  ips: string[]
  txids: string[]
  risk: RiskLevel
  confidence: number
  lastActivity: string
  countryHops: string[]
  summary: string
}

export interface Alert {
  id: string
  rank: number
  entityId: string
  risk: RiskLevel
  confidence: number
  type: AlertType
  title: string
  summary: string
  whyFlagged: string
  wallets: Wallet[]
  ips: IpNode[]
  evidence: Evidence[]
  reasons: Reason[]
  lastActivity: string
  countryHops: string[]
  walletCount: number
}

export interface IngestStatus {
  loaded: boolean
  datasetName: string
  caseName: string
  eventCount: number
  parseErrors: number
  geoipEnriched: number
  lastIngestAt: string | null
  offline: boolean
}

export interface OverviewStats {
  totalEvents: number
  uniqueWallets: number
  uniqueIps: number
  flaggedEntities: number
  highRiskCount: number
  lastUpdated: string
  ingest: IngestStatus
  topAlerts: Alert[]
  hottestClusterId: string
}

export interface GraphPayload {
  nodes: GraphNode[]
  edges: GraphEdge[]
  focusNodeIds: string[]
  highlightPath: string[]
}

export interface TravelHop {
  countryCode: string
  timestamp: string
  ip: string
  note?: string
}

export interface LinkedEntity {
  id: string
  name: string
  risk: RiskLevel
}

export interface EntityDetail {
  cluster: EntityCluster
  members: Wallet[]
  sharedIps: IpNode[]
  timeline: Evidence[]
  riskBreakdown: Reason[]
  relatedAlertId: string | null
  travelHistory: TravelHop[]
  linkedEntities: LinkedEntity[]
  totalAmountBtc: number
}

export interface EntityTableRow {
  id: string
  rank: number
  name: string
  type: AlertType
  risk: RiskLevel
  confidence: number
  amountBtc: number
  firstActivity: string
  lastActivity: string
  countryHops: string[]
  walletCount: number
  ipCount: number
  txCount: number
}

export interface AlertFilters {
  risk?: RiskLevel | 'ALL'
  type?: AlertType | 'ALL'
  country?: string | 'ALL'
  q?: string
  sortBy?: 'rank' | 'confidence' | 'lastActivity' | 'entity'
  sortDir?: 'asc' | 'desc'
}

export interface SearchHit {
  kind: 'alert' | 'wallet' | 'ip' | 'tx' | 'entity'
  id: string
  label: string
  href: string
  meta: string
}

export interface ApiListMeta {
  total: number
  ingest: IngestStatus
}

export interface ApiListResponse<T> {
  data: T
  meta: ApiListMeta
}

export interface ApiItemResponse<T> {
  data: T
}

export interface IngestResponse {
  data: IngestStatus
  message: string
}

export interface HealthResponse {
  status: 'ok'
  offline: true
  service: 'chainwatch-mock' | 'chainwatch-api'
}
