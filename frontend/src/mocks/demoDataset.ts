import { CASE_NAME, DATASET_NAME, TARGET_EVENT_COUNT } from '@/theme/tokens'
import type {
  Alert,
  EntityCluster,
  EntityDetail,
  Event,
  Evidence,
  GraphEdge,
  GraphNode,
  IngestStatus,
  IpNode,
  OverviewStats,
  SearchHit,
  TxNode,
  Wallet,
} from '@/types/intel'

const T0 = '2026-08-19T10:01:02Z'
const T1 = '2026-08-19T10:04:11Z'
const T2 = '2026-08-19T10:18:44Z'
const T3 = '2026-08-19T14:42:09Z'
const T_SHOP = '2026-08-19T16:12:00Z'
const LAST_UPDATED = '2026-08-19T16:40:00Z'

export const TXID = {
  tx1: 'a11ce01d4b17c01a111111111111111111111111111111111111111111111001',
  tx2: 'a11ce01d4b17c01a222222222222222222222222222222222222222222222002',
  tx3: 'a11ce01d4b17c01a333333333333333333333333333333333333333333333003',
  tx4: 'a11ce01d4b17c01a444444444444444444444444444444444444444444444004',
  tx5: 'a11ce01d4b17c01a555555555555555555555555555555555555555555555005',
  tx6: 'b0b0c0de00000000000000000000000000000000000000000000000000000006',
  tx7: 'd0517f0a00000000000000000000000000000000000000000000000000000007',
  tx8: 'c0aa7aaa0a000000000000000000000000000000000000000000000000000008',
  tx9: 'aa0e110d00000000000000000000000000000000000000000000000000000009',
  tx10: 'aa0e111d00000000000000000000000000000000000000000000000000000010',
  tx99: '0000000000000000000000000000000000000000000000000000000000000099',
  tx11: '51f7ed0000000000000000000000000000000000000000000000000000000011',
  tx12: '51f7ed0000000000000000000000000000000000000000000000000000000012',
} as const

export const ADDR = {
  Vic: 'bc1qvicp4y7r4ns0m0000000000000001',
  A: 'bc1qa000recv17cluster00000000001',
  A1: 'bc1qa1split000000000000000000001',
  A2: 'bc1qa2split000000000000000000002',
  A3: 'bc1qa3split000000000000000000003',
  A4: 'bc1qa4split000000000000000000004',
  MixIn: 'bc1qmixincluster000000000000001',
  MixOut: 'bc1qmixoutcluster00000000000002',
  Cash1: 'bc1qcash1exit000000000000000003',
  Shop: 'bc1qshopmerchant00000000000004',
  CustShop: 'bc1qcustshop0000000000000000005',
  HopB: 'bc1qhopbrelay00000000000000006',
  HopB2: 'bc1qhopb2relay0000000000000007',
  Dust1: 'bc1qdustprobe00000000000000008',
  Dust2: 'bc1qdustprobe00000000000000009',
  ExchHot: 'bc1qexchhot0000000000000000010',
  Weekend: 'bc1qweekendmerch0000000000011',
  MixHop: 'bc1qmixhop00000000000000000012',
} as const

export const IPS = {
  airtel: '103.21.8.44',
  nlVps: '185.64.1.10',
  deVps: '91.198.174.12',
  sgCloud: '45.77.12.90',
  jio: '49.36.18.22',
  ovhGb: '51.89.44.10',
  cfUs: '104.28.12.5',
  docSg: '13.228.4.19',
  hetzner: '80.85.140.22',
  relais: '198.51.100.77',
  weekend: '122.171.24.9',
  dustDe: '46.4.88.31',
} as const

function ipNode(
  ip: string,
  country: string,
  countryCode: string,
  asn: string,
  asnOrg: string,
  firstSeen: string,
  lastSeen: string,
  tags: string[],
): IpNode {
  return {
    id: `ip:${ip}`,
    ip,
    country,
    countryCode,
    asn,
    asnOrg,
    firstSeen,
    lastSeen,
    tags,
  }
}

function wallet(
  label: keyof typeof ADDR | string,
  address: string,
  firstSeen: string,
  lastSeen: string,
  txCount: number,
  risk: Wallet['risk'],
  clusterId: string | null,
): Wallet {
  return {
    id: `wallet:${label}`,
    address,
    label: String(label),
    firstSeen,
    lastSeen,
    txCount,
    risk,
    clusterId,
  }
}

export const wallets: Wallet[] = [
  wallet('Vic', ADDR.Vic, T0, T0, 1, 'LOW', null),
  wallet('A', ADDR.A, T0, T1, 2, 'HIGH', 'entity-17'),
  wallet('A1', ADDR.A1, T1, T2, 2, 'HIGH', 'entity-17'),
  wallet('A2', ADDR.A2, T1, T2, 2, 'HIGH', 'entity-17'),
  wallet('A3', ADDR.A3, T1, '2026-08-19T10:22:03Z', 2, 'HIGH', 'entity-17'),
  wallet('A4', ADDR.A4, T1, '2026-08-19T10:22:03Z', 2, 'HIGH', 'entity-17'),
  wallet('MixIn', ADDR.MixIn, T2, T2, 3, 'HIGH', 'entity-mix'),
  wallet('MixOut', ADDR.MixOut, T3, T3, 2, 'MEDIUM', 'entity-mix'),
  wallet('Cash1', ADDR.Cash1, T3, T3, 1, 'MEDIUM', 'entity-cash1'),
  wallet('Shop', ADDR.Shop, T_SHOP, T_SHOP, 18, 'LOW', 'entity-shop'),
  wallet('CustShop', ADDR.CustShop, T_SHOP, T_SHOP, 1, 'LOW', 'entity-shop'),
  wallet('HopB', ADDR.HopB, '2026-08-18T09:12:00Z', '2026-08-19T11:40:00Z', 6, 'MEDIUM', 'entity-04'),
  wallet('HopB2', ADDR.HopB2, '2026-08-18T09:40:00Z', '2026-08-19T11:40:00Z', 4, 'MEDIUM', 'entity-04'),
  wallet('Dust1', ADDR.Dust1, '2026-08-17T04:00:00Z', '2026-08-19T08:10:00Z', 22, 'MEDIUM', 'entity-09'),
  wallet('Dust2', ADDR.Dust2, '2026-08-17T04:02:00Z', '2026-08-19T08:10:00Z', 22, 'MEDIUM', 'entity-09'),
  wallet('ExchHot', ADDR.ExchHot, '2026-08-12T00:00:00Z', LAST_UPDATED, 40, 'LOW', null),
  wallet('Weekend', ADDR.Weekend, '2026-08-15T18:00:00Z', T_SHOP, 9, 'LOW', 'entity-22'),
  wallet('MixHop', ADDR.MixHop, T2, T3, 2, 'MEDIUM', 'entity-mix'),
]

