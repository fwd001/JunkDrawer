export const DAY_MS = 86_400_000
export const MIN_MS = 60_000

export function hhmm(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function splitHHMM(value: string): [number, number] {
  const [h, m] = value.split(':')
  const hh = Number(h)
  const mm = Number(m)
  return [Number.isFinite(hh) ? hh : 1, Number.isFinite(mm) ? mm : 0]
}

export function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Calendar-day distance, so "明天" survives DST and time-zone travel. */
export function dayDiff(toTs: number, fromTs: number) {
  return Math.round((startOfDay(toTs) - startOfDay(fromTs)) / DAY_MS)
}

export function minutesUntil(toTs: number, fromTs: number) {
  return (toTs - fromTs) / MIN_MS
}

export function atTime(nowMs: number, daysOut: number, hour: number, minute = 0) {
  const d = new Date(nowMs)
  d.setDate(d.getDate() + daysOut)
  d.setHours(hour, minute, 0, 0)
  return d
}

/**
 * The saved habit is "which day, what time of day" — resolve it to an absolute
 * moment, skipping forward if that moment has already gone by.
 */
export function resolveDepart(time: string, daysOut: number, nowMs: number) {
  const [hh, mm] = splitHHMM(time)
  const d = atTime(nowMs, daysOut, hh, mm)
  if (d.getTime() <= nowMs) d.setDate(d.getDate() + 1)
  return d
}

export function dayOptions(nowMs: number) {
  return [
    { offset: 0, label: '今天', ts: startOfDay(nowMs) },
    { offset: 1, label: '明天', ts: startOfDay(nowMs) + DAY_MS },
    { offset: 2, label: '后天', ts: startOfDay(nowMs) + 2 * DAY_MS },
  ]
}

export interface StartInput {
  mode: 'now' | 'sched'
  time: string
  /** 0 = the departure day itself, -1 = the night before. */
  shift: number
  departMs: number
  nowMs: number
}

/**
 * A scheduled start is anchored to the *departure* day ("出发当天凌晨 1 点"),
 * so it stays correct as the departure rolls forward. A start that has already
 * passed collapses to "begin now".
 */
export function resolveStart(i: StartInput) {
  if (i.mode === 'now') return { ms: i.nowMs, clamped: false }
  const [hh, mm] = splitHHMM(i.time)
  const d = new Date(i.departMs)
  d.setDate(d.getDate() + i.shift)
  d.setHours(hh, mm, 0, 0)
  return d.getTime() < i.nowMs ? { ms: i.nowMs, clamped: true } : { ms: d.getTime(), clamped: false }
}
