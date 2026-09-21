import type { Component } from 'vue'

export interface ToolMeta {
  id: string
  name: string
  desc: string
  /** UnoCSS presetIcons class, e.g. `i-lucide-zap` */
  icon: string
  path: string
  component: () => Promise<Component>
  /** Free-form tags shown on the card. */
  tags: string[]
}

export const tools: ToolMeta[] = [
  {
    id: 'charge-fit',
    name: '充电管家',
    desc: '算出最温和的充电电流，刚好在出发前充满',
    icon: 'i-lucide-zap',
    path: '/charge-fit',
    tags: ['特斯拉', '计算器'],
    component: () => import('@/tools/chargefit/ChargeFitView.vue'),
  },
]

export function toolByPath(path: string) {
  return tools.find((tool) => tool.path === path)
}

export function toolById(id: string) {
  return tools.find((tool) => tool.id === id)
}
