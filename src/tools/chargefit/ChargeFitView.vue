<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import OptionChips from '@/components/OptionChips.vue'
import ToolPage from '@/components/ToolPage.vue'
import { clock, dayLabel, duration } from '@/core/format'
import { dayDiff, hhmm, quickDeparts } from './depart'
import { CAR_PRESETS, SUPPLY_PRESETS } from './presets'
import ChargeTimeline from './ChargeTimeline.vue'
import DepartPicker from './DepartPicker.vue'
import { BUFFER_CHOICES, STEP_CHOICES, TARGET_CHOICES, useChargeFit } from './state'

const {
  nowMs,
  currentSoc,
  targetSoc,
  departHHMM,
  departDay,
  departDate,
  departMs,
  remainingMin,
  bufferMin,
  capacityKwh,
  maxCurrentA,
  stepA,
  efficiencyPct,
  car,
  carId,
  supply,
  supplyId,
  isCustomCar,
  plan,
  restoreHint,
  commitSnapshot,
  restoreSnapshot,
  setDepart,
  pickCar,
  pickSupply,
} = useChargeFit()

onBeforeUnmount(commitSnapshot)

const pickerOpen = ref(false)
const advanced = ref<string[]>([])

/** The picker works on an absolute date; storage keeps the time-of-day habit. */
const departDraft = computed({
  get: () => departMs.value,
  set: (value: number) => setDepart(new Date(value)),
})

const targetOptions = TARGET_CHOICES.map((v) => ({ value: v, label: v === 100 ? '充满' : `${v}%` }))
const bufferOptions = BUFFER_CHOICES.map((v) => ({ value: v, label: `${v} 分` }))
const stepOptions = STEP_CHOICES.map((v) => ({ value: v, label: `${v} A 一档` }))
const carOptions = CAR_PRESETS.map((c) => ({ value: c.id, label: c.name }))
const supplyOptions = SUPPLY_PRESETS.map((s) => ({ value: s.id, label: s.name }))
const quick = computed(() => quickDeparts(nowMs.value))

const deadlineMs = computed(() => departMs.value - bufferMin.value * 60_000)

const badge = computed(() => {
  if (plan.value.status === 'ready') return { text: '来得及', tone: 'ok' as const }
  if (plan.value.status === 'insufficient') return { text: '电流不够', tone: 'bad' as const }
  if (plan.value.status === 'idle') return { text: '不用充', tone: 'idle' as const }
  return { text: '时间已过', tone: 'bad' as const }
})

const headline = computed(() => {
  if (plan.value.status === 'ready' || plan.value.status === 'insufficient') return plan.value.currentA
  return '—'
})

const meta = computed(() => {
  const p = plan.value
  if (p.status === 'ready') return `${p.powerKw.toFixed(1)} kW · 充 ${duration(p.minutes)}`
  if (p.status === 'insufficient') return `${p.powerKw.toFixed(1)} kW · 已是上限`
  return supply.value.name
})

const summary = computed(() => {
  const p = plan.value
  if (p.status === 'ready')
    return `${clock(p.finishMs)} 充到 ${targetSoc.value}%，比出发早 ${Math.round(p.marginMin)} 分钟。`
  if (p.status === 'insufficient')
    return `最大 ${p.currentA}A 出发时也只能到 ${Math.round(p.arrivalSoc)}%，充满要到 ${clock(p.finishMs)}。要么提早出发，要么换更大的电流上限。`
  if (p.status === 'idle') return '当前电量已经到了目标，不用充电。'
  return '出发时间已经过了，把时间往后调。'
})

function quickOn(date: Date) {
  return hhmm(date) === departHHMM.value && dayDiff(date.getTime(), nowMs.value) === departDay.value
}

const anyQuickOn = computed(() => quick.value.some((q) => quickOn(q.date)))
</script>

