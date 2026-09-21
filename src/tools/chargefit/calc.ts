export const MIN_MS = 60_000
/** The AC pilot floor: a charger cannot negotiate below 6 A. */
export const MIN_PILOT_A = 6
/** Grid meter → battery over an AC session: onboard charger, wiring and thermal losses. */
export const AC_EFFICIENCY = 0.88

export interface ChargeInput {
  nowMs: number
  /** When charging actually starts (scheduled or now). */
  startMs: number
  departMs: number
  currentSoc: number
  targetSoc: number
  /** Usable pack energy, kWh. */
  capacityKwh: number
  maxCurrentA: number
  stepA: number
  volts: number
  phases: 1 | 3
  /** Share of grid energy that lands in the pack (0-1). */
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
  /** Minutes earlier than the requested buffer — how long it would sit at full. */
  slackMin: number
  /** Minutes between finishing and departing. */
  sitMin: number
  /** Keeping this current, the latest start that still hits the deadline. */
  latestStartMs: number
  energyKwh: number
}

export interface ChargeInsufficient {
  status: 'insufficient'
  currentA: number
  powerKw: number
  minutes: number
  finishMs: number
  /** SOC reachable by the deadline at the maximum current. */
  arrivalSoc: number
  /** Start no later than this and the target is reachable. */
  neededStartMs: number
  /** True when even starting right now cannot make it. */
  late: boolean
  energyKwh: number
}

export type ChargePlan =
  | ChargeReady
  | ChargeInsufficient
  | { status: 'idle'; energyKwh: number }
  | { status: 'departed' }
  | { status: 'too-late'; deadlineMs: number }

export function gridPowerKw(i: Pick<ChargeInput, 'volts' | 'phases'>, currentA: number) {
  return (i.volts * currentA * (i.phases === 3 ? Math.sqrt(3) : 1)) / 1000
}

export function storedPowerKw(i: ChargeInput, currentA: number) {
  return gridPowerKw(i, currentA) * i.efficiency
}

/** Ascending current candidates, always ending at the hard maximum. */
export function currentLadder(i: Pick<ChargeInput, 'maxCurrentA' | 'stepA'>) {
  const step = i.stepA > 0 ? i.stepA : 1
  const out: number[] = []
  for (let a = MIN_PILOT_A; a < i.maxCurrentA; a += step) out.push(a)
  out.push(i.maxCurrentA)
  return out
}

/**
 * The window between the scheduled start and the deadline decides the current:
 * the *lowest* rung that still fills the pack in time wins, so the car is both
 * charged gently and full exactly when it is needed rather than hours earlier.
 */
export function planCharge(i: ChargeInput): ChargePlan {
  if (i.departMs <= i.nowMs) return { status: 'departed' }
  const energyKwh = ((i.targetSoc - i.currentSoc) / 100) * i.capacityKwh
  if (energyKwh <= 0) return { status: 'idle', energyKwh }

  const deadlineMs = i.departMs - i.bufferMin * MIN_MS
  if (i.startMs >= deadlineMs) return { status: 'too-late', deadlineMs }

  const ladder = currentLadder(i)

  for (const currentA of ladder) {
    const rate = storedPowerKw(i, currentA)
    if (rate <= 0) continue
    const minutes = (energyKwh / rate) * 60
    const finishMs = i.startMs + minutes * MIN_MS
    if (finishMs <= deadlineMs) {
      return {
        status: 'ready',
        currentA,
        powerKw: gridPowerKw(i, currentA),
        minutes,
        finishMs,
        slackMin: (deadlineMs - finishMs) / MIN_MS,
        sitMin: (i.departMs - finishMs) / MIN_MS,
        latestStartMs: deadlineMs - minutes * MIN_MS,
        energyKwh,
      }
    }
  }

  const currentA = ladder[ladder.length - 1]!
  const rate = storedPowerKw(i, currentA)
  const minutes = (energyKwh / rate) * 60
  const windowMin = (deadlineMs - i.startMs) / MIN_MS
  const neededStartMs = deadlineMs - minutes * MIN_MS
  return {
    status: 'insufficient',
    currentA,
    powerKw: gridPowerKw(i, currentA),
    minutes,
    finishMs: i.startMs + minutes * MIN_MS,
    arrivalSoc: i.currentSoc + ((rate * windowMin) / 60 / i.capacityKwh) * 100,
    neededStartMs,
    late: neededStartMs <= i.nowMs,
    energyKwh,
  }
}
