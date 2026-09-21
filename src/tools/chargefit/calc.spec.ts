import { describe, expect, it } from 'vitest'
import { currentLadder, gridPowerKw, planCharge } from './calc'
import type { ChargeInput } from './calc'

const H = 3_600_000
const base: ChargeInput = {
  nowMs: 0,
  departMs: 8 * H,
  currentSoc: 50,
  targetSoc: 100,
  capacityKwh: 60,
  minCurrentA: 6,
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
    expect(plan.minutes).toBeLessThanOrEqual(450)
    expect(plan.marginMin).toBeGreaterThanOrEqual(30)
    expect(plan.powerKw).toBeCloseTo(4.62, 2)
  })

  it('reserves a larger buffer when asked', () => {
    const plan = planCharge({ ...base, bufferMin: 60 })
    expect(plan).toMatchObject({ status: 'ready', currentA: 22 })
  })

  it('honours the current step', () => {
    const plan = planCharge({ ...base, stepA: 5 })
    expect(plan).toMatchObject({ status: 'ready', currentA: 21 })
  })

  it('says so when the wiring cannot keep up', () => {
    const plan = planCharge({
      ...base,
      currentSoc: 10,
      departMs: 2 * H,
      maxCurrentA: 16,
    })
    expect(plan).toMatchObject({ status: 'insufficient', currentA: 16 })
    if (plan.status !== 'insufficient') return
    expect(plan.arrivalSoc).toBeCloseTo(20.56, 1)
    expect(plan.arrivalSoc).toBeLessThan(base.targetSoc)
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
    expect(currentLadder({ minCurrentA: 6, maxCurrentA: 32, stepA: 5 })).toEqual([
      6, 11, 16, 21, 26, 31, 32,
    ])
  })

  it('steps by 1 A', () => {
    expect(currentLadder({ minCurrentA: 6, maxCurrentA: 8, stepA: 1 })).toEqual([6, 7, 8])
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
