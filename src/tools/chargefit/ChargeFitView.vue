<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import OptionChips from '@/components/OptionChips.vue'
import RangeSlider from '@/components/RangeSlider.vue'
import ToolPage from '@/components/ToolPage.vue'
import { dayLabel, duration, when } from '@/core/format'
import { DAY_MS, dayDiff, dayOptions, hhmm, startOfDay } from './depart'
import {
  BUFFER_CHOICES,
  DEPART_HOURS,
  SIT_WARN_MIN,
  STEP_CHOICES,
  TARGET_CHOICES,
  useChargeFit,
} from './state'
import { CAR_PRESETS, CHARGER_PRESETS, CHEMISTRIES } from './presets'
import ChargeTimeline from './ChargeTimeline.vue'
import TimeWheelPicker from './TimeWheelPicker.vue'

const {
  nowMs,
  currentSoc,
  chemistry,
  carId,
  capacityKwh,
  chargerId,
  maxCurrentA,
  stepA,
  targetSoc,
  departDate,
  departMs,
  remainingMin,
  startMode,
  startHHMM,
  startShift,
  startMs,
  startClamped,
  bufferMin,
  car,
  charger,
  chem,
  isCustomCapacity,
  isCustomCurrent,
  plan,
  suggestedStartMs,
  lastPlan,
  restoreHint,
  commitSnapshot,
  restoreSnapshot,
  setDepart,
  setStart,
  startNow,
  pickCar,
  pickChemistry,
  pickCharger,
} = useChargeFit()

onBeforeUnmount(commitSnapshot)

const advanced = ref<string[]>([])
const departPicker = ref(false)
const startPicker = ref(false)

const targetOptions = TARGET_CHOICES.map((v) => ({ value: v, label: v === 100 ? '充满' : `${v}%` }))
const bufferOptions = BUFFER_CHOICES.map((v) => ({ value: v, label: v === 0 ? '不提前' : `${v} 分` }))
const stepOptions = STEP_CHOICES.map((v) => ({ value: v, label: `${v} A 一档` }))
const carOptions = CAR_PRESETS.map((c) => ({ value: c.id, label: c.name }))
const chargerOptions = CHARGER_PRESETS.map((c) => ({ value: c.id, label: c.name }))
const chemOptions = CHEMISTRIES.map((c) => ({ value: c.id, label: c.name }))
const hourOptions = DEPART_HOURS.map((h) => ({ value: h, label: `${String(h).padStart(2, '0')}:00` }))

const departDays = computed(() => dayOptions(nowMs.value))
const departDayOn = computed(() => dayDiff(departMs.value, nowMs.value))
const deadlineMs = computed(() => departMs.value - bufferMin.value * 60_000)

/** Keep the time of day, move it onto another calendar day. */
function onDay(dayTs: number, keepMs: number) {
  const d = new Date(dayTs)
  const src = new Date(keepMs)
  d.setHours(src.getHours(), src.getMinutes(), 0, 0)
  return d
}

function atDepartHour(hour: number) {
  const d = new Date(departMs.value)
  d.setHours(hour, 0, 0, 0)
  return d
}

const departDraft = computed({
  get: () => departMs.value,
  set: (v: number) => setDepart(new Date(v)),
})
const startDraft = computed({
  get: () => (startMode.value === 'now' ? nowMs.value : startMs.value),
  set: (v: number) => setStart(new Date(v)),
})

const finishMs = computed(() =>
  plan.value.status === 'ready' || plan.value.status === 'insufficient' ? plan.value.finishMs : departMs.value,
)

const badge = computed(() => {
  const p = plan.value
  if (p.status === 'ready')
    return p.sitMin > SIT_WARN_MIN
      ? { text: '会提前充满', tone: 'warn' as const }
      : { text: '来得及', tone: 'ok' as const }
  if (p.status === 'insufficient') return { text: '电流不够', tone: 'bad' as const }
  if (p.status === 'idle') return { text: '不用充', tone: 'idle' as const }
  return { text: '来不及', tone: 'bad' as const }
})

const headline = computed(() => {
  const p = plan.value
  return p.status === 'ready' || p.status === 'insufficient' ? p.currentA : '—'
})

const meta = computed(() => {
  const p = plan.value
  if (p.status === 'ready') return `${p.powerKw.toFixed(1)} kW · 充 ${duration(p.minutes)}`
  if (p.status === 'insufficient') return `${p.powerKw.toFixed(1)} kW · 已是上限`
  return `${charger.value.name} · ${charger.value.hint}`
})

