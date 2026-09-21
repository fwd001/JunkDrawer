<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEventListener } from '@vueuse/core'

const props = withDefaults(
  defineProps<{ min?: number; max?: number; step?: number; label?: string }>(),
  { min: 0, max: 100, step: 1, label: '' },
)

const value = defineModel<number>({ required: true })

const track = ref<HTMLElement | null>(null)
const dragging = ref(false)

const pct = computed(() => ((value.value - props.min) / (props.max - props.min)) * 100)

function clamp(n: number) {
  const stepped = Math.round(n / props.step) * props.step
  return Math.min(props.max, Math.max(props.min, stepped))
}

function valueAt(clientX: number) {
  const el = track.value
  if (!el) return value.value
  const rect = el.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  return clamp(props.min + ratio * (props.max - props.min))
}

// Pointer events cover mouse, touch and pen — Vant's slider only binds touch,
// which is why dragging did nothing on a desktop browser.
useEventListener(track, 'pointerdown', (e: PointerEvent) => {
  dragging.value = true
  if (e.currentTarget instanceof HTMLElement) e.currentTarget.setPointerCapture(e.pointerId)
  value.value = valueAt(e.clientX)
})

useEventListener(track, 'pointermove', (e: PointerEvent) => {
  // No button down means the pointer is only hovering — release, never drag.
  if (e.buttons === 0) dragging.value = false
  if (dragging.value) value.value = valueAt(e.clientX)
})

// Bound on the window: a release that happens off the element (or a lost
// pointercancel) must still end the drag, or hovering would keep moving it.
useEventListener(window, 'pointerup', () => (dragging.value = false))
useEventListener(window, 'pointercancel', () => (dragging.value = false))

const KEYS: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }

function onKey(e: KeyboardEvent) {
  if (e.key in KEYS) {
    e.preventDefault()
    value.value = clamp(value.value + KEYS[e.key]! * props.step * (e.shiftKey ? 10 : 1))
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault()
    value.value = e.key === 'Home' ? props.min : props.max
  }
}
</script>

<template>
  <div
    ref="track"
    class="rs"
    :class="{ 'rs-drag': dragging }"
    role="slider"
    tabindex="0"
    :aria-label="props.label || undefined"
    :aria-valuemin="props.min"
    :aria-valuemax="props.max"
    :aria-valuenow="value"
    @keydown="onKey"
  >
    <div class="rs-rail" />
    <div class="rs-fill" :style="{ width: `${pct}%` }" />
    <div class="rs-knob" :style="{ left: `${pct}%` }" />
  </div>
</template>

<style scoped>
.rs {
  position: relative;
  height: 34px;
  touch-action: none;
  cursor: pointer;
  outline: none;
}

.rs-rail,
.rs-fill {
  position: absolute;
  top: 50%;
  left: 0;
  height: 6px;
  margin-top: -3px;
  border-radius: 999px;
}

.rs-rail {
  right: 0;
  background: var(--jd-line);
}

.rs-fill {
  background: var(--jd-accent);
  transition: width 120ms ease-out;
}

.rs-knob {
  position: absolute;
  top: 50%;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  border-radius: 50%;
  background: var(--jd-surface);
  box-shadow:
    0 1px 3px var(--jd-shadow-2),
    0 0 0 0.5px var(--jd-line);
  transition:
    transform 120ms ease-out,
    background-color 120ms ease-out;
}

.rs-drag .rs-fill {
  transition: none;
}

.rs-drag .rs-knob {
  transform: scale(1.14);
  background-color: var(--jd-accent);
  transition: none;
}

.rs:focus-visible .rs-knob {
  box-shadow:
    0 1px 3px var(--jd-shadow-2),
    0 0 0 3px var(--jd-tint);
}
</style>
