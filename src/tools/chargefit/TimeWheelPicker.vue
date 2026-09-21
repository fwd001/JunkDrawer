<script setup lang="ts">
import { computed } from 'vue'
import type { PickerOption } from 'vant'
import { clock, duration } from '@/core/format'
import { startOfDay } from './depart'

const open = defineModel<boolean>('open', { required: true })
const at = defineModel<number>('at', { required: true })

const props = defineProps<{
  title: string
  days: { label: string; ts: number }[]
  nowMs: number
}>()

const selected = computed(() => new Date(at.value))
const timeModel = computed(() => [
  String(selected.value.getHours()).padStart(2, '0'),
  String(selected.value.getMinutes()).padStart(2, '0'),
])
const lead = computed(() => Math.max(0, (at.value - props.nowMs) / 60_000))

function isDay(day: { ts: number }) {
  return startOfDay(at.value) === day.ts
}

function pickDay(ts: number) {
  const d = new Date(ts)
  d.setHours(selected.value.getHours(), selected.value.getMinutes(), 0, 0)
  at.value = d.getTime()
}

function pickTime(values: string[]) {
  const d = new Date(at.value)
  d.setHours(Number(values[0]) || 0, Number(values[1]) || 0, 0, 0)
  at.value = d.getTime()
}

function format(type: string, option: PickerOption) {
  if (type === 'hour') option.text = `${option.text} 时`
  if (type === 'minute') option.text = `${option.text} 分`
  return option
}
</script>

<template>
  <van-popup v-model:show="open" position="bottom" round safe-area-inset-bottom>
    <div class="pb-6px">
      <p class="px-16px pt-16px text-16px font-700">{{ props.title }}</p>
      <p class="muted px-16px pt-2px">{{ clock(at) }} · 还有 {{ duration(lead) }}</p>

      <div class="mb-4px mt-14px flex flex-wrap justify-center gap-8px px-16px">
        <button
          v-for="day in props.days"
          :key="day.label"
          type="button"
          class="chip"
          :class="isDay(day) ? 'chip-on' : 'chip-idle'"
          @click="pickDay(day.ts)"
        >
          {{ day.label }}
        </button>
      </div>

      <van-time-picker
        :model-value="timeModel"
        :show-toolbar="false"
        :formatter="format"
        :visible-option-num="5"
        @update:model-value="pickTime"
      />

      <div class="p-16px">
        <button class="chip-on h-46px w-full rounded-13px text-15px" @click="open = false">好了</button>
      </div>
    </div>
  </van-popup>
</template>
