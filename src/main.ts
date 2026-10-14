import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/main.css'
import { useThemeStore } from './stores/themeStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const themeStore = useThemeStore()
themeStore.initTheme()

// Wait until router has resolved the initial route before mounting
// This completely prevents flashes of the admin template on standalone pages (e.g. /login, /two-factor)
router.isReady().then(() => {
  app.mount('#app')
})