const summary = computed(() => {
  const p = plan.value
  if (p.status === 'ready')
    return `${when(p.finishMs, nowMs.value)} 充到 ${targetSoc.value}%，比出发早 ${duration(p.sitMin)}`
  if (p.status === 'insufficient') {
    if (p.late) return `现在开始最多充到 ${Math.round(p.arrivalSoc)}%，来不及`
    return `${p.currentA}A 要 ${duration(p.minutes)}，最晚 ${when(p.neededStartMs, nowMs.value)} 开始`
  }
  if (p.status === 'idle') return `已经到 ${targetSoc.value}% 了，这次不用充`
  if (p.status === 'too-late') return `开始时间晚于 ${when(p.deadlineMs, nowMs.value)}，往前调`
  return '出发时间已经过了，往后调一天'
})

const suggestion = computed(() => {
  const ms = suggestedStartMs.value
  if (!ms || Math.abs(ms - startMs.value) < 10 * 60_000) return null
  const later = ms > startMs.value
  return {
    ms,
    text: later ? '不想满电久放，可以晚点开始' : '想赶上的话得提前开始',
    label: `${when(ms, nowMs.value)} 开始`,
  }
})

const startDays = computed(() => [
  { label: '出发前夜', ts: startOfDay(departMs.value) - DAY_MS },
  { label: '出发当天', ts: startOfDay(departMs.value) },
])

function isDepartHour(hour: number) {
  return hhmm(departDate.value) === `${String(hour).padStart(2, '0')}:00`
}

const startChipOn = computed(() => {
  if (startMode.value === 'now' || startClamped.value) return 'now'
  if (startShift.value === 0 && startHHMM.value === '01:00') return 'dawn'
  if (startShift.value === -1 && startHHMM.value === '22:00') return 'eave'
  return 'custom'
})

function startChipLabel(kind: 'dawn' | 'eave') {
  const d = new Date(departMs.value)
  d.setDate(d.getDate() + (kind === 'dawn' ? 0 : -1))
  return `${dayLabel(d, new Date(nowMs.value))} ${kind === 'dawn' ? '01:00' : '22:00'}`
}

