import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import App from './App.vue'
import { router } from './router'
import { applyStoredTheme } from './core/theme'
import { trackInstall, watchInstallPrompt } from './core/useInstall'
import 'virtual:uno.css'
import './styles/base.css'

applyStoredTheme()
trackInstall()
watchInstallPrompt()
// registerType: 'autoUpdate' means the new version is live on the next open.
registerSW({ immediate: true })

createApp(App).use(router).mount('#app')
