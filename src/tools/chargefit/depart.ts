export const DAY_MS = 86_400_000
export const MIN_MS = 60_000

export function hhmm(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function splitHHMM(value: string): [number, number] {
  const [h, m] = value.split(':')
  const hh = Number(h)
  const mm = Number(m)
  return [Number.isFinite(hh) ? hh : 7, Number.isFinite(mm) ? mm : 30]
}

/** Local midnight of the day containing `ts`. */
export function startOfDay(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Calendar-day distance, so "明天" survives DST and travel across time zones. */
export function dayDiff(toTs: number, fromTs: number) {
  return Math.round((startOfDay(toTs) - startOfDay(fromTs)) / DAY_MS)
}

export function minutesUntil(toTs: number, fromTs: number) {
  return (toTs - fromTs) / MIN_MS
}

/**
 * Turn the remembered habit (time of day + how many days out) into an absolute
 * moment, skipping forward if that moment has already gone by today.
 */
export function resolveDepart(time: string, daysOut: number, nowMs: number) {
  const [hh, mm] = splitHHMM(time)
  const d = new Date(nowMs)
  d.setHours(hh, mm, 0, 0)
  d.setDate(d.getDate() + Math.max(0, Math.round(daysOut)))
  if (d.getTime() <= nowMs) d.setDate(d.getDate() + 1)
  return d
}

export function atTime(nowMs: number, daysOut: number, hour: number, minute = 0) {
  const d = new Date(nowMs)
  d.setDate(d.getDate() + daysOut)
  d.setHours(hour, minute, 0, 0)
  return d
}

export interface QuickDepart {
  label: string
  date: Date
}

/** The three choices that cover almost every "when do I leave" question. */
export function quickDeparts(nowMs: number): QuickDepart[] {
  return [
    { label: '2 小时后', date: new Date(nowMs + 120 * MIN_MS) },
    { label: '今晚 22:00', date: atTime(nowMs, minutesUntil(atTime(nowMs, 0, 22).getTime(), nowMs) > 0 ? 0 : 1, 22) },
    { label: '明早 07:30', date: atTime(nowMs, 1, 7, 30) },
  ]
}
