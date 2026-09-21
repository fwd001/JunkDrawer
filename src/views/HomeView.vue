<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolCard from '@/components/ToolCard.vue'
import { relTime } from '@/core/format'
import { installReady, isStandalone, needsManualInstall, promptInstall } from '@/core/useInstall'
import { lastUsedTool, rankedTools } from '@/core/session'
import { THEME_LABEL, cycleTheme, themeMode } from '@/core/theme'
import { resetAllStorage } from '@/core/storage'
import { useOnline } from '@vueuse/core'

const online = useOnline()
const tools = rankedTools
const hero = lastUsedTool
const confirming = ref(false)
const version = __APP_VERSION__
/** With a single tool the big card already is the whole list. */
const showGrid = computed(() => tools.value.length > 1 || !hero.value)

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const today = new Date()
const dateLine = `${today.getMonth() + 1} 月 ${today.getDate()} 日 ${WEEK[today.getDay()]}`
const greeting = computed(() => {
  const h = today.getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

function restart() {
  resetAllStorage()
  confirming.value = false
  window.location.reload()
}
</script>

<template>
  <div class="page">
    <header
      class="blur-bar sticky top-0 z-10 flex items-center gap-10px px-16px pb-9px"
      style="padding-top: env(safe-area-inset-top)"
    >
      <h1 class="text-17px font-800 tracking-[-0.01em]">杂物抽屉</h1>
      <span
        v-if="!online"
        class="inline-flex h-22px items-center rounded-full bg-warn px-8px text-11px font-600 text-white"
        >离线</span
      >
      <div class="ml-auto flex items-center gap-6px lg:hidden">
        <button class="icon-btn tap border-none" :aria-label="THEME_LABEL[themeMode]" @click="cycleTheme()">
          <span :class="themeMode === 'system' ? 'i-lucide-contrast' : themeMode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'" />
        </button>
      </div>
    </header>

    <div class="px-14px pb-36px">
      <p class="mb-12px mt-4px text-13px text-ink3">{{ greeting }} · {{ dateLine }}</p>

      <RouterLink
        v-if="hero"
        :to="hero.tool.path"
        class="card tap mb-16px flex w-full items-center gap-14px p-15px text-left no-underline"
      >
        <span class="grid h-52px w-52px shrink-0 place-items-center rounded-16px bg-tint">
          <span class="text-[25px] text-accent" :class="hero.tool.icon" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-11px font-700 tracking-0.06em text-ink3 uppercase">继续上次</span>
          <span class="block truncate text-18px font-750 text-ink">{{ hero.tool.name }}</span>
          <span class="block truncate text-12px text-ink3">
            {{ hero.count > 1 ? `${relTime(hero.at)} · 用过 ${hero.count} 次` : relTime(hero.at) }}
          </span>
        </span>
        <span class="shrink-0 text-[20px] text-ink3 i-lucide-chevron-right" />
      </RouterLink>

      <p v-if="showGrid" class="label mb-8px mt-2px">{{ hero ? '全部工具' : '选一个开始' }}</p>
      <div v-if="showGrid" class="grid grid-cols-2 gap-10px">
        <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" />
      </div>

      <button
        v-if="installReady && !isStandalone"
        class="card tap mt-14px flex w-full items-center gap-12px p-14px text-left"
        @click="promptInstall()"
      >
        <span class="icon-btn"><span class="i-lucide-download" /></span>
        <span class="flex-1">
          <span class="block text-14px font-700">装到手机桌面</span>
          <span class="block text-12px text-ink3">离线可用，打开即用</span>
        </span>
        <span class="text-[20px] text-ink3 i-lucide-chevron-right" />
      </button>
      <div v-else-if="needsManualInstall" class="card mt-14px p-14px">
        <p class="text-14px font-700">装到手机桌面</p>
        <p class="muted mt-2px">Safari 里点分享 <span class="i-lucide-share" />，选「添加到主屏幕」。</p>
      </div>

      <footer class="mt-26px flex items-center gap-10px px-2px">
        <p class="muted flex-1">数据只存在这台设备上 · v{{ version }}</p>
        <button v-if="confirming" class="chip-idle" @click="confirming = false">取消</button>
        <button v-if="confirming" class="chip bg-danger text-white border-danger" @click="restart">确认清空</button>
        <button v-else class="muted tap border-none bg-transparent py-4px" @click="confirming = true">清空记忆</button>
      </footer>
    </div>
  </div>
</template>
