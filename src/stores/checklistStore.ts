import { create } from 'zustand'
import {
  PREP_OFFICE_ITEMS,
  PREP_VESSEL_ITEMS,
  INSPECTION_ROWS,
  type PIC,
} from '@/data/vesselInspectionConstants'

export interface ChecklistGuidanceItem {
  id: string
  pic: PIC
  guidance: string
}

export interface ChecklistArea {
  id: string
  name: string
  items: ChecklistGuidanceItem[]
}

function buildDefaultAreas(): ChecklistArea[] {
  const areas: ChecklistArea[] = []
  let current: ChecklistArea | null = null
  let counter = 0
  for (const row of INSPECTION_ROWS) {
    if (row.area !== undefined) {
      if (current) areas.push(current)
      current = {
        id: `area-default-${counter++}`,
        name: row.area,
        items: [{ id: `item-default-${counter++}`, pic: row.pic, guidance: row.guidance }],
      }
    } else if (current) {
      current.items.push({ id: `item-default-${counter++}`, pic: row.pic, guidance: row.guidance })
    }
  }
  if (current) areas.push(current)
  return areas
}

const STORAGE_KEY = 'checklist_master_v1'

function loadFromStorage(): StoredData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredData
  } catch {}
  return null
}

interface StoredData {
  prepOffice: string[]
  prepVessel: string[]
  areas: ChecklistArea[]
}

function persist(state: StoredData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

function moveItem<T>(arr: T[], idx: number, dir: 'up' | 'down'): T[] {
  const next = [...arr]
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= next.length) return next
  ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
  return next
}

interface ChecklistState extends StoredData {
  addPrepOffice: (item: string) => void
  updatePrepOffice: (idx: number, item: string) => void
  deletePrepOffice: (idx: number) => void
  movePrepOffice: (idx: number, dir: 'up' | 'down') => void

  addPrepVessel: (item: string) => void
  updatePrepVessel: (idx: number, item: string) => void
  deletePrepVessel: (idx: number) => void
  movePrepVessel: (idx: number, dir: 'up' | 'down') => void

  addArea: (name: string) => void
  updateAreaName: (id: string, name: string) => void
  deleteArea: (id: string) => void
  moveArea: (id: string, dir: 'up' | 'down') => void

  addGuidanceItem: (areaId: string, pic: PIC, guidance: string) => void
  updateGuidanceItem: (areaId: string, itemId: string, pic: PIC, guidance: string) => void
  deleteGuidanceItem: (areaId: string, itemId: string) => void
  moveGuidanceItem: (areaId: string, itemId: string, dir: 'up' | 'down') => void

  reset: () => void
}

const stored = loadFromStorage()
const defaultAreas = buildDefaultAreas()

const initialState: StoredData = stored ?? {
  prepOffice: [...PREP_OFFICE_ITEMS],
  prepVessel: [...PREP_VESSEL_ITEMS],
  areas: defaultAreas,
}

export const useChecklistStore = create<ChecklistState>((set, get) => {
  function save(partial: Partial<StoredData>) {
    const s = get()
    const next = { prepOffice: s.prepOffice, prepVessel: s.prepVessel, areas: s.areas, ...partial }
    persist(next)
    return next
  }

  return {
    ...initialState,

    addPrepOffice: (item) => set(s => save({ prepOffice: [...s.prepOffice, item] })),
    updatePrepOffice: (idx, item) => set(s => save({ prepOffice: s.prepOffice.map((v, i) => (i === idx ? item : v)) })),
    deletePrepOffice: (idx) => set(s => save({ prepOffice: s.prepOffice.filter((_, i) => i !== idx) })),
    movePrepOffice: (idx, dir) => set(s => save({ prepOffice: moveItem(s.prepOffice, idx, dir) })),

    addPrepVessel: (item) => set(s => save({ prepVessel: [...s.prepVessel, item] })),
    updatePrepVessel: (idx, item) => set(s => save({ prepVessel: s.prepVessel.map((v, i) => (i === idx ? item : v)) })),
    deletePrepVessel: (idx) => set(s => save({ prepVessel: s.prepVessel.filter((_, i) => i !== idx) })),
    movePrepVessel: (idx, dir) => set(s => save({ prepVessel: moveItem(s.prepVessel, idx, dir) })),

    addArea: (name) => set(s => save({ areas: [...s.areas, { id: uid(), name, items: [] }] })),
    updateAreaName: (id, name) => set(s => save({ areas: s.areas.map(a => a.id === id ? { ...a, name } : a) })),
    deleteArea: (id) => set(s => save({ areas: s.areas.filter(a => a.id !== id) })),
    moveArea: (id, dir) => set(s => {
      const idx = s.areas.findIndex(a => a.id === id)
      return idx < 0 ? {} : save({ areas: moveItem(s.areas, idx, dir) })
    }),

    addGuidanceItem: (areaId, pic, guidance) => set(s => save({
      areas: s.areas.map(a => a.id === areaId
        ? { ...a, items: [...a.items, { id: uid(), pic, guidance }] }
        : a),
    })),
    updateGuidanceItem: (areaId, itemId, pic, guidance) => set(s => save({
      areas: s.areas.map(a => a.id === areaId
        ? { ...a, items: a.items.map(it => it.id === itemId ? { ...it, pic, guidance } : it) }
        : a),
    })),
    deleteGuidanceItem: (areaId, itemId) => set(s => save({
      areas: s.areas.map(a => a.id === areaId
        ? { ...a, items: a.items.filter(it => it.id !== itemId) }
        : a),
    })),
    moveGuidanceItem: (areaId, itemId, dir) => set(s => {
      const aIdx = s.areas.findIndex(a => a.id === areaId)
      if (aIdx < 0) return {}
      const area = s.areas[aIdx]
      const iIdx = area.items.findIndex(it => it.id === itemId)
      if (iIdx < 0) return {}
      const newAreas = [...s.areas]
      newAreas[aIdx] = { ...area, items: moveItem(area.items, iIdx, dir) }
      return save({ areas: newAreas })
    }),

    reset: () => {
      const fresh: StoredData = {
        prepOffice: [...PREP_OFFICE_ITEMS],
        prepVessel: [...PREP_VESSEL_ITEMS],
        areas: buildDefaultAreas(),
      }
      persist(fresh)
      set(fresh)
    },
  }
})

export function useChecklistAsInspectionRows() {
  const { prepOffice, prepVessel, areas } = useChecklistStore()
  const inspectionRows = areas.flatMap(a =>
    a.items.map((item, i) => ({
      ...(i === 0 ? { area: a.name, rowspan: a.items.length } : {}),
      pic: item.pic,
      guidance: item.guidance,
    }))
  )
  return { prepOffice, prepVessel, inspectionRows, areas }
}
