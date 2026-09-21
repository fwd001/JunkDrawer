<script setup lang="ts">
import type { ToolMeta } from '@/core/tools'
import { lastUsed, useCount } from '@/core/session'
import { relTime } from '@/core/format'

const props = defineProps<{ tool: ToolMeta }>()

const when = (tool: ToolMeta) => {
  const at = lastUsed(tool.id)
  const n = useCount(tool.id)
  if (!at) return tool.tags.join(' · ')
  return n > 1 ? `${relTime(at)} · 用过 ${n} 次` : relTime(at)
}
</script>

<template>
  <RouterLink :to="props.tool.path" class="card tap flex flex-col gap-8px p-14px no-underline">
    <span class="grid h-38px w-38px place-items-center rounded-12px bg-tint">
      <span class="text-[19px] text-accent" :class="props.tool.icon" />
    </span>
    <span class="text-15px font-700 text-ink">{{ props.tool.name }}</span>
    <span class="line-clamp-2 text-12px leading-17px text-ink3">{{ props.tool.desc }}</span>
    <span class="text-11px text-ink3">{{ when(props.tool) }}</span>
  </RouterLink>
</template>
