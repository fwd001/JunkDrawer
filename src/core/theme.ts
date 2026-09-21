import { usePreferredDark, useStorage } from '@vueuse/core'
import { watchEffect } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

/** Stored as a raw string so the pre-paint script in index.html can read it. */
export const themeMode = useStorage<ThemeMode>('jd:theme', 'system')

export function applyStoredTheme() {
  const prefersDark = usePreferredDark()
  watchEffect(() => {
    const dark = themeMode.value === 'dark' || (themeMode.value === 'system' && prefersDark.value)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  })
}

const ORDER: ThemeMode[] = ['system', 'light', 'dark']

export const THEME_LABEL: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

export function cycleTheme() {
  const next = ORDER[(ORDER.indexOf(themeMode.value) + 1) % ORDER.length]
  themeMode.value = next ?? 'system'
}
