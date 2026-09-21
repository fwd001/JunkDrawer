import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const installReady = ref(false)
export const isStandalone = ref(false)
/** iOS/Safari never fires beforeinstallprompt, so it needs the manual recipe. */
export const needsManualInstall = ref(false)

let deferred: InstallPromptEvent | null = null

export function trackInstall() {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || iosStandalone
  const ios = /iphone|ipad|ipod/.test(navigator.userAgent)
  needsManualInstall.value = ios && !isStandalone.value
}

export function watchInstallPrompt() {
  useEventListener(window, 'beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    installReady.value = true
  })
  useEventListener(window, 'appinstalled', () => {
    deferred = null
    installReady.value = false
    isStandalone.value = true
  })
}

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  const choice = await deferred.userChoice
  if (choice.outcome === 'accepted') installReady.value = false
  deferred = null
}