function pickStartChip(kind: 'now' | 'dawn' | 'eave') {
  if (kind === 'now') return startNow()
  const d = new Date(departMs.value)
  d.setDate(d.getDate() + (kind === 'dawn' ? 0 : -1))
  d.setHours(kind === 'dawn' ? 1 : 22, 0, 0, 0)
  setStart(d)
}
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
            <p class="muted mt-9px whitespace-nowrap tabular-nums">{{ meta }}</p>
          </div>
        </div>

        <ChargeTimeline
          :start-ms="startMs"
          :finish-ms="finishMs"
          :depart-ms="departMs"
          :deadline-ms="deadlineMs"
          :now-ms="nowMs"
          :overflow="plan.status === 'insufficient'"
        />

        <p class="mt-12px truncate text-13px leading-19px text-ink2 whitespace-nowrap">{{ summary }}</p>

        <div class="mt-10px min-h-32px">
          <button
            v-if="suggestion"
            type="button"
            class="tap flex w-full items-center gap-8px rounded-12px border-none bg-transparent px-2px py-6px text-left"
            @click="setStart(new Date(suggestion.ms))"
          >
            <span class="text-[16px] text-warn i-lucide-clock" />
            <span class="flex-1 min-w-0 truncate text-13px text-ink2 whitespace-nowrap">{{ suggestion.text }}</span>
            <span class="text-13px font-700 text-accent">{{ suggestion.label }}</span>
          </button>
        </div>

        <div v-if="lastPlan" class="mt-8px flex h-20px items-center gap-8px px-2px">
          <span class="text-[15px] text-ink3 i-lucide-history" />
          <span class="flex-1 min-w-0 truncate text-12px text-ink3">
            上次：{{ lastPlan.a }}A，{{ when(lastPlan.start, nowMs) }} 开始，{{ when(lastPlan.depart, nowMs) }} 出发
          </span>
          <button
            v-if="restoreHint"
            type="button"
            class="tap shrink-0 border-none bg-transparent p-0 text-13px font-700 text-accent"
            @click="restoreSnapshot()"
          >
            还原
          </button>
        </div>
      </section>

      <section class="card px-16px py-13px">
        <div class="flex items-baseline justify-between">
          <p class="label">当前电量</p>
          <p class="num-sm">{{ currentSoc }}<span class="text-13px font-600 text-ink3">%</span></p>
        </div>
        <RangeSlider v-model="currentSoc" :min="1" :max="100" :step="1" label="当前电量" class="mt-10px" />
        <p class="muted mt-2px">拖到插枪时的表显电量，键盘方向键可以 1% 微调。</p>

        <div class="mt-14px border-t-1px border-solid border-line pt-13px">
          <p class="label mb-9px">电池类型</p>
          <OptionChips :model-value="chemistry" :options="chemOptions" @update:model-value="pickChemistry" />
          <div class="mt-13px">
            <p class="label mb-9px">充到</p>
            <OptionChips v-model="targetSoc" :options="targetOptions" />
          </div>
          <p class="muted mt-11px">{{ chem.advice }}</p>
        </div>
      </section>

      <section class="card p-16px">
        <div class="flex items-baseline justify-between">
          <p class="label">出发时间</p>
          <p class="text-14px font-700 tabular-nums">
            {{ when(departMs, nowMs) }}
            <span class="muted font-500">· 还有 {{ duration(remainingMin) }}</span>
          </p>
        </div>

        <div class="mt-11px flex flex-wrap gap-8px">
          <button
            v-for="day in departDays"
            :key="day.label"
            type="button"
            class="chip"
            :class="departDayOn === day.offset ? 'chip-on' : 'chip-idle'"
            @click="setDepart(onDay(day.ts, departMs))"
          >
            {{ day.label }}
          </button>
        </div>

        <div class="mt-8px flex flex-wrap gap-8px">
          <button
            v-for="h in hourOptions"
            :key="h.value"
            type="button"
            class="chip"
            :class="isDepartHour(h.value) ? 'chip-on' : 'chip-idle'"
            @click="setDepart(atDepartHour(h.value))"
          >
            {{ h.label }}
          </button>
          <button
            type="button"
            class="chip"
            :class="hourOptions.some((h) => isDepartHour(h.value)) ? 'chip-idle' : 'chip-on'"
            @click="departPicker = true"
          >
            <span class="text-[14px] i-lucide-calendar" />
            自定义
          </button>
        </div>

        <div class="mt-15px border-t-1px border-solid border-line pt-13px">
          <div class="flex items-baseline justify-between">
            <p class="label">什么时候开始充</p>
            <p class="text-14px font-700 tabular-nums">
              {{ startMode === 'now' || startClamped ? '立即' : when(startMs, nowMs) }}
              <span v-if="startClamped" class="muted font-500">· 原定时间已过</span>
            </p>
          </div>
          <div class="mt-11px flex flex-wrap gap-8px">
            <button
              v-for="kind in ['now', 'dawn', 'eave'] as const"
              :key="kind"
              type="button"
              class="chip"
              :class="startChipOn === kind ? 'chip-on' : 'chip-idle'"
              @click="pickStartChip(kind)"
            >
              {{ kind === 'now' ? '立即' : startChipLabel(kind) }}
            </button>
            <button
              type="button"
              class="chip"
              :class="startChipOn === 'custom' ? 'chip-on' : 'chip-idle'"
              @click="startPicker = true"
            >
              <span class="text-[14px] i-lucide-calendar" />
              自定义
            </button>
          </div>
        </div>

        <div class="mt-15px border-t-1px border-solid border-line pt-13px">
          <div class="flex items-baseline justify-between">
            <p class="label">要提前充满</p>
            <p class="muted tabular-nums">{{ when(deadlineMs, nowMs) }} 前</p>
          </div>
          <OptionChips v-model="bufferMin" :options="bufferOptions" class="mt-10px" />
        </div>
      </section>

      <van-collapse v-model="advanced" class="card overflow-hidden">
        <van-collapse-item title="车辆与充电设备" name="car">
          <div class="flex flex-col gap-16px pt-2px">
            <div>
              <p class="label mb-9px">车型</p>
              <OptionChips :model-value="carId" :options="carOptions" @update:model-value="pickCar" />
            </div>

            <div class="field">
              <p class="label">
                电池容量<span class="muted ml-6px">{{ isCustomCapacity ? '自定义' : car.hint }}</span>
              </p>
              <van-stepper v-model="capacityKwh" :min="20" :max="140" :step="1" theme="round" button-size="26" />
            </div>

            <div>
              <p class="label mb-9px">充电设备</p>
              <OptionChips :model-value="chargerId" :options="chargerOptions" @update:model-value="pickCharger" />
              <p class="muted mt-9px">{{ charger.hint }}</p>
            </div>

            <div class="field">
              <p class="label">
                最大电流<span class="muted ml-6px">{{ isCustomCurrent ? '自定义' : `设备上限 ${charger.maxCurrentA}A` }}</span>
              </p>
              <van-stepper v-model="maxCurrentA" :min="6" :max="64" :step="stepA" theme="round" button-size="26" />
            </div>

            <div>
              <p class="label mb-9px">电流档位</p>
              <OptionChips v-model="stepA" :options="stepOptions" />
              <p class="muted mt-9px">桩支持 1A 一档就选 1A，电流能压得更低、对电池更轻。</p>
            </div>
          </div>
        </van-collapse-item>
      </van-collapse>

      <p class="muted mt-2px text-center">目标是「出发时刚好充满」，不是最快充满。</p>
    </div>

    <TimeWheelPicker
      v-model:open="departPicker"
      v-model:at="departDraft"
      title="几点出发"
      :days="departDays"
      :now-ms="nowMs"
    />
    <TimeWheelPicker
      v-model:open="startPicker"
      v-model:at="startDraft"
      title="什么时候开始充"
      :days="startDays"
      :now-ms="nowMs"
    />
  </ToolPage>
</template>
