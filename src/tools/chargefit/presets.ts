export type Chemistry = 'lfp' | 'ncm'

export interface ChemistryPreset {
  id: Chemistry
  name: string
  /** Charge ceiling used as the default target for this chemistry. */
  dailyTargetSoc: number
  advice: string
}

/**
 * Tesla tells LFP cars to charge to 100% at least once a week so the BMS keeps
 * its state-of-charge calibration; NCM packs are the ones that age faster when
 * held at full, so the daily limit sits lower.
 */
export const CHEMISTRIES: ChemistryPreset[] = [
  {
    id: 'lfp',
    name: '磷酸铁锂',
    dailyTargetSoc: 100,
    advice: '磷酸铁锂要定期充到 100% 才校准得准电量，满电停放对它的负担也小，按出发时间充满就行。',
  },
  {
    id: 'ncm',
    name: '三元锂',
    dailyTargetSoc: 90,
    advice: '三元锂日常充到 80–90% 更耐久，最怕满电久放，所以卡在出发前刚好充满最合适。',
  },
]

export interface CarPreset {
  id: string
  name: string
  hint: string
  capacityKwh: number
  chemistry: Chemistry
}

export const CAR_PRESETS: CarPreset[] = [
  { id: 'm3-rwd', name: '后轮驱动版', hint: '60 kWh · 磷酸铁锂', capacityKwh: 60, chemistry: 'lfp' },
  { id: 'm3-lr', name: '长续航', hint: '78 kWh · 三元锂', capacityKwh: 78, chemistry: 'ncm' },
  { id: 'm3-perf', name: '高性能', hint: '80 kWh · 三元锂', capacityKwh: 80, chemistry: 'ncm' },
]

export interface ChargerPreset {
  id: string
  name: string
  hint: string
  volts: number
  phases: 1 | 3
  maxCurrentA: number
}

/**
 * Model 3 的车载交流充电机：单相 32 A 约 7 kW，三相时被车端限在约 11 kW
 * （380 V × 16 A × √3），随车充按插座档位 10 A / 16 A。
 */
export const CHARGER_PRESETS: ChargerPreset[] = [
  { id: 'portable-10', name: '随车充 10A', hint: '约 2.2 kW', volts: 220, phases: 1, maxCurrentA: 10 },
  { id: 'portable-16', name: '随车充 16A', hint: '约 3.5 kW', volts: 220, phases: 1, maxCurrentA: 16 },
  { id: 'home-7', name: '家充桩', hint: '220V 单相 32A · 7 kW', volts: 220, phases: 1, maxCurrentA: 32 },
  { id: 'home-11', name: '三相桩', hint: '380V 三相 · 车端 11 kW', volts: 380, phases: 3, maxCurrentA: 16 },
]

export function chemistryOf(id: Chemistry) {
  return CHEMISTRIES.find((c) => c.id === id) ?? CHEMISTRIES[0]!
}

export function carOf(id: string) {
  return CAR_PRESETS.find((c) => c.id === id) ?? CAR_PRESETS[0]!
}

export function chargerOf(id: string) {
  return CHARGER_PRESETS.find((c) => c.id === id) ?? CHARGER_PRESETS[2]!
}