export const ips: IpNode[] = [
  ipNode(IPS.airtel, 'India', 'IN', 'AS24560', 'Airtel', T0, T2, ['first-seen', 'residential-isp']),
  ipNode(IPS.nlVps, 'Netherlands', 'NL', 'AS49981', 'WorldStream VPS', T0, T1, ['vps', 'btc-p2p-8333']),
  ipNode(IPS.deVps, 'Germany', 'DE', 'AS24940', 'Hetzner VPS', T2, T2, ['vps', 'mixer-like']),
  ipNode(IPS.sgCloud, 'Singapore', 'SG', 'AS20473', 'The Constant Company / Cloud-VPS', T3, T3, ['vps', 'cashout']),
  ipNode(IPS.jio, 'India', 'IN', 'AS55836', 'Reliance Jio', T_SHOP, T_SHOP, ['residential-isp']),
  ipNode(IPS.ovhGb, 'United Kingdom', 'GB', 'AS16276', 'OVH', '2026-08-18T09:12:00Z', '2026-08-19T11:40:00Z', ['vps']),
  ipNode(IPS.cfUs, 'United States', 'US', 'AS13335', 'Cloudflare anycast edge', '2026-08-18T10:00:00Z', '2026-08-19T11:40:00Z', ['anycast', 'spoof-risk']),
  ipNode(IPS.docSg, 'Singapore', 'SG', 'AS16509', 'Amazon / cloud', T3, T3, ['cloud']),
  ipNode(IPS.hetzner, 'Germany', 'DE', 'AS24940', 'Hetzner', '2026-08-17T04:00:00Z', '2026-08-19T08:10:00Z', ['vps']),
  ipNode(IPS.relais, 'France', 'FR', 'AS16276', 'OVH TEST-NET', '2026-08-18T09:40:00Z', '2026-08-19T11:00:00Z', ['vps']),
  ipNode(IPS.weekend, 'India', 'IN', 'AS24560', 'Airtel', '2026-08-15T18:00:00Z', T_SHOP, ['residential-isp']),
  ipNode(IPS.dustDe, 'Germany', 'DE', 'AS24940', 'Hetzner', '2026-08-17T04:00:00Z', '2026-08-19T08:10:00Z', ['vps', 'dust']),
]

