<script setup lang="ts">
import { computed } from 'vue'
import { clock } from '@/core/format'

const props = defineProps<{
  nowMs: number
  finishMs: number
  departMs: number
  bufferMin: number
  overflow: boolean
}>()

const span = computed(() => Math.max(1, props.departMs - props.nowMs))
const fill = computed(() =>
  props.overflow ? 100 : Math.min(100, Math.max(0, ((props.finishMs - props.nowMs) / span.value) * 100)),
)
const deadlinePct = computed(() =>
  Math.min(100, Math.max(0, ((props.departMs - props.bufferMin * 60_000 - props.nowMs) / span.value) * 100)),
)
</script>

<template>
  <div class="mt-14px">
    <div class="relative h-9px rounded-full bg-raised">
      <div
        class="absolute inset-y-0 left-0 rounded-full transition-width duration-300"
        :style="{
          width: `${fill}%`,
          background: props.overflow ? 'var(--jd-danger)' : 'var(--jd-accent)',
        }"
      />
      <div
        class="absolute -top-4px h-17px w-2px rounded-full"
        :style="{ left: `${deadlinePct}%`, background: 'var(--jd-warn)' }"
        title="必须在此前充满"
      />
    </div>
    <div class="mt-7px flex justify-between text-11px tabular-nums text-ink3">
      <span>现在 {{ clock(props.nowMs) }}</span>
      <span v-if="!props.overflow" class="text-accent">{{ clock(props.finishMs) }} 满</span>
      <span>出发 {{ clock(props.departMs) }}</span>
    </div>
  </div>
</template>
