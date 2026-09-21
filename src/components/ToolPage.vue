<script setup lang="ts">
import { useRouterBack } from '@/core/useRouterBack'
import { ref } from 'vue'
import { useEdgeBack } from '@/core/useEdgeBack'

const props = defineProps<{ title: string }>()

const root = ref<HTMLElement | null>(null)
const back = useRouterBack()
useEdgeBack(root, back)
</script>

<template>
  <div ref="root" class="page">
    <header class="blur-bar sticky top-0 z-10 flex items-center gap-8px px-10px" style="padding-top: env(safe-area-inset-top)">
      <button class="tap grid h-36px w-36px shrink-0 place-items-center border-none bg-transparent" aria-label="返回" @click="back()">
        <span class="text-[22px] text-accent i-lucide-chevron-left" />
      </button>
      <h1 class="truncate py-11px text-16px font-700">{{ props.title }}</h1>
      <div class="ml-auto flex items-center gap-6px">
        <slot name="actions" />
      </div>
    </header>
    <div class="px-14px pb-34px pt-10px">
      <slot />
    </div>
    <div class="h-34px" style="height: env(safe-area-inset-bottom)" />
  </div>
</template>
