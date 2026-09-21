<script setup lang="ts">
import { computed } from 'vue'
import type { PickerOption } from 'vant'
import { clock, duration } from '@/core/format'
import { dayDiff } from './depart'

const open = defineModel<boolean>('open', { required: true })
const at = defineModel<number>('at', { required: true })
const props = defineProps<{ nowMs: number }>()

const DAYS = [
  { offset: 0, label: '今天' },
  { offset: 1, label: '明天' },
  { offset: 2, label: '后天' },
]

const selected = computed(() => new Date(at.value))
const offset = computed(() => dayDiff(at.value, props.nowMs))
const timeModel = computed(() => [
  String(selected.value.getHours()).padStart(2, '0'),
  String(selected.value.getMinutes()).padStart(2, '0'),
])
const lead = computed(() => Math.max(0, (at.value - props.nowMs) / 60_000))

function pickDay(day: number) {
  const d = new Date(props.nowMs)
  d.setDate(d.getDate() + day)
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
      <p class="px-16px pt-16px text-16px font-700">几点出发</p>
      <p class="muted px-16px pt-2px">{{ clock(at) }} · 还有 {{ duration(lead) }}</p>

      <div class="mb-4px mt-14px flex justify-center gap-8px px-16px">
        <button
          v-for="day in DAYS"
          :key="day.offset"
          type="button"
          class="chip"
          :class="offset === day.offset ? 'chip-on' : 'chip-idle'"
          @click="pickDay(day.offset)"
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
