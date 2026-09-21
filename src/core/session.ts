import { useStorage } from '@vueuse/core'
import { computed } from 'vue'
import { tools } from './tools'

const USAGE_KEY = 'jd:usage'
const LAST_USED_KEY = 'jd:last-used'

const usage = useStorage<Record<string, number>>(USAGE_KEY, {})
const lastUsedAt = useStorage<Record<string, number>>(LAST_USED_KEY, {})

export function markToolUsed(toolId: string) {
  usage.value = { ...usage.value, [toolId]: (usage.value[toolId] ?? 0) + 1 }
  lastUsedAt.value = { ...lastUsedAt.value, [toolId]: Date.now() }
}

export function useCount(toolId: string) {
  return usage.value[toolId] ?? 0
}

export function lastUsed(toolId: string) {
  return lastUsedAt.value[toolId] ?? 0
}

/** Most-used first, then most-recent, so the tool you actually want is always top-left. */
export const rankedTools = computed(() =>
  [...tools].sort(
    (a, b) =>
      useCount(b.id) - useCount(a.id) || (lastUsedAt.value[b.id] ?? 0) - (lastUsedAt.value[a.id] ?? 0),
  ),
)

export const lastUsedTool = computed(() => {
  const ranked = rankedTools.value
  const top = ranked.find((t) => useCount(t.id) > 0)
  return top ? { tool: top, at: lastUsed(top.id), count: useCount(top.id) } : null
})
