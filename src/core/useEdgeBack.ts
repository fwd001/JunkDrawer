import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'
import { nameNextTransition } from './nav'

const EDGE = 26
const THRESHOLD = 0.32
const FLING = 0.55 // px/ms

/**
 * Left-edge drag back — the one gesture mobile users expect from a native app.
 * On release the page is dismissed with Web Animations so the router transition
 * only has to bring the previous screen in.
 */
export function useEdgeBack(el: Ref<HTMLElement | null>, goBack: () => void) {
  let startX = 0
  let startY = 0
  let lastX = 0
  let lastT = 0
  let dx = 0
  let velocity = 0
  let armed = false
  let dragging = false
  let settled = false

  function shift(x: number) {
    if (el.value) el.value.style.transform = x > 0 ? `translateX(${x}px)` : ''
  }

  function release() {
    if (el.value) {
      el.value.style.transition = ''
      el.value.style.transform = ''
    }
    armed = false
    dragging = false
    dx = 0
  }

  useEventListener(el, 'touchstart', (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]!
    armed = t.clientX <= EDGE
    dragging = false
    settled = false
    startX = t.clientX
    startY = t.clientY
    lastX = t.clientX
    lastT = e.timeStamp
    dx = 0
    velocity = 0
  })

  useEventListener(el, 'touchmove', (e: TouchEvent) => {
    if (!armed || settled) return
    const t = e.touches[0]!
    const x = t.clientX - startX
    const y = t.clientY - startY
    if (!dragging) {
      if (Math.abs(y) > x * 1.3) {
        if (x > 10 || y > 14) armed = false
        return
      }
      if (x < 8) return
      dragging = true
      el.value!.style.transition = 'none'
    }
    dx = Math.max(0, x)
    const dt = e.timeStamp - lastT
    if (dt > 0) velocity = (t.clientX - lastX) / dt
    lastX = t.clientX
    lastT = e.timeStamp
    shift(dx)
    if (e.cancelable) e.preventDefault()
  })

  useEventListener(el, 'touchend', (e: TouchEvent) => {
    if (!dragging || settled) return
    settled = true
    const width = el.value?.clientWidth ?? window.innerWidth
    const node = el.value!
    const commit = dx > width * THRESHOLD || velocity > FLING
    e.preventDefault?.()
    if (!commit) {
      node.style.transition = 'transform 200ms cubic-bezier(0.25, 0.9, 0.3, 1)'
      shift(0)
      window.setTimeout(() => {
        if (el.value === node) node.style.transition = ''
        dragging = false
        armed = false
      }, 210)
      return
    }
    nameNextTransition('dismiss')
    node
      .animate(
        [{ transform: `translateX(${dx}px)`, opacity: 1 }, { transform: `translateX(${width}px)`, opacity: 0.85 }],
        { duration: Math.max(130, ((width - dx) / width) * 260), easing: 'cubic-bezier(0.3, 0.8, 0.4, 1)' },
      )
      .finished.then(() => {
        release()
        goBack()
      })
  })

  useEventListener(el, 'touchcancel', () => {
    if (!settled) release()
  })
}