<template>
  <ToolPage title="充电管家">
    <div class="flex flex-col gap-12px">
      <section class="card p-16px">
        <div class="flex items-start justify-between gap-12px">
          <div>
            <p class="label">推荐电流</p>
            <p class="num flex items-baseline gap-4px">
              {{ headline }}
              <span class="text-18px font-700 text-ink2">A</span>
            </p>
          </div>
          <div class="pt-3px text-right">
            <span class="pill" :class="`pill-${badge.tone}`">{{ badge.text }}</span>
            <p class="muted mt-9px tabular-nums">{{ meta }}</p>
          </div>
        </div>

        <ChargeTimeline
          :now-ms="nowMs"
          :finish-ms="plan.status === 'ready' ? plan.finishMs : departMs"
          :depart-ms="departMs"
          :buffer-min="bufferMin"
          :overflow="plan.status === 'insufficient'"
        />

        <p class="mt-12px text-13px leading-19px text-ink2">{{ summary }}</p>

        <button
          v-if="restoreHint"
          type="button"
          class="tap mt-12px flex w-full items-center gap-8px rounded-12px bg-raised px-12px py-9px text-left text-12px text-ink2 border-none"
          @click="restoreSnapshot()"
        >
          <span class="text-[15px] text-ink3 i-lucide-history" />
          <span class="flex-1">
            上次：{{ restoreHint.a }}A，{{ dayLabel(restoreHint.depart) }} {{ clock(restoreHint.depart) }} 出发
          </span>
          <span class="font-700 text-accent">还原</span>
        </button>
      </section>

      <section class="card px-16px py-13px">
        <div class="flex items-baseline justify-between">
          <p class="label">当前电量</p>
          <p class="num-sm">{{ currentSoc }}<span class="text-13px font-600 text-ink3">%</span></p>
        </div>
        <van-slider v-model="currentSoc" :min="5" :max="100" :step="1" bar-height="6px" class="mt-16px mb-6px" />
      </section>

      <section class="card p-16px">
        <div class="flex items-baseline justify-between">
          <p class="label">出发时间</p>
          <p class="text-14px font-700 tabular-nums">
            {{ dayLabel(departDate) }} {{ clock(departMs) }}
            <span class="muted font-500">· 还有 {{ duration(remainingMin) }}</span>
          </p>
        </div>
        <div class="mt-11px flex flex-wrap gap-8px">
          <button
            v-for="q in quick"
            :key="q.label"
            type="button"
            class="chip"
            :class="quickOn(q.date) ? 'chip-on' : 'chip-idle'"
            @click="setDepart(q.date)"
          >
            {{ q.label }}
          </button>
          <button type="button" class="chip" :class="anyQuickOn ? 'chip-idle' : 'chip-on'" @click="pickerOpen = true">
            <span class="text-[14px]" :class="anyQuickOn ? 'i-lucide-calendar' : 'i-lucide-calendar-check'" />
            自定义
          </button>
        </div>

        <div class="mt-15px border-t-1px border-solid border-line pt-13px">
          <div class="flex items-baseline justify-between">
            <p class="label">要提前充满</p>
            <p class="muted tabular-nums">{{ clock(deadlineMs) }} 前</p>
          </div>
          <OptionChips v-model="bufferMin" :options="bufferOptions" class="mt-10px" />
        </div>
      </section>

      <section class="card p-16px">
        <p class="label mb-11px">充到</p>
        <OptionChips v-model="targetSoc" :options="targetOptions" />
      </section>

      <van-collapse v-model="advanced" class="card overflow-hidden">
        <van-collapse-item title="车辆与电流" name="car">
          <div class="flex flex-col gap-16px pt-2px">
            <div>
              <p class="label mb-9px">车型</p>
              <OptionChips :model-value="carId" :options="carOptions" @update:model-value="pickCar" />
            </div>

            <div class="field">
              <p class="label">
                电池容量
                <span v-if="isCustomCar" class="muted ml-6px">自定义</span>
                <span v-else class="muted ml-6px">{{ car.hint }}</span>
              </p>
              <van-stepper v-model="capacityKwh" :min="20" :max="140" :step="1" theme="round" button-size="26" />
            </div>

            <div>
              <p class="label mb-9px">供电</p>
              <OptionChips :model-value="supplyId" :options="supplyOptions" @update:model-value="pickSupply" />
            </div>

            <div class="field">
              <p class="label">最大电流</p>
              <van-stepper v-model="maxCurrentA" :min="6" :max="64" :step="stepA" theme="round" button-size="26" />
            </div>

            <div>
              <p class="label mb-9px">电流档位</p>
              <OptionChips v-model="stepA" :options="stepOptions" />
            </div>

            <div>
              <div class="flex items-baseline justify-between">
                <p class="label">充电效率</p>
                <p class="muted tabular-nums">{{ efficiencyPct }}%</p>
              </div>
              <van-slider
                v-model="efficiencyPct"
                :min="70"
                :max="100"
                :step="1"
                bar-height="6px"
                class="mt-16px mb-6px"
              />
              <p class="muted mt-2px">进电池的电量 ÷ 电表走的电量，家充桩一般 88–95%。</p>
            </div>
          </div>
        </van-collapse-item>
      </van-collapse>

      <p class="muted mt-2px text-center">给的是「刚好来得及的最小电流」，不是最快速度。</p>
    </div>

    <DepartPicker v-model:open="pickerOpen" v-model:at="departDraft" :now-ms="nowMs" />
  </ToolPage>
</template>
