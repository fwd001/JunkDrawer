export interface CarPreset {
  id: string
  name: string
  hint: string
  capacityKwh: number
}

/** Usable pack energy rather than the brochure figure. */
export const CAR_PRESETS: CarPreset[] = [
  { id: 'm3-standard', name: '后轮驱动', hint: '60 kWh', capacityKwh: 60 },
  { id: 'm3-longrange', name: '长续航', hint: '78 kWh', capacityKwh: 78 },
  { id: 'm3-performance', name: '高性能', hint: '80 kWh', capacityKwh: 80 },
]

export interface SupplyPreset {
  id: string
  name: string
  volts: number
  phases: 1 | 3
}

export const SUPPLY_PRESETS: SupplyPreset[] = [
  { id: 'single', name: '220V 单相', volts: 220, phases: 1 },
  { id: 'three', name: '380V 三相', volts: 380, phases: 3 },
]
