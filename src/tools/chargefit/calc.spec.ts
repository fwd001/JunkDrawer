import { describe, expect, it } from 'vitest'
import { currentLadder, gridPowerKw, planCharge } from './calc'
import type { ChargeInput } from './calc'

const H = 3_600_000
const base: ChargeInput = {
  nowMs: 0,
  startMs: 0,
  departMs: 8 * H,
  currentSoc: 50,
  targetSoc: 100,
  capacityKwh: 60,
  maxCurrentA: 32,
  stepA: 1,
  volts: 220,
  phases: 1,
  efficiency: 0.9,
  bufferMin: 30,
}

describe('planCharge', () => {
  it('picks the gentlest current that still clears the buffer', () => {
    const plan = planCharge(base)
    // 30 kWh into a 0.198 kW/A pack, deadline 450 min -> 20 A needs 454 min.
    expect(plan).toMatchObject({ status: 'ready', currentA: 21 })
    if (plan.status !== 'ready') return
    expect(plan.minutes).toBeCloseTo(432.9, 1)
    expect(plan.sitMin).toBeCloseTo(47.1, 1)
    expect(plan.powerKw).toBeCloseTo(4.62, 2)
  })

  it('reserves a larger buffer when asked', () => {
    expect(planCharge({ ...base, bufferMin: 60 })).toMatchObject({ status: 'ready', currentA: 22 })
  })

  it('honours the current step', () => {
    expect(planCharge({ ...base, stepA: 5 })).toMatchObject({ status: 'ready', currentA: 21 })
  })

  it('reports how long the car would sit at full so the start can be pushed back', () => {
    const plan = planCharge({ ...base, departMs: 48 * H })
    if (plan.status !== 'ready') throw new Error('expected ready')
    expect(plan.currentA).toBe(6)
    // 6 A takes ~25 h, the deadline is 47.5 h away.
    expect(plan.latestStartMs).toBeGreaterThan(20 * H)
    expect(plan.slackMin).toBeCloseTo(2850 - plan.minutes, 1)
  })

  it('says so when the wiring cannot keep up', () => {
    const plan = planCharge({ ...base, currentSoc: 10, departMs: 2 * H, maxCurrentA: 16 })
    expect(plan).toMatchObject({ status: 'insufficient', currentA: 16, late: true })
    if (plan.status !== 'insufficient') return
    expect(plan.arrivalSoc).toBeCloseTo(17.92, 1)
    expect(plan.neededStartMs).toBeLessThan(0)
  })

  it('names the start time that would have made it work', () => {
    const plan = planCharge({ ...base, startMs: 6 * H, departMs: 8 * H, bufferMin: 0 })
    expect(plan).toMatchObject({ status: 'insufficient', late: false })
    if (plan.status !== 'insufficient') return
    // 30 kWh at 32 A (6.34 kW into the pack) needs 4.73 h before the 08:00 deadline.
    expect(plan.neededStartMs).toBeCloseTo(8 * H - (30 / 6.336) * H, -6)
  })

  it('refuses a start time after the deadline', () => {
    const plan = planCharge({ ...base, startMs: 7.9 * H })
    expect(plan).toMatchObject({ status: 'too-late', deadlineMs: 7.5 * H })
  })

  it('does nothing when the pack is already at the target', () => {
    expect(planCharge({ ...base, currentSoc: 90, targetSoc: 80 })).toMatchObject({ status: 'idle' })
  })

  it('refuses a departure time in the past', () => {
    expect(planCharge({ ...base, departMs: -H })).toMatchObject({ status: 'departed' })
  })
})

describe('currentLadder', () => {
  it('always ends on the hard maximum', () => {
    expect(currentLadder({ maxCurrentA: 32, stepA: 5 })).toEqual([6, 11, 16, 21, 26, 31, 32])
  })

  it('covers a 10 A portable charger', () => {
    expect(currentLadder({ maxCurrentA: 10, stepA: 5 })).toEqual([6, 10])
  })
})

describe('gridPowerKw', () => {
  it('is single phase', () => {
    expect(gridPowerKw({ volts: 220, phases: 1 }, 32)).toBeCloseTo(7.04, 2)
  })

  it('is three phase', () => {
    expect(gridPowerKw({ volts: 380, phases: 3 }, 16)).toBeCloseTo(10.53, 2)
  })
})