export const txs: TxNode[] = [
  {
    id: 'tx:tx1',
    txid: TXID.tx1,
    timestamp: T0,
    fee: 0.00012,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.Vic],
    outputAddresses: [ADDR.A],
    inputAmounts: [2.4012],
    outputAmounts: [2.4],
    srcIp: IPS.airtel,
    dstIp: IPS.nlVps,
    srcPort: 49122,
    dstPort: 8333,
    label: 'tx1 ransom pay',
  },
  {
    id: 'tx:tx2',
    txid: TXID.tx2,
    timestamp: T1,
    fee: 0.00018,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.A],
    outputAddresses: [ADDR.A1, ADDR.A2, ADDR.A3, ADDR.A4],
    inputAmounts: [2.4],
    outputAmounts: [0.6, 0.6, 0.6, 0.6],
    srcIp: IPS.airtel,
    dstIp: IPS.nlVps,
    srcPort: 49122,
    dstPort: 8333,
    label: 'tx2 fan-out',
  },
  {
    id: 'tx:tx3',
    txid: TXID.tx3,
    timestamp: T2,
    fee: 0.0004,
    scriptType: 'p2wsh',
    inputAddresses: [ADDR.A1, ADDR.A2],
    outputAddresses: [ADDR.MixIn],
    inputAmounts: [0.6, 0.6],
    outputAmounts: [1.1996],
    srcIp: IPS.airtel,
    dstIp: IPS.deVps,
    srcPort: 49122,
    dstPort: 8333,
    label: 'tx3 into mixer',
  },
  {
    id: 'tx:tx4',
    txid: TXID.tx4,
    timestamp: T3,
    fee: 0.00022,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.MixOut],
    outputAddresses: [ADDR.Cash1],
    inputAmounts: [0.812],
    outputAmounts: [0.81178],
    srcIp: IPS.sgCloud,
    dstIp: IPS.docSg,
    srcPort: 40011,
    dstPort: 8333,
    label: 'tx4 cash-out',
  },
  {
    id: 'tx:tx5',
    txid: TXID.tx5,
    timestamp: '2026-08-19T10:22:03Z',
    fee: 0.00009,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.A3, ADDR.A4],
    outputAddresses: [ADDR.MixHop],
    inputAmounts: [0.6, 0.6],
    outputAmounts: [1.19991],
    srcIp: IPS.airtel,
    dstIp: IPS.deVps,
    srcPort: 49122,
    dstPort: 8333,
    label: 'tx5 remainder hop',
  },
  {
    id: 'tx:tx6',
    txid: TXID.tx6,
    timestamp: '2026-08-18T09:12:00Z',
    fee: 0.00008,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.HopB],
    outputAddresses: [ADDR.HopB2],
    inputAmounts: [0.31],
    outputAmounts: [0.30992],
    srcIp: IPS.ovhGb,
    dstIp: IPS.nlVps,
    srcPort: 39001,
    dstPort: 8333,
    label: 'tx6 relay GB→NL',
  },
  {
    id: 'tx:tx7',
    txid: TXID.tx7,
    timestamp: '2026-08-18T10:04:00Z',
    fee: 0.00007,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.HopB2],
    outputAddresses: [ADDR.HopB],
    inputAmounts: [0.15],
    outputAmounts: [0.14993],
    srcIp: IPS.cfUs,
    dstIp: IPS.relais,
    srcPort: 443,
    dstPort: 8333,
    label: 'tx7 anycast hop',
  },
  {
    id: 'tx:tx8',
    txid: TXID.tx8,
    timestamp: '2026-08-19T11:40:00Z',
    fee: 0.00005,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.HopB],
    outputAddresses: [ADDR.ExchHot],
    inputAmounts: [0.094],
    outputAmounts: [0.09395],
    srcIp: IPS.relais,
    dstIp: IPS.ovhGb,
    srcPort: 38112,
    dstPort: 8333,
    label: 'tx8 to exchange hot',
  },
  {
    id: 'tx:tx9',
    txid: TXID.tx9,
    timestamp: '2026-08-17T04:00:00Z',
    fee: 0.00031,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.Dust1],
    outputAddresses: [ADDR.Dust2, ADDR.Dust1],
    inputAmounts: [0.008],
    outputAmounts: [0.0001, 0.00759],
    srcIp: IPS.dustDe,
    dstIp: IPS.hetzner,
    srcPort: 22022,
    dstPort: 8333,
    label: 'tx9 dust fan',
  },
  {
    id: 'tx:tx10',
    txid: TXID.tx10,
    timestamp: '2026-08-19T08:10:00Z',
    fee: 0.00028,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.Dust2],
    outputAddresses: Array.from({ length: 8 }, (_, i) => `bc1qdustout${String(i).padStart(4, '0')}000000000`),
    inputAmounts: [0.004],
    outputAmounts: Array.from({ length: 8 }, () => 0.0001),
    srcIp: IPS.dustDe,
    dstIp: IPS.hetzner,
    srcPort: 22022,
    dstPort: 8333,
    label: 'tx10 dust spray',
  },
  {
    id: 'tx:tx11',
    txid: TXID.tx11,
    timestamp: '2026-08-16T19:05:00Z',
    fee: 0.00002,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.Weekend],
    outputAddresses: [ADDR.ExchHot],
    inputAmounts: [0.041],
    outputAmounts: [0.04098],
    srcIp: IPS.weekend,
    dstIp: IPS.nlVps,
    srcPort: 51200,
    dstPort: 8333,
    label: 'tx11 weekend settle',
  },
  {
    id: 'tx:tx12',
    txid: TXID.tx12,
    timestamp: '2026-08-15T18:22:00Z',
    fee: 0.00002,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.CustShop],
    outputAddresses: [ADDR.Weekend],
    inputAmounts: [0.006],
    outputAmounts: [0.00598],
    srcIp: IPS.weekend,
    dstIp: IPS.jio,
    srcPort: 51201,
    dstPort: 8333,
    label: 'tx12 weekend sale',
  },
  {
    id: 'tx:tx99',
    txid: TXID.tx99,
    timestamp: T_SHOP,
    fee: 0.00001,
    scriptType: 'p2wpkh',
    inputAddresses: [ADDR.CustShop],
    outputAddresses: [ADDR.Shop],
    inputAmounts: [0.00201],
    outputAmounts: [0.002],
    srcIp: IPS.jio,
    dstIp: IPS.jio,
    srcPort: 44321,
    dstPort: 8333,
    label: 'tx99 shop payment',
  },
]

