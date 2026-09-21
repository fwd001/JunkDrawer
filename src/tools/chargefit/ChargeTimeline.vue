<script setup lang="ts">
import { computed } from 'vue'
import { clock } from '@/core/format'

const props = defineProps<{
  startMs: number
  finishMs: number
  departMs: number
  deadlineMs: number
  overflow: boolean
}>()

const span = computed(() => Math.max(1, props.departMs - props.startMs))
const pct = (ts: number) => Math.min(100, Math.max(0, ((ts - props.startMs) / span.value) * 100))
const chargePct = computed(() => (props.overflow ? 100 : pct(props.finishMs)))
const deadlinePct = computed(() => pct(props.deadlineMs))
</script>

<template>
  <div class="mt-14px">
    <div class="relative h-9px overflow-hidden rounded-full bg-raised">
      <div
        class="absolute inset-y-0 left-0"
        :style="{
          width: `${chargePct}%`,
          background: props.overflow ? 'var(--jd-danger)' : 'var(--jd-accent)',
        }"
      />
      <div v-if="!props.overflow" class="tl-sit absolute inset-y-0 right-0" :style="{ left: `${chargePct}%` }" />
      <div
        class="absolute -top-4px h-17px w-2px rounded-full"
        :style="{ left: `${deadlinePct}%`, background: 'var(--jd-warn)' }
      "
        title="要求在此前充满"
      />
    </div>
    <div class="mt-7px flex justify-between text-11px tabular-nums text-ink3">
      <span>开始 {{ clock(props.startMs) }}</span>
      <span class="text-accent">{{ clock(props.finishMs) }} 满</span>
      <span>出发 {{ clock(props.departMs) }}</span>
    </div>
  </div>
</template>

<style scoped>
/* The stretch where the car is already full and just waiting. */
.tl-sit {
  background: repeating-linear-gradient(
    -45deg,
    color-mix(in srgb, var(--jd-warn) 34%, transparent) 0 3px,
    transparent 3px 7px
  );
}
</style>
