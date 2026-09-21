import { computed, ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { toolStorage } from '@/core/storage'
import { MIN_PILOT_A, planCharge } from './calc'
import type { ChargePlan } from './calc'
import { CAR_PRESETS, SUPPLY_PRESETS } from './presets'
import type { CarPreset, SupplyPreset } from './presets'
import { dayDiff, hhmm, minutesUntil, resolveDepart } from './depart'

export const TOOL_ID = 'charge-fit'
export const BUFFER_CHOICES = [15, 30, 45, 60]
export const STEP_CHOICES = [1, 5]
export const TARGET_CHOICES = [80, 90, 100]

interface SavedPlan {
  a: number
  soc: number
  target: number
  depart: number
  buffer: number
  at: number
}

function same(a: SavedPlan | null, b: SavedPlan | null) {
  if (!a || !b) return a === b
  return (
    a.a === b.a &&
    a.soc === b.soc &&
    a.target === b.target &&
    a.depart === b.depart &&
    a.buffer === b.buffer
  )
}

export function useChargeFit() {
  // A slow ticker: the plan only needs to stay honest to the minute.
  const nowMs = ref(Date.now())
  useIntervalFn(() => (nowMs.value = Date.now()), 20_000)

  const currentSoc = toolStorage(TOOL_ID, 'soc', 50)
  const targetSoc = toolStorage(TOOL_ID, 'target', 100)
  /** A habit, not a date: time of day plus how many days out. */
  const departHHMM = toolStorage(TOOL_ID, 'depart', '07:30')
  const departDay = toolStorage(TOOL_ID, 'departDay', 1)
  const bufferMin = toolStorage(TOOL_ID, 'buffer', 45)
  const carId = toolStorage(TOOL_ID, 'car', 'm3-standard')
  const capacityKwh = toolStorage(TOOL_ID, 'capacity', CAR_PRESETS[0]!.capacityKwh)
  const supplyId = toolStorage(TOOL_ID, 'supply', 'single')
  const maxCurrentA = toolStorage(TOOL_ID, 'maxA', 32)
  const stepA = toolStorage(TOOL_ID, 'step', 1)
  const efficiencyPct = toolStorage(TOOL_ID, 'eff', 90)

  const car = computed<CarPreset>(
    () => CAR_PRESETS.find((c) => c.id === carId.value) ?? CAR_PRESETS[0]!,
  )
  const supply = computed<SupplyPreset>(
    () => SUPPLY_PRESETS.find((s) => s.id === supplyId.value) ?? SUPPLY_PRESETS[0]!,
  )
  const isCustomCar = computed(() => capacityKwh.value !== car.value.capacityKwh)

  const departDate = computed(() => resolveDepart(departHHMM.value, departDay.value, nowMs.value))
  const departMs = computed(() => departDate.value.getTime())
  const remainingMin = computed(() => minutesUntil(departMs.value, nowMs.value))

  const plan = computed<ChargePlan>(() =>
    planCharge({
      nowMs: nowMs.value,
      departMs: departMs.value,
      currentSoc: currentSoc.value,
      targetSoc: targetSoc.value,
      capacityKwh: capacityKwh.value,
      minCurrentA: MIN_PILOT_A,
      maxCurrentA: maxCurrentA.value,
      stepA: stepA.value,
      volts: supply.value.volts,
      phases: supply.value.phases,
      efficiency: efficiencyPct.value / 100,
      bufferMin: bufferMin.value,
    }),
  )

  const saved = toolStorage<SavedPlan | null>(TOOL_ID, 'prev', null)

  function snapshot(): SavedPlan | null {
    if (plan.value.status !== 'ready') return null
    return {
      a: plan.value.currentA,
      soc: currentSoc.value,
      target: targetSoc.value,
      depart: departMs.value,
      buffer: bufferMin.value,
      at: Date.now(),
    }
  }

  const restoreHint = computed(() => (same(saved.value, snapshot()) ? null : saved.value))

  /** Runs when the screen closes, so "上次" is the plan you actually walked away with. */
  function commitSnapshot() {
    const next = snapshot()
    if (next && !same(next, saved.value)) saved.value = next
  }

  function setDepart(date: Date) {
    departHHMM.value = hhmm(date)
    departDay.value = Math.max(0, dayDiff(date.getTime(), nowMs.value))
  }

  function restoreSnapshot() {
    const s = saved.value
    if (!s) return
    currentSoc.value = s.soc
    targetSoc.value = s.target
    bufferMin.value = s.buffer
    setDepart(new Date(s.depart))
    saved.value = null
  }

  function pickCar(id: string) {
    const preset = CAR_PRESETS.find((c) => c.id === id)
    if (!preset) return
    carId.value = preset.id
    capacityKwh.value = preset.capacityKwh
  }

  function pickSupply(id: string) {
    const preset = SUPPLY_PRESETS.find((s) => s.id === id)
    if (preset) supplyId.value = preset.id
  }

  return {
    nowMs,
    currentSoc,
    targetSoc,
    departHHMM,
    departDay,
    departDate,
    departMs,
    remainingMin,
    bufferMin,
    capacityKwh,
    maxCurrentA,
    stepA,
    efficiencyPct,
    car,
    carId,
    supply,
    supplyId,
    isCustomCar,
    plan,
    restoreHint,
    commitSnapshot,
    restoreSnapshot,
    setDepart,
    pickCar,
    pickSupply,
  }
}

export type ChargeFitState = ReturnType<typeof useChargeFit>