function eventFromTx(e: TxNode, geoCountry: string, asn: string): Event {
  return {
    id: `evt-${e.label.replace(/\s+/g, '-').toLowerCase()}`,
    timestamp: e.timestamp,
    srcIp: e.srcIp,
    dstIp: e.dstIp,
    srcPort: e.srcPort,
    dstPort: e.dstPort,
    txid: e.txid,
    inputAddresses: e.inputAddresses,
    outputAddresses: e.outputAddresses,
    inputAmounts: e.inputAmounts,
    outputAmounts: e.outputAmounts,
    fee: e.fee,
    scriptType: e.scriptType,
    geoCountry,
    asn,
  }
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildAllEvents(): Event[] {
  const geoByIp: Record<string, { country: string; asn: string }> = {
    [IPS.airtel]: { country: 'IN', asn: 'AS24560' },
    [IPS.nlVps]: { country: 'NL', asn: 'AS49981' },
    [IPS.deVps]: { country: 'DE', asn: 'AS24940' },
    [IPS.sgCloud]: { country: 'SG', asn: 'AS20473' },
    [IPS.jio]: { country: 'IN', asn: 'AS55836' },
    [IPS.ovhGb]: { country: 'GB', asn: 'AS16276' },
    [IPS.cfUs]: { country: 'US', asn: 'AS13335' },
    [IPS.docSg]: { country: 'SG', asn: 'AS16509' },
    [IPS.hetzner]: { country: 'DE', asn: 'AS24940' },
    [IPS.relais]: { country: 'FR', asn: 'AS16276' },
    [IPS.weekend]: { country: 'IN', asn: 'AS24560' },
    [IPS.dustDe]: { country: 'DE', asn: 'AS24940' },
  }

  const core = txs.map((t) => {
    const g = geoByIp[t.srcIp] ?? { country: 'ZZ', asn: 'AS0' }
    return eventFromTx(t, g.country, g.asn)
  })

  const rand = mulberry32(26146)
  const noise: Event[] = []
  const shopAddrs = [ADDR.Shop, ADDR.CustShop, ADDR.Weekend, ADDR.ExchHot]
  while (core.length + noise.length < TARGET_EVENT_COUNT) {
    const i = noise.length
    const hour = 8 + Math.floor(rand() * 10)
    const minute = Math.floor(rand() * 60)
    const src = IPS.jio
    const amount = 0.001 + rand() * 0.004
    const srcAddr = shopAddrs[Math.floor(rand() * shopAddrs.length)] ?? ADDR.Shop
    const dstAddr = ADDR.Shop
    noise.push({
      id: `evt-noise-${String(i).padStart(3, '0')}`,
      timestamp: `2026-08-19T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
      srcIp: src,
      dstIp: src,
      srcPort: 40000 + i,
      dstPort: 8333,
      txid: `00ff${String(i).padStart(4, '0')}aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
      inputAddresses: [srcAddr],
      outputAddresses: [dstAddr],
      inputAmounts: [amount + 0.00001],
      outputAmounts: [Number(amount.toFixed(6))],
      fee: 0.00001,
      scriptType: 'p2wpkh',
      geoCountry: 'IN',
      asn: 'AS55836',
    })
  }
  return [...core, ...noise]
}

export const events: Event[] = buildAllEvents()

export const ingestStatus: IngestStatus = {
  loaded: true,
  datasetName: DATASET_NAME,
  caseName: CASE_NAME,
  eventCount: events.length,
  parseErrors: 0,
  geoipEnriched: events.length,
  lastIngestAt: LAST_UPDATED,
  offline: true,
}

export const entities: EntityCluster[] = [
  {
    id: 'entity-17',
    name: 'Entity-17',
    displayName: 'Entity-17 · ransom layering cluster',
    wallets: ['wallet:A', 'wallet:A1', 'wallet:A2', 'wallet:A3', 'wallet:A4'],
    ips: [`ip:${IPS.airtel}`, `ip:${IPS.nlVps}`, `ip:${IPS.deVps}`],
    txids: [TXID.tx1, TXID.tx2, TXID.tx3, TXID.tx5],
    risk: 'HIGH',
    confidence: 0.91,
    lastActivity: '2026-08-19T10:22:03Z',
    countryHops: ['IN', 'NL', 'DE', 'SG'],
    summary: '2.4 BTC ransom payment split four ways in 3 minutes, then routed toward a mixer-like cluster.',
  },
  {
    id: 'entity-cash1',
    name: 'Cash1',
    displayName: 'Cash1 · mixer exit',
    wallets: ['wallet:Cash1'],
    ips: [`ip:${IPS.sgCloud}`, `ip:${IPS.docSg}`],
    txids: [TXID.tx4],
    risk: 'MEDIUM',
    confidence: 0.72,
    lastActivity: T3,
    countryHops: ['DE', 'SG'],
    summary: 'Cash-out wallet funded from MixOut on a Singapore cloud VPS after the mixer hop.',
  },
  {
    id: 'entity-shop',
    name: 'Shop',
    displayName: 'Shop · merchant baseline',
    wallets: ['wallet:Shop', 'wallet:CustShop'],
    ips: [`ip:${IPS.jio}`],
    txids: [TXID.tx99],
    risk: 'LOW',
    confidence: 0.04,
    lastActivity: T_SHOP,
    countryHops: ['IN'],
    summary: '0.002 BTC point-of-sale payment. Used as a negative-control against the ransom path.',
  },
  {
    id: 'entity-04',
    name: 'Entity-04',
    displayName: 'Entity-04 · relay hop',
    wallets: ['wallet:HopB', 'wallet:HopB2'],
    ips: [`ip:${IPS.ovhGb}`, `ip:${IPS.cfUs}`, `ip:${IPS.relais}`],
    txids: [TXID.tx6, TXID.tx7, TXID.tx8],
    risk: 'MEDIUM',
    confidence: 0.55,
    lastActivity: '2026-08-19T11:40:00Z',
    countryHops: ['GB', 'US', 'FR'],
    summary: 'Same cluster first-seen from GB VPS, US anycast edge, then FR — IP churn, not a ransom fan-out.',
  },
  {
    id: 'entity-09',
    name: 'Entity-09',
    displayName: 'Entity-09 · dust probe',
    wallets: ['wallet:Dust1', 'wallet:Dust2'],
    ips: [`ip:${IPS.dustDe}`, `ip:${IPS.hetzner}`],
    txids: [TXID.tx9, TXID.tx10],
    risk: 'MEDIUM',
    confidence: 0.48,
    lastActivity: '2026-08-19T08:10:00Z',
    countryHops: ['DE'],
    summary: 'Repeated sub-0.0001 BTC sprays from a DE VPS. Anomalous, but no ransom-value linkage.',
  },
  {
    id: 'entity-22',
    name: 'Entity-22',
    displayName: 'Entity-22 · weekend merchant',
    wallets: ['wallet:Weekend'],
    ips: [`ip:${IPS.weekend}`],
    txids: [TXID.tx11, TXID.tx12],
    risk: 'LOW',
    confidence: 0.18,
    lastActivity: '2026-08-16T19:05:00Z',
    countryHops: ['IN'],
    summary: 'Recurring small settlements to an exchange hot wallet from a residential IN IP.',
  },
  {
    id: 'entity-mix',
    name: 'MixCluster',
    displayName: 'MixCluster · mixer-like',
    wallets: ['wallet:MixIn', 'wallet:MixOut', 'wallet:MixHop'],
    ips: [`ip:${IPS.deVps}`],
    txids: [TXID.tx3, TXID.tx4, TXID.tx5],
    risk: 'HIGH',
    confidence: 0.8,
    lastActivity: T3,
    countryHops: ['DE', 'SG'],
    summary: 'High-fan-in / delayed fan-out pattern consistent with a mixing service — not identified as a named mixer.',
  },
]

function walletById(id: string): Wallet {
  const found = wallets.find((w) => w.id === id)
  if (!found) {
    throw new Error(`Unknown wallet ${id}`)
  }
  return found
}

function ipById(id: string): IpNode {
  const found = ips.find((n) => n.id === id)
  if (!found) {
    throw new Error(`Unknown IP ${id}`)
  }
  return found
}

function evidence(
  txid: string,
  timestamp: string,
  amountBtc: number,
  srcIp: string,
  dstIp: string,
  geoCountry: string,
  asn: string,
  note: string,
): Evidence {
  return { txid, timestamp, amountBtc, srcIp, dstIp, geoCountry, asn, note }
}

export const alerts: Alert[] = [
  {
    id: 'alert-17',
    rank: 1,
    entityId: 'entity-17',
    risk: 'HIGH',
    confidence: 0.91,
    type: 'layering',
    title: 'Entity-17 · 2.4 BTC fan-out in 3 minutes',
    summary:
      'Victim Vic paid 2.4 BTC to wallet A (tx1). Three minutes later the same first-seen IP split A into A1–A4 (0.6 BTC each), then A1+A2 entered a mixer-like cluster.',
    whyFlagged: 'Vic → A 2.4 BTC · 4-way split in 3 min · IP 103.21.8.44 · mixer hop',
    wallets: ['wallet:A', 'wallet:A1', 'wallet:A2', 'wallet:A3', 'wallet:A4'].map(walletById),
    ips: [`ip:${IPS.airtel}`, `ip:${IPS.nlVps}`, `ip:${IPS.deVps}`].map(ipById),
    evidence: [
      evidence(TXID.tx1, T0, 2.4, IPS.airtel, IPS.nlVps, 'IN', 'AS24560 Airtel', 'Vic pays A — suspected ransom'),
      evidence(TXID.tx2, T1, 2.4, IPS.airtel, IPS.nlVps, 'IN', 'AS24560 Airtel', 'A splits to A1–A4 · 0.6 BTC each'),
      evidence(TXID.tx3, T2, 1.1996, IPS.airtel, IPS.deVps, 'IN→DE', 'AS24560 → AS24940', 'A1+A2 → MixIn'),
      evidence(TXID.tx5, '2026-08-19T10:22:03Z', 1.19991, IPS.airtel, IPS.deVps, 'IN→DE', 'AS24560 → AS24940', 'A3+A4 → MixHop'),
    ],
    reasons: [
      { feature: 'fan_out_speed', contribution: 0.34, text: '2.4 BTC split into 4 outputs within 3 minutes' },
      { feature: 'ip_reuse', contribution: 0.28, text: '3 transactions first-seen from 103.21.8.44' },
      { feature: 'mixer_proximity', contribution: 0.22, text: 'next hop into mixer-like cluster' },
      { feature: 'country_hops', contribution: 0.11, text: 'IN → NL → DE → SG path' },
    ],
    lastActivity: '2026-08-19T10:22:03Z',
    countryHops: ['IN', 'NL', 'DE', 'SG'],
    walletCount: 5,
  },
  {
    id: 'alert-cash1',
    rank: 2,
    entityId: 'entity-cash1',
    risk: 'MEDIUM',
    confidence: 0.72,
    type: 'mixer-proximity',
    title: 'Cash1 · mixer exit on SG cloud VPS',
    summary:
      'MixOut paid 0.812 BTC to Cash1 (tx4) from 45.77.12.90 (SG, Cloud-VPS). Timing lines up with the Entity-17 mixer intake hours earlier.',
    whyFlagged: 'MixOut → Cash1 0.81 BTC · SG cloud VPS · mixer exit',
    wallets: [walletById('wallet:Cash1')],
    ips: [`ip:${IPS.sgCloud}`, `ip:${IPS.docSg}`].map(ipById),
    evidence: [
      evidence(TXID.tx4, T3, 0.81178, IPS.sgCloud, IPS.docSg, 'SG', 'AS20473 Cloud-VPS', 'MixOut → Cash1 cash-out'),
    ],
    reasons: [
      { feature: 'mixer_proximity', contribution: 0.41, text: 'direct MixOut → Cash1 edge after Entity-17 intake' },
      { feature: 'vps_asn', contribution: 0.18, text: 'first-seen on AS20473 cloud VPS (SG)' },
      { feature: 'amount_peel', contribution: 0.13, text: '0.81 BTC peel is consistent with 2.4 BTC post-mix remainder' },
    ],
    lastActivity: T3,
    countryHops: ['DE', 'SG'],
    walletCount: 1,
  },
  {
    id: 'alert-04',
    rank: 3,
    entityId: 'entity-04',
    risk: 'MEDIUM',
    confidence: 0.55,
    type: 'ip-reuse',
    title: 'Entity-04 · GB / US / FR first-seen churn',
    summary:
      'HopB cluster changes first-seen IP across OVH GB, Cloudflare US anycast, and FR VPS within 26 hours. No ransom-value overlap with Entity-17.',
    whyFlagged: 'GB / US / FR IP churn · no ransom overlap',
    wallets: ['wallet:HopB', 'wallet:HopB2'].map(walletById),
    ips: [`ip:${IPS.ovhGb}`, `ip:${IPS.cfUs}`, `ip:${IPS.relais}`].map(ipById),
    evidence: [
      evidence(TXID.tx6, '2026-08-18T09:12:00Z', 0.30992, IPS.ovhGb, IPS.nlVps, 'GB', 'AS16276 OVH', 'HopB → HopB2'),
      evidence(TXID.tx7, '2026-08-18T10:04:00Z', 0.14993, IPS.cfUs, IPS.relais, 'US', 'AS13335 Cloudflare', 'return hop via anycast'),
      evidence(TXID.tx8, '2026-08-19T11:40:00Z', 0.09395, IPS.relais, IPS.ovhGb, 'FR', 'AS16276', 'HopB → exchange hot wallet'),
    ],
    reasons: [
      { feature: 'ip_churn', contribution: 0.29, text: 'first-seen IPs in GB, US anycast, and FR on one cluster' },
      { feature: 'asn_mismatch', contribution: 0.16, text: 'OVH + Cloudflare edge mixed into the same entity' },
      { feature: 'ransom_link', contribution: 0.1, text: 'no shared tx with Entity-17 (negative feature, still listed)' },
    ],
    lastActivity: '2026-08-19T11:40:00Z',
    countryHops: ['GB', 'US', 'FR'],
    walletCount: 2,
  },
  {
    id: 'alert-09',
    rank: 4,
    entityId: 'entity-09',
    risk: 'MEDIUM',
    confidence: 0.48,
    type: 'anomaly',
    title: 'Entity-09 · dust spray from DE VPS',
    summary:
      'Dust1/Dust2 emit repeated 0.0001 BTC outputs. Anomalous UTXO behavior, no 2.4 BTC linkage.',
    whyFlagged: 'Dust spray 0.0001 BTC · DE VPS · no 2.4 BTC link',
    wallets: ['wallet:Dust1', 'wallet:Dust2'].map(walletById),
    ips: [`ip:${IPS.dustDe}`, `ip:${IPS.hetzner}`].map(ipById),
    evidence: [
      evidence(TXID.tx9, '2026-08-17T04:00:00Z', 0.0001, IPS.dustDe, IPS.hetzner, 'DE', 'AS24940', 'dust peel'),
      evidence(TXID.tx10, '2026-08-19T08:10:00Z', 0.0008, IPS.dustDe, IPS.hetzner, 'DE', 'AS24940', '8×0.0001 spray'),
    ],
    reasons: [
      { feature: 'dust_denomination', contribution: 0.27, text: 'repeated 0.0001 BTC outputs' },
      { feature: 'output_fanout', contribution: 0.14, text: 'tx10 has 8 outputs from one input' },
      { feature: 'vps_asn', contribution: 0.07, text: 'DE Hetzner VPS first-seen — cheap infrastructure' },
    ],
    lastActivity: '2026-08-19T08:10:00Z',
    countryHops: ['DE'],
    walletCount: 2,
  },
  {
    id: 'alert-22',
    rank: 5,
    entityId: 'entity-22',
    risk: 'LOW',
    confidence: 0.18,
    type: 'anomaly',
    title: 'Entity-22 · weekend merchant settlements',
    summary:
      'Small IN-residential settlements into an exchange hot wallet. Score is low; kept for contrast during demo.',
    whyFlagged: 'Weekend merchant · 0.006 / 0.041 BTC · stable IN IP',
    wallets: [walletById('wallet:Weekend')],
    ips: [ipById(`ip:${IPS.weekend}`)],
    evidence: [
      evidence(TXID.tx12, '2026-08-15T18:22:00Z', 0.00598, IPS.weekend, IPS.jio, 'IN', 'AS24560', 'sale inbound'),
      evidence(TXID.tx11, '2026-08-16T19:05:00Z', 0.04098, IPS.weekend, IPS.nlVps, 'IN', 'AS24560', 'settle to exchange hot'),
    ],
    reasons: [
      { feature: 'timing_weekend', contribution: 0.11, text: 'activity clustered on weekend evenings' },
      { feature: 'exchange_proximity', contribution: 0.07, text: 'pays known synthetic exchange hot wallet' },
    ],
    lastActivity: '2026-08-16T19:05:00Z',
    countryHops: ['IN'],
    walletCount: 1,
  },
  {
    id: 'alert-shop',
    rank: 6,
    entityId: 'entity-shop',
    risk: 'LOW',
    confidence: 0.04,
    type: 'anomaly',
    title: 'Shop · 0.002 BTC baseline payment',
    summary:
      'Negative control. Normal shop payment (tx99) from Jio IN. Model should stay quiet.',
    whyFlagged: 'Negative control · 0.002 BTC shop pay',
    wallets: ['wallet:Shop', 'wallet:CustShop'].map(walletById),
    ips: [ipById(`ip:${IPS.jio}`)],
    evidence: [
      evidence(TXID.tx99, T_SHOP, 0.002, IPS.jio, IPS.jio, 'IN', 'AS55836 Jio', 'normal shop payment'),
    ],
    reasons: [
      { feature: 'amount_small', contribution: 0.02, text: '0.002 BTC is typical POS noise' },
      { feature: 'same_country_asn', contribution: 0.02, text: 'src and dst first-seen on Jio IN' },
    ],
    lastActivity: T_SHOP,
    countryHops: ['IN'],
    walletCount: 2,
  },
]

const RANSOM_PATH = [
  'wallet:Vic',
  'tx:tx1',
  'wallet:A',
  'tx:tx2',
  'wallet:A1',
  'wallet:A2',
  'wallet:A3',
  'wallet:A4',
  'tx:tx3',
  'wallet:MixIn',
  'wallet:MixHop',
  'wallet:MixOut',
  'tx:tx4',
  'wallet:Cash1',
  `ip:${IPS.airtel}`,
] as const

function graphWallet(w: Wallet, flagged: boolean): GraphNode {
  return {
    id: w.id,
    kind: 'wallet',
    label: w.label,
    flagged,
    risk: w.risk,
    subtitle: w.address,
    properties: {
      address: w.address,
      cluster: w.clusterId ?? 'none',
      risk: w.risk,
      txCount: String(w.txCount),
      firstSeen: w.firstSeen,
      lastSeen: w.lastSeen,
    },
  }
}

function graphIp(n: IpNode, flagged: boolean): GraphNode {
  return {
    id: n.id,
    kind: 'ip',
    label: n.ip,
    flagged,
    subtitle: `${n.countryCode} · ${n.asnOrg}`,
    properties: {
      ip: n.ip,
      country: `${n.country} (${n.countryCode})`,
      asn: `${n.asn} ${n.asnOrg}`,
      tags: n.tags.join(', '),
      firstSeen: n.firstSeen,
      lastSeen: n.lastSeen,
    },
  }
}

function graphTx(t: TxNode, flagged: boolean): GraphNode {
  const amount = t.outputAmounts.reduce((a, b) => a + b, 0)
  return {
    id: t.id,
    kind: 'tx',
    label: t.label.split(' ')[0] ?? t.id,
    flagged,
    subtitle: t.txid,
    properties: {
      txid: t.txid,
      timestamp: t.timestamp,
      amountBtc: amount.toFixed(6),
      fee: String(t.fee),
      scriptType: t.scriptType,
      srcIp: t.srcIp,
      dstIp: `${t.dstIp}:${t.dstPort}`,
    },
  }
}

const flaggedWalletIds = new Set([
  'wallet:A',
  'wallet:A1',
  'wallet:A2',
  'wallet:A3',
  'wallet:A4',
  'wallet:MixIn',
  'wallet:Cash1',
])

export const graphNodes: GraphNode[] = [
  ...wallets.map((w) => graphWallet(w, flaggedWalletIds.has(w.id))),
  ...ips.map((n) => graphIp(n, n.ip === IPS.airtel || n.ip === IPS.sgCloud)),
  ...txs.map((t) => graphTx(t, t.id === 'tx:tx1' || t.id === 'tx:tx2' || t.id === 'tx:tx3' || t.id === 'tx:tx4')),
]

function edge(
  id: string,
  source: string,
  target: string,
  relation: GraphEdge['relation'],
  label: string,
): GraphEdge {
  return { id, source, target, relation, label }
}

export const graphEdges: GraphEdge[] = [
  edge('e-airtel-tx1', `ip:${IPS.airtel}`, 'tx:tx1', 'broadcast', 'broadcast'),
  edge('e-tx1-nl', 'tx:tx1', `ip:${IPS.nlVps}`, 'broadcast', 'p2p :8333'),
  edge('e-vic-tx1', 'wallet:Vic', 'tx:tx1', 'pays', 'pays 2.4'),
  edge('e-tx1-a', 'tx:tx1', 'wallet:A', 'pays', 'pays'),
  edge('e-airtel-tx2', `ip:${IPS.airtel}`, 'tx:tx2', 'broadcast', 'broadcast'),
  edge('e-a-tx2', 'wallet:A', 'tx:tx2', 'splits', 'splits'),
  edge('e-tx2-a1', 'tx:tx2', 'wallet:A1', 'splits', '0.6'),
  edge('e-tx2-a2', 'tx:tx2', 'wallet:A2', 'splits', '0.6'),
  edge('e-tx2-a3', 'tx:tx2', 'wallet:A3', 'splits', '0.6'),
  edge('e-tx2-a4', 'tx:tx2', 'wallet:A4', 'splits', '0.6'),
  edge('e-a1-tx3', 'wallet:A1', 'tx:tx3', 'hops', 'hops'),
  edge('e-a2-tx3', 'wallet:A2', 'tx:tx3', 'hops', 'hops'),
  edge('e-tx3-mixin', 'tx:tx3', 'wallet:MixIn', 'hops', 'MixIn'),
  edge('e-airtel-tx3', `ip:${IPS.airtel}`, 'tx:tx3', 'broadcast', 'broadcast'),
  edge('e-tx3-de', 'tx:tx3', `ip:${IPS.deVps}`, 'broadcast', 'DE VPS'),
  edge('e-a3-tx5', 'wallet:A3', 'tx:tx5', 'hops', 'hops'),
  edge('e-a4-tx5', 'wallet:A4', 'tx:tx5', 'hops', 'hops'),
  edge('e-tx5-mixhop', 'tx:tx5', 'wallet:MixHop', 'hops', 'MixHop'),
  edge('e-mixhop-mixin', 'wallet:MixHop', 'wallet:MixIn', 'hops', 'cluster'),
  edge('e-mixin-mixout', 'wallet:MixIn', 'wallet:MixOut', 'hops', 'mix delay'),
  edge('e-mixout-tx4', 'wallet:MixOut', 'tx:tx4', 'pays', 'pays'),
  edge('e-tx4-cash1', 'tx:tx4', 'wallet:Cash1', 'pays', 'cash-out'),
  edge('e-sg-tx4', `ip:${IPS.sgCloud}`, 'tx:tx4', 'broadcast', 'broadcast'),
  edge('e-hopb-tx6', 'wallet:HopB', 'tx:tx6', 'pays', 'pays'),
  edge('e-tx6-hopb2', 'tx:tx6', 'wallet:HopB2', 'pays', 'pays'),
  edge('e-ovh-tx6', `ip:${IPS.ovhGb}`, 'tx:tx6', 'broadcast', 'broadcast'),
  edge('e-hopb2-tx7', 'wallet:HopB2', 'tx:tx7', 'hops', 'hops'),
  edge('e-tx7-hopb', 'tx:tx7', 'wallet:HopB', 'hops', 'return'),
  edge('e-cf-tx7', `ip:${IPS.cfUs}`, 'tx:tx7', 'broadcast', 'broadcast'),
  edge('e-hopb-tx8', 'wallet:HopB', 'tx:tx8', 'pays', 'pays'),
  edge('e-tx8-exch', 'tx:tx8', 'wallet:ExchHot', 'pays', 'exch'),
  edge('e-dust1-tx9', 'wallet:Dust1', 'tx:tx9', 'splits', 'dust'),
  edge('e-tx9-dust2', 'tx:tx9', 'wallet:Dust2', 'splits', 'dust'),
  edge('e-dust2-tx10', 'wallet:Dust2', 'tx:tx10', 'splits', 'spray'),
  edge('e-de-tx9', `ip:${IPS.dustDe}`, 'tx:tx9', 'broadcast', 'broadcast'),
  edge('e-de-tx10', `ip:${IPS.dustDe}`, 'tx:tx10', 'broadcast', 'broadcast'),
  edge('e-cust-tx99', 'wallet:CustShop', 'tx:tx99', 'pays', 'pays'),
  edge('e-tx99-shop', 'tx:tx99', 'wallet:Shop', 'pays', '0.002'),
  edge('e-jio-tx99', `ip:${IPS.jio}`, 'tx:tx99', 'broadcast', 'broadcast'),
  edge('e-cust-tx12', 'wallet:CustShop', 'tx:tx12', 'pays', 'pays'),
  edge('e-tx12-wknd', 'tx:tx12', 'wallet:Weekend', 'pays', 'sale'),
  edge('e-wknd-tx11', 'wallet:Weekend', 'tx:tx11', 'pays', 'settle'),
  edge('e-tx11-exch', 'tx:tx11', 'wallet:ExchHot', 'pays', 'exch'),
  edge('e-wknd-ip', `ip:${IPS.weekend}`, 'tx:tx11', 'broadcast', 'broadcast'),
]

export const highlightPath = [...RANSOM_PATH]

export function getOverview(): OverviewStats {
  const uniqueWallets = new Set(events.flatMap((e) => [...e.inputAddresses, ...e.outputAddresses]))
  const uniqueIps = new Set(events.flatMap((e) => [e.srcIp, e.dstIp]))
  return {
    totalEvents: events.length,
    uniqueWallets: uniqueWallets.size,
    uniqueIps: uniqueIps.size,
    flaggedEntities: alerts.filter((a) => a.risk !== 'LOW').length,
    highRiskCount: alerts.filter((a) => a.risk === 'HIGH').length,
    lastUpdated: LAST_UPDATED,
    ingest: ingestStatus,
    topAlerts: alerts.slice(0, 5),
    hottestClusterId: 'entity-17',
  }
}

export function getEntityDetail(id: string): EntityDetail | null {
  const cluster = entities.find((e) => e.id === id)
  if (!cluster) return null
  const related = alerts.find((a) => a.entityId === id)
  const timeline = related?.evidence ?? []
  const travelHistory = timeline.map((ev) => ({
    countryCode: ev.geoCountry,
    timestamp: ev.timestamp,
    ip: ev.srcIp,
    note: ev.note,
  }))
  const linkedEntities = entities
    .filter((e) => e.id !== id && e.countryHops.some((c) => cluster.countryHops.includes(c)))
    .slice(0, 6)
    .map((e) => ({ id: e.id, name: e.name, risk: e.risk }))
  return {
    cluster,
    members: cluster.wallets.map(walletById),
    sharedIps: cluster.ips.map(ipById),
    timeline,
    riskBreakdown: related?.reasons ?? [],
    relatedAlertId: related?.id ?? null,
    travelHistory,
    linkedEntities,
    totalAmountBtc: timeline.reduce((a, e) => a + e.amountBtc, 0),
  }
}

export function searchIndex(q: string): SearchHit[] {
  const needle = q.trim().toLowerCase()
  if (needle.length < 2) return []
  const hits: SearchHit[] = []

  for (const a of alerts) {
    if (
      a.id.toLowerCase().includes(needle) ||
      a.title.toLowerCase().includes(needle) ||
      a.entityId.toLowerCase().includes(needle)
    ) {
      hits.push({
        kind: 'alert',
        id: a.id,
        label: a.title,
        href: `/alerts/${a.id}`,
        meta: `${a.risk} · ${Math.round(a.confidence * 100)}%`,
      })
    }
  }
  for (const w of wallets) {
    if (w.label.toLowerCase().includes(needle) || w.address.toLowerCase().includes(needle) || w.id.toLowerCase().includes(needle)) {
      hits.push({
        kind: 'wallet',
        id: w.id,
        label: `${w.label} · ${w.address}`,
        href: w.clusterId ? `/entities/${w.clusterId}` : `/graph?entityId=${encodeURIComponent(w.id)}`,
        meta: w.clusterId ?? 'unclustered',
      })
    }
  }
  for (const n of ips) {
    if (n.ip.includes(needle) || n.asn.toLowerCase().includes(needle) || n.country.toLowerCase().includes(needle)) {
      hits.push({
        kind: 'ip',
        id: n.id,
        label: n.ip,
        href: `/graph?entityId=${encodeURIComponent(n.id)}`,
        meta: `${n.countryCode} · ${n.asnOrg}`,
      })
    }
  }
  for (const t of txs) {
    if (t.txid.toLowerCase().includes(needle) || t.id.toLowerCase().includes(needle) || t.label.toLowerCase().includes(needle)) {
      hits.push({
        kind: 'tx',
        id: t.id,
        label: t.label,
        href: `/graph?entityId=${encodeURIComponent(t.id)}`,
        meta: t.txid.slice(0, 16),
      })
    }
  }
  return hits.slice(0, 8)
}

export function neighborhoodIds(entityId: string): string[] {
  const cluster = entities.find((e) => e.id === entityId)
  if (cluster) {
    const txNodes = txs.filter((t) => cluster.txids.includes(t.txid)).map((t) => t.id)
    return [...cluster.wallets, ...cluster.ips, ...txNodes]
  }
  if (graphNodes.some((n) => n.id === entityId)) return [entityId]
  return []
}
