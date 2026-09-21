import { computed, ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { toolStorage } from '@/core/storage'
import { AC_EFFICIENCY, planCharge } from './calc'
import type { ChargePlan } from './calc'
import { CAR_PRESETS, CHARGER_PRESETS, CHEMISTRIES, carOf, chemistryOf, chargerOf } from './presets'
import type { Chemistry } from './presets'
import { dayDiff, hhmm, minutesUntil, resolveDepart, resolveStart } from './depart'

export const TOOL_ID = 'charge-fit'
export const DEPART_HOURS = [6, 7, 8, 9, 10]
export const BUFFER_CHOICES = [0, 15, 30, 45, 60]
export const STEP_CHOICES = [1, 5]
export const TARGET_CHOICES = [80, 90, 100]
/** Sitting at full for more than this is worth a nudge. */
export const SIT_WARN_MIN = 90

interface SavedPlan {
  a: number
  soc: number
  target: number
  depart: number
  start: number
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
    a.start === b.start &&
    a.buffer === b.buffer
  )
}

export function useChargeFit() {
  // A slow ticker: the plan only needs to stay honest to the minute.
  const nowMs = ref(Date.now())
  useIntervalFn(() => (nowMs.value = Date.now()), 20_000)

  const currentSoc = toolStorage(TOOL_ID, 'soc', 50)
  const chemistry = toolStorage<Chemistry>(TOOL_ID, 'chem', 'lfp')
  const carId = toolStorage(TOOL_ID, 'car', 'm3-rwd')
  const capacityKwh = toolStorage(TOOL_ID, 'capacity', carOf('m3-rwd').capacityKwh)
  const chargerId = toolStorage(TOOL_ID, 'charger', 'home-7')
  const maxCurrentA = toolStorage(TOOL_ID, 'maxA', chargerOf('home-7').maxCurrentA)
  const stepA = toolStorage(TOOL_ID, 'step', 1)
  const targetSoc = toolStorage(TOOL_ID, 'target', chemistryOf('lfp').dailyTargetSoc)
  const departHHMM = toolStorage(TOOL_ID, 'depart', '09:00')
  const departDay = toolStorage(TOOL_ID, 'departDay', 1)
  const startMode = toolStorage<'now' | 'sched'>(TOOL_ID, 'startMode', 'sched')
  const startHHMM = toolStorage(TOOL_ID, 'start', '01:00')
  const startShift = toolStorage(TOOL_ID, 'startShift', 0)
  const bufferMin = toolStorage(TOOL_ID, 'buffer', 30)

  const car = computed(() => carOf(carId.value))
  const charger = computed(() => chargerOf(chargerId.value))
  const chem = computed(() => chemistryOf(chemistry.value))
  const isCustomCapacity = computed(() => capacityKwh.value !== car.value.capacityKwh)
  const isCustomCurrent = computed(() => maxCurrentA.value !== charger.value.maxCurrentA)

  const departDate = computed(() => resolveDepart(departHHMM.value, departDay.value, nowMs.value))
  const departMs = computed(() => departDate.value.getTime())
  const remainingMin = computed(() => minutesUntil(departMs.value, nowMs.value))

  const start = computed(() =>
    resolveStart({
      mode: startMode.value,
      time: startHHMM.value,
      shift: startShift.value,
      departMs: departMs.value,
      nowMs: nowMs.value,
    }),
  )
  const startMs = computed(() => start.value.ms)

  const plan = computed<ChargePlan>(() =>
    planCharge({
      nowMs: nowMs.value,
      startMs: startMs.value,
      departMs: departMs.value,
      currentSoc: currentSoc.value,
      targetSoc: targetSoc.value,
      capacityKwh: capacityKwh.value,
      maxCurrentA: maxCurrentA.value,
      stepA: stepA.value,
      volts: charger.value.volts,
      phases: charger.value.phases,
      efficiency: AC_EFFICIENCY,
      bufferMin: bufferMin.value,
    }),
  )

  /** Later start, same current, still full on time — the anti-"sit at full" fix. */
  const suggestedStartMs = computed(() => {
    const p = plan.value
    if (p.status === 'ready') return p.slackMin > 15 ? p.latestStartMs : null
    if (p.status === 'insufficient' && !p.late) return p.neededStartMs
    return null
  })

  // Written from onBeforeUnmount, so it has to hit storage synchronously —
  // useStorage's default 'pre' flush is dropped while the scope is tearing down.
  // Stored as an explicit JSON string because a `null` default makes VueUse skip
  // serialising the object at all.
  const savedRaw = toolStorage(TOOL_ID, 'prev', '', { flush: 'sync' })
  const saved = computed<SavedPlan | null>({
    get: () => {
      if (!savedRaw.value) return null
      try {
        return JSON.parse(savedRaw.value) as SavedPlan
      } catch {
        return null
      }
    },
    set: (value) => {
      savedRaw.value = value ? JSON.stringify(value) : ''
    },
  })

  function snapshot(): SavedPlan | null {
    if (plan.value.status !== 'ready') return null
    return {
      a: plan.value.currentA,
      soc: currentSoc.value,
      target: targetSoc.value,
      depart: departMs.value,
      start: startMs.value,
      buffer: bufferMin.value,
      at: Date.now(),
    }
  }

  const restoreHint = computed(() => (same(saved.value, snapshot()) ? null : saved.value))

  /** Runs when the screen closes, so "上次" is the plan you walked away with. */
  function commitSnapshot() {
    const next = snapshot()
    if (next && !same(next, saved.value)) saved.value = next
  }

  function setDepart(date: Date) {
    departHHMM.value = hhmm(date)
    departDay.value = Math.max(0, dayDiff(date.getTime(), nowMs.value))
  }

  function setStart(date: Date) {
    startMode.value = 'sched'
    startHHMM.value = hhmm(date)
    startShift.value = Math.min(0, dayDiff(date.getTime(), departMs.value))
  }

  function startNow() {
    startMode.value = 'now'
  }

  function pickCar(id: string) {
    const preset = CAR_PRESETS.find((c) => c.id === id)
    if (!preset) return
    carId.value = preset.id
    capacityKwh.value = preset.capacityKwh
    pickChemistry(preset.chemistry)
  }

  function pickChemistry(id: Chemistry) {
    const preset = CHEMISTRIES.find((c) => c.id === id)
    if (!preset) return
    chemistry.value = preset.id
    targetSoc.value = preset.dailyTargetSoc
  }

  function pickCharger(id: string) {
    const preset = CHARGER_PRESETS.find((c) => c.id === id)
    if (!preset) return
    chargerId.value = preset.id
    maxCurrentA.value = preset.maxCurrentA
  }

  function restoreSnapshot() {
    const s = saved.value
    if (!s) return
    currentSoc.value = s.soc
    targetSoc.value = s.target
    bufferMin.value = s.buffer
    setDepart(new Date(s.depart))
    setStart(new Date(s.start))
    saved.value = null
  }

  return {
    nowMs,
    currentSoc,
    chemistry,
    carId,
    capacityKwh,
    chargerId,
    maxCurrentA,
    stepA,
    targetSoc,
    departHHMM,
    departDay,
    departDate,
    departMs,
    remainingMin,
    startMode,
    startHHMM,
    startShift,
    startMs,
    startClamped: computed(() => start.value.clamped),
    bufferMin,
    car,
    charger,
    chem,
    isCustomCapacity,
    isCustomCurrent,
    plan,
    suggestedStartMs,
    restoreHint,
    commitSnapshot,
    restoreSnapshot,
    setDepart,
    setStart,
    startNow,
    pickCar,
    pickChemistry,
    pickCharger,
  }
}

export type ChargeFitState = ReturnType<typeof useChargeFit>
