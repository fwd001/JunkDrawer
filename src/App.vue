<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { transitionName } from '@/core/nav'
import { rankedTools } from '@/core/session'
import { THEME_LABEL, cycleTheme, themeMode } from '@/core/theme'
</script>

<template>
  <div class="h-full flex bg-bg text-ink">
    <aside class="hidden lg:flex w-232px shrink-0 flex-col gap-2px border-r-1px border-solid border-line bg-surface p-12px">
      <RouterLink to="/" class="tap mb-14px flex items-center gap-10px rounded-12px px-10px py-9px no-underline">
        <span class="grid h-32px w-32px shrink-0 place-items-center rounded-9px bg-accent">
          <span class="text-[17px] text-accent-ink i-lucide-archive" />
        </span>
        <span class="text-15px font-700 text-ink">杂物抽屉</span>
      </RouterLink>

      <span class="px-10px pb-6px text-11px font-700 tracking-0.08em text-ink3 uppercase">工具</span>
      <RouterLink
        v-for="tool in rankedTools"
        :key="tool.id"
        :to="tool.path"
        class="tap flex items-center gap-10px rounded-11px px-10px py-9px text-14px font-600 text-ink2 no-underline"
        active-class="rail-on"
      >
        <span class="text-[17px]" :class="tool.icon" />
        <span class="truncate">{{ tool.name }}</span>
      </RouterLink>

      <button
        class="tap mt-auto flex items-center gap-8px rounded-11px px-10px py-9px text-13px font-600 text-ink3 bg-transparent text-left"
        @click="cycleTheme()"
      >
        <span class="text-[16px]" :class="themeMode === 'system' ? 'i-lucide-contrast' : themeMode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'" />
        {{ THEME_LABEL[themeMode] }}
      </button>
    </aside>

    <div class="relative mx-auto w-full max-w-560px min-w-0 flex-1 overflow-hidden lg:max-w-760px">
      <RouterView v-slot="{ Component, route }">
        <Transition :name="transitionName">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>
