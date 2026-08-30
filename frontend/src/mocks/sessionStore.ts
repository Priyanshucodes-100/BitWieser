import { events as demoEvents } from '@/mocks/demoDataset'
import type { EntityDetail, EntityTableRow, Event, GraphPayload } from '@/types/intel'

let loadedEvents: Event[] = structuredClone(demoEvents)
let rows: EntityTableRow[] = []
let details: Record<string, EntityDetail> = {}
let graphs: Record<string, GraphPayload> = {}

export function setLoadedEvents(events: Event[]): void {
  loadedEvents = events
  rows = []
  details = {}
  graphs = {}
}

export function getLoadedEvents(): Event[] {
  return loadedEvents
}

export function setGeneratedSession(next: {
  rows: EntityTableRow[]
  details: Record<string, EntityDetail>
  graphs: Record<string, GraphPayload>
}): void {
  rows = next.rows
  details = next.details
  graphs = next.graphs
}

export function getGeneratedRows(): EntityTableRow[] {
  return rows
}

export function getGeneratedDetail(id: string): EntityDetail | undefined {
  return details[id]
}

export function getGeneratedGraph(id: string): GraphPayload | undefined {
  return graphs[id]
}

export function clearGeneratedSession(): void {
  rows = []
  details = {}
  graphs = {}
}
