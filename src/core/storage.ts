import { useStorage } from '@vueuse/core'
import type { Ref } from 'vue'
import type { UseStorageOptions } from '@vueuse/core'

function toolKey(toolId: string, key: string) {
  return `jd:tool:${toolId}:${key}`
}

/** State lives per tool, so every tool remembers its own last usage for free. */
export function toolStorage<T>(
  toolId: string,
  key: string,
  fallback: T,
  options?: UseStorageOptions<T>,
): Ref<T> {
  return useStorage(toolKey(toolId, key), fallback, undefined, options)
}

export function resetAllStorage() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('jd:')) localStorage.removeItem(key)
  }
}
