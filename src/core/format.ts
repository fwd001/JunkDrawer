const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

export function relTime(ts: number, now = Date.now()) {
  if (!ts) return ''
  const d = now - ts
  if (d < MIN) return '刚刚'
  if (d < HOUR) return `${Math.floor(d / MIN)} 分钟前`
  if (d < DAY) return `${Math.floor(d / HOUR)} 小时前`
  const days = Math.floor(d / DAY)
  return days === 1 ? '昨天' : `${days} 天前`
}

export function clock(date: Date | number) {
  const d = typeof date === 'number' ? new Date(date) : date
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function dayLabel(date: Date | number, now = new Date()) {
  const d = typeof date === 'number' ? new Date(date) : date
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((target - startOfToday) / DAY)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff === -1) return '昨天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function duration(min: number) {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} 分钟`
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`
}
