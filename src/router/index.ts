import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { markToolUsed } from '@/core/session'
import { resolveTransition } from '@/core/nav'
import { toolByPath, tools } from '@/core/tools'

export const router = createRouter({
  // GitHub Pages serves the app under /<repo>/, which Vite exposes as BASE_URL.
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { depth: 0 } },
    ...tools.map((tool) => ({
      path: tool.path,
      name: tool.id,
      component: tool.component,
      meta: { depth: 1, toolId: tool.id },
    })),
    { path: '/:all(.*)', redirect: '/' },
  ],
})

router.beforeEach((to, from) => {
  resolveTransition(to, from)
})

router.afterEach((to) => {
  const tool = toolByPath(to.path)
  if (tool) markToolUsed(tool.id)
})
