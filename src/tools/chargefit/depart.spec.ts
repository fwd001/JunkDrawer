import { describe, expect, it } from 'vitest'
import { dayDiff, hhmm, resolveStart, rollForward, splitHHMM } from './depart'
import { dayLabel, when } from '@/core/format'

/** Local wall-clock times, because every one of these is a "which morning" question. */
const at = (day: number, h: number, mi = 0) => {
  const d = new Date(2026, 8, 21 + day, h, mi, 0, 0)
  return d.getTime()
}
const NOW = at(0, 15, 20)

describe('rollForward', () => {
  it('leaves a future departure alone', () => {
    expect(rollForward(at(1, 9), NOW).getTime()).toBe(at(1, 9))
  })

  it('keeps the clock time and takes the next day once it has passed', () => {
    expect(rollForward(at(0, 9), NOW).getTime()).toBe(at(1, 9))
  })

  it('still reads as 今天 just after midnight, which "1 day out" would not', () => {
    const pastMidnight = at(0, 0, 30)
    const d = rollForward(at(-1, 9), pastMidnight)
    expect(dayLabel(d.getTime(), new Date(pastMidnight))).toBe('今天')
    expect(hhmm(d)).toBe('09:00')
  })

  it('rolls over several days', () => {
    expect(rollForward(at(0, 9), at(2, 10)).getTime()).toBe(at(3, 9))
  })
})

describe('resolveStart', () => {
  const tomorrow9 = at(1, 9)

  it('anchors 出发当天 01:00 to the departure day, not to tonight', () => {
    const r = resolveStart({ mode: 'sched', time: '01:00', shift: 0, departMs: tomorrow9, nowMs: NOW })
    expect(r.clamped).toBe(false)
    expect(`${dayLabel(r.ms, new Date(NOW))} ${hhmm(new Date(r.ms))}`).toBe('明天 01:00')
  })

  it('anchors 出发前夜 22:00 to the night before the departure', () => {
    const r = resolveStart({ mode: 'sched', time: '22:00', shift: -1, departMs: tomorrow9, nowMs: NOW })
    expect(r.clamped).toBe(false)
    expect(`${dayLabel(r.ms, new Date(NOW))} ${hhmm(new Date(r.ms))}`).toBe('今天 22:00')
  })

  it('collapses a start that already passed into "now" and says so', () => {
    const r = resolveStart({ mode: 'sched', time: '01:00', shift: 0, departMs: at(0, 18), nowMs: NOW })
    expect(r.clamped).toBe(true)
    expect(r.ms).toBe(NOW)
  })

  it('treats mode now as now', () => {
    expect(resolveStart({ mode: 'now', time: '01:00', shift: 0, departMs: tomorrow9, nowMs: NOW })).toEqual({
      ms: NOW,
      clamped: false,
    })
  })
})

describe('day labels', () => {
  it('counts a day by calendar date, not by elapsed hours', () => {
    expect(dayDiff(at(0, 23, 30), at(1, 0, 30))).toBe(-1)
    expect(dayDiff(at(1, 0, 30), at(0, 23, 30))).toBe(1)
  })

  it('drops 今天 but keeps 明天, and falls back to a date further out', () => {
    expect(when(at(0, 9), NOW)).toBe('09:00')
    expect(when(at(1, 9), NOW)).toBe('明天 09:00')
    expect(when(at(2, 9), NOW)).toBe('后天 09:00')
    expect(when(at(6, 9), NOW)).toBe('9月27日 09:00')
  })

  it('parses a malformed time without producing Invalid Date', () => {
    expect(splitHHMM('nonsense')).toEqual([1, 0])
    expect(hhmm(new Date(2026, 8, 21, 7, 30))).toBe('07:30')
  })
})
