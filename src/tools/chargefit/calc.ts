export const MIN_MS = 60_000
/** The AC pilot floor: a charger cannot negotiate below 6 A. */
export const MIN_PILOT_A = 6

export interface ChargeInput {
  nowMs: number
  /** Absolute moment the car must be ready. */
  departMs: number
  currentSoc: number
  targetSoc: number
  /** Usable pack energy, kWh. */
  capacityKwh: number
  minCurrentA: number
  maxCurrentA: number
  stepA: number
  volts: number
  phases: 1 | 3
  /** Share of grid energy that actually lands in the pack (0-1). */
  efficiency: number
  /** Arrive this many minutes before departure. */
  bufferMin: number
}

export interface ChargeReady {
  status: 'ready'
  currentA: number
  powerKw: number
  minutes: number
  finishMs: number
  /** Minutes of slack between finishing and departing. */
  marginMin: number
  energyKwh: number
}

export interface ChargeInsufficient {
  status: 'insufficient'
  currentA: number
  powerKw: number
  /** SOC actually reachable by departure at the maximum current. */
  arrivalSoc: number
  minutesToTarget: number
  finishMs: number
  energyKwh: number
}

export type ChargePlan =
  | ChargeReady
  | ChargeInsufficient
  | { status: 'idle'; energyKwh: number }
  | { status: 'departed' }

export function gridPowerKw(i: Pick<ChargeInput, 'volts' | 'phases'>, currentA: number) {
  return (i.volts * currentA * (i.phases === 3 ? Math.sqrt(3) : 1)) / 1000
}

export function storedPowerKw(i: ChargeInput, currentA: number) {
  return gridPowerKw(i, currentA) * i.efficiency
}

/** Ascending current candidates, always ending at the hard maximum. */
export function currentLadder(i: Pick<ChargeInput, 'minCurrentA' | 'maxCurrentA' | 'stepA'>) {
  const step = i.stepA > 0 ? i.stepA : 1
  const out: number[] = []
  for (let a = i.minCurrentA; a < i.maxCurrentA; a += step) out.push(a)
  out.push(i.maxCurrentA)
  return out
}

/**
 * Pick the *lowest* current that still fills the pack before the deadline —
 * gentler on the battery and the wiring than simply maxing out.
 */
export function planCharge(i: ChargeInput): ChargePlan {
  const energyKwh = ((i.targetSoc - i.currentSoc) / 100) * i.capacityKwh
  if (i.departMs <= i.nowMs) return { status: 'departed' }
  if (energyKwh <= 0) return { status: 'idle', energyKwh }

  const deadlineMs = i.departMs - i.bufferMin * MIN_MS
  const ladder = currentLadder(i)

  for (const currentA of ladder) {
    const rate = storedPowerKw(i, currentA)
    if (rate <= 0) continue
    const minutes = (energyKwh / rate) * 60
    const finishMs = i.nowMs + minutes * MIN_MS
    if (finishMs <= deadlineMs) {
      return {
        status: 'ready',
        currentA,
        powerKw: gridPowerKw(i, currentA),
        minutes,
        finishMs,
        marginMin: (i.departMs - finishMs) / MIN_MS,
        energyKwh,
      }
    }
  }

  const currentA = ladder[ladder.length - 1]!
  const rate = storedPowerKw(i, currentA)
  const minutesToTarget = (energyKwh / rate) * 60
  const windowMin = (i.departMs - i.nowMs) / MIN_MS
  return {
    status: 'insufficient',
    currentA,
    powerKw: gridPowerKw(i, currentA),
    arrivalSoc: i.currentSoc + ((rate * windowMin) / 60 / i.capacityKwh) * 100,
    minutesToTarget,
    finishMs: i.nowMs + minutesToTarget * MIN_MS,
    energyKwh,
  }
}
