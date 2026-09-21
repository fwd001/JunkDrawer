import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'

export const transitionName = ref('fade')

let override: string | null = null

/** Let a gesture (edge-swipe back) name the transition it already started animating. */
export function nameNextTransition(name: string) {
  override = name
}

export function depthOf(route: RouteLocationNormalized) {
  return (route.meta.depth as number | undefined) ?? 0
}

export function resolveTransition(to: RouteLocationNormalized, from: RouteLocationNormalized) {
  if (override) {
    transitionName.value = override
    override = null
    return
  }
  if (!from.name) {
    transitionName.value = 'fade'
    return
  }
  transitionName.value = depthOf(to) >= depthOf(from) ? 'push' : 'pop'
}
