<script setup lang="ts">
import ApiModeModal from '@/components/common/ApiModeModal.vue'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useTicketStore } from '@/stores/ticketStore'
import { Command, Menu, Moon, Search, Sun, Ticket } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'

defineProps<{
  isMobileOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleMobile'): void
}>()

const route = useRoute()
const ticketStore = useTicketStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const isApiModalOpen = ref<boolean>(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const avatarImgError = ref<boolean>(false)

const isDashboard = computed(() => route.path === '/dashboard')
const isTickets = computed(() => route.path === '/tickets' || route.path === '/')
const isClients = computed(() => route.path === '/clients')
const isSettings = computed(() => route.path === '/settings')

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  } else if (
    e.key === '/' &&
    document.activeElement?.tagName !== 'INPUT' &&
    document.activeElement?.tagName !== 'TEXTAREA'
  ) {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header
    class="h-16 px-2 md:px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between sticky top-0 z-20 transition-colors"
  >
    <!-- Left Area: Dashboard Title OR Ticket Management Header OR Contextual Titles -->
    <div class="flex items-center gap-3 flex-1 min-w-0">
      <button
        @click="emit('toggleMobile')"
        class="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors shrink-0"
      >
        <Menu class="w-5 h-5" />
      </button>

      <!-- On Dashboard: Show 'Ticket Dashboard' Title -->
      <div v-if="isDashboard" class="flex items-center gap-2.5 min-w-0">
        <h1
          class="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate"
        >
          Ticket Dashboard
        </h1>
        <span
          class="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0"
        >
          Overview
        </span>
      </div>

      <!-- On Tickets: Ticket Management Header (Consistent with Dashboard Page Style) -->
      <div v-else-if="isTickets" class="flex items-center justify-between flex-1 min-w-0 gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <Ticket class="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <h1
            class="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate"
          >
            Ticket Management
          </h1>
          <span
            class="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 shrink-0"
          >
            Live Queue
          </span>
        </div>
      </div>

      <!-- On Clients Page -->
      <div v-else-if="isClients" class="flex items-center gap-2.5 min-w-0">
        <h1
          class="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate"
        >
          API Clients & Integration
        </h1>
      </div>

      <!-- On Settings Page -->
      <div v-else-if="isSettings" class="flex items-center gap-2.5 min-w-0">
        <h1
          class="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate"
        >
          System Settings
        </h1>
      </div>

      <!-- Fallback Global Search for any other routes -->
      <div v-else class="relative w-full max-w-xl">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          ref="searchInputRef"
          v-model="ticketStore.searchQuery"
          type="text"
          placeholder="Search ticket key (TCK-1), title, client, or reporter... (Cmd+K or /)"
          class="w-full bg-slate-100 dark:bg-slate-900/90 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 pl-10 pr-16 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
        />
        <div
          class="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[10px] text-slate-500 dark:text-slate-300 font-mono"
        >
          <Command class="w-3 h-3" />
          <span>K</span>
        </div>
      </div>
    </div>

    <!-- Right Controls: Switch Mode Icon & Profile User -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      <!-- Light / Dark Mode Toggle -->
      <button
        @click="themeStore.toggleTheme"
        class="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
        :title="themeStore.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <Sun v-if="themeStore.isDark" class="w-4 h-4 text-amber-400" />
        <Moon v-else class="w-4 h-4 text-indigo-600" />
      </button>

      <!-- Vertical Divider -->
      <div class="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>

      <!-- User Profile (Right top side near switch mode icon) -->
      <div class="flex items-center gap-2.5 pl-0.5">
        <!-- Sample Profile User Avatar with Status Indicator -->
        <div class="relative shrink-0 flex items-center justify-center">
          <div
            class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 p-0.5 shadow-xs ring-1 ring-indigo-500/20 overflow-hidden flex items-center justify-center"
          >
            <img
              v-if="authStore.user?.profile && !avatarImgError"
              :src="authStore.user.profile"
              alt="Profile"
              class="w-full h-full rounded-[10px] object-cover"
              @error="avatarImgError = true"
            />
            <span v-else class="font-bold text-xs text-white">
              {{
                (authStore.user?.first_name?.[0] || 'A') + (authStore.user?.last_name?.[0] || 'S')
              }}
            </span>
          </div>
          <span
            class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950 shadow-xs"
            title="Active Online"
          ></span>
        </div>

        <!-- User Name & Role -->
        <div class="hidden sm:block text-left leading-tight">
          <p
            class="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[120px]"
          >
            {{
              authStore.user?.first_name
                ? `${authStore.user.first_name} ${authStore.user.last_name}`
                : 'Admin Staff'
            }}
          </p>
          <span
            v-if="authStore.isPreview"
            class="text-[10px] font-semibold text-amber-600 dark:text-amber-400"
          >
            Preview
          </span>
          <span
            v-else-if="authStore.isBranch"
            class="text-[10px] font-semibold text-sky-600 dark:text-sky-400"
          >
            Branch User
          </span>
          <span v-else class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
            {{ authStore.user?.role || 'Administrator' }}
          </span>
        </div>
      </div>
    </div>

    <!-- API Config Modal -->
    <ApiModeModal :isOpen="isApiModalOpen" @close="isApiModalOpen = false" />
  </header>
</template>
