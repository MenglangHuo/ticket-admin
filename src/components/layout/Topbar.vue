<script setup lang="ts">
import CustomDropdown from '@/components/common/CustomDropdown.vue'
import EnvironmentBadge from '@/components/common/EnvironmentBadge.vue'
import { isProduction } from '@/config/environment'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useTicketStore } from '@/stores/ticketStore'
import { getUserFromLocalStorage } from '@/utils/ticket'
import {
  Building2,
  Check,
  ChevronDown,
  Command,
  Copy,
  LogOut,
  Mail,
  Menu,
  Moon,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Ticket,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineProps<{
  isMobileOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleMobile'): void
}>()

const route = useRoute()
const router = useRouter()
const ticketStore = useTicketStore()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const searchInputRef = ref<HTMLInputElement | null>(null)
const avatarImgError = ref<boolean>(false)
const copiedField = ref<string | null>(null)

const storedUser = computed(() => {
  return getUserFromLocalStorage() || authStore.user || {}
})

const userDisplayName = computed(() => {
  const u = storedUser.value
  if (u.first_name || u.last_name) {
    return `${u.first_name || ''} ${u.last_name || ''}`.trim()
  }
  return u.username || u.name || 'Admin Staff'
})

const userRole = computed(() => {
  return storedUser.value?.role || authStore.user?.role || 'Administrator'
})

const userInitials = computed(() => {
  const u = storedUser.value
  const f = u.first_name?.[0] || u.username?.[0] || 'A'
  const l = u.last_name?.[0] || ''
  return (f + l).toUpperCase()
})

const userProfileImg = computed(() => {
  return (
    storedUser.value?.profile ||
    storedUser.value?.profile_url ||
    storedUser.value?.avatar ||
    authStore.user?.profile ||
    null
  )
})

async function copyUserField(text?: string, fieldName = 'field') {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = fieldName
    setTimeout(() => {
      if (copiedField.value === fieldName) {
        copiedField.value = null
      }
    }, 2000)
  } catch (err) {
    console.warn('Clipboard write failed:', err)
  }
}

function handleLogout(closeDropdown?: () => void) {
  closeDropdown?.()
  authStore.logout()
  router.push('/login')
}

function handleGoToSettings(closeDropdown?: () => void) {
  closeDropdown?.()
  router.push('/settings')
}

const isDashboard = computed(() => route.path === '/dashboard')
const isTickets = computed(
  () => route.path === '/ticket' || route.path === '/tickets' || route.path === '/',
)
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

    <!-- Right Controls: Switch Environment Badge, Theme Toggle & Profile User -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      <!-- Environment Status Badge (Hidden in production) -->
      <EnvironmentBadge v-if="!isProduction" />

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

      <!-- User Profile Dropdown (Right top side near switch mode icon) -->
      <CustomDropdown align="right" width="w-80 sm:w-88">
        <template #trigger="{ isOpen }">
          <button
            type="button"
            class="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all cursor-pointer select-none group text-left"
            :class="{ 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs': isOpen }"
            title="View user details & profile menu"
          >
            <!-- User Avatar with Status Indicator -->
            <div class="relative shrink-0 flex items-center justify-center">
              <div
                class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 p-0.5 shadow-xs ring-1 ring-indigo-500/20 overflow-hidden flex items-center justify-center"
              >
                <img
                  v-if="userProfileImg && !avatarImgError"
                  :src="userProfileImg"
                  alt="Profile"
                  class="w-full h-full rounded-[10px] object-cover"
                  @error="avatarImgError = true"
                />
                <span v-else class="font-bold text-xs text-white">
                  {{ userInitials }}
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
                {{ userDisplayName }}
              </p>
              <span
                v-if="authStore.isPreview"
                class="text-[10px] font-semibold text-amber-600 dark:text-amber-400"
              >
                Preview
              </span>
              <span
                v-else-if="authStore.isTicketAdmin"
                class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
              >
                Ticket Admin
              </span>
              <span
                v-else-if="authStore.isBranch"
                class="text-[10px] font-semibold text-sky-600 dark:text-sky-400"
              >
                Branch User
              </span>
              <span v-else class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                {{ storedUser?.role || authStore.user?.role || 'Administrator' }}
              </span>
            </div>

            <ChevronDown
              class="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ml-0.5"
              :class="{ 'rotate-180': isOpen }"
            />
          </button>
        </template>

        <template #default="{ close }">
          <div class="p-1">
            <!-- Header User Card -->
            <div
              class="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-slate-50 to-sky-50/40 dark:from-slate-800/80 dark:via-slate-900/90 dark:to-indigo-950/40 border border-slate-200/80 dark:border-slate-800 mb-2"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 p-0.5 shadow-md shadow-indigo-600/20 ring-1 ring-white/30 shrink-0 overflow-hidden flex items-center justify-center"
                >
                  <img
                    v-if="userProfileImg && !avatarImgError"
                    :src="userProfileImg"
                    alt="Profile"
                    class="w-full h-full rounded-[14px] object-cover"
                    @error="avatarImgError = true"
                  />
                  <span v-else class="font-bold text-sm text-white">
                    {{ userInitials }}
                  </span>
                </div>

                <div class="min-w-0 flex-1">
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {{ userDisplayName }}
                  </h4>

                  <p v-if="storedUser?.username" class="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                    @{{ storedUser.username }}
                  </p>

                  <div class="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                      :class="[
                        authStore.isTicketAdmin
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                          : authStore.isBranch
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30',
                      ]"
                    >
                      {{ userRole }}
                    </span>
                    <span
                      class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                    >
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Online
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Main Info Details Section -->
            <div class="px-2 py-1 space-y-2 text-xs">
              <!-- Email -->
              <div
                v-if="storedUser?.email"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/40"
                  >
                    <Mail class="w-3.5 h-3.5" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Email
                    </div>
                    <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[170px]" :title="storedUser.email">
                      {{ storedUser.email }}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="copyUserField(storedUser.email, 'email')"
                  class="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  :title="copiedField === 'email' ? 'Copied!' : 'Copy email'"
                >
                  <Check v-if="copiedField === 'email'" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Phone -->
              <div
                v-if="storedUser?.phone || storedUser?.personal_phone"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40"
                  >
                    <Phone class="w-3.5 h-3.5" />
                  </div>
                  <div class="min-w-0">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Phone
                    </div>
                    <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                      {{ storedUser.phone || storedUser.personal_phone }}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  @click="copyUserField(storedUser.phone || storedUser.personal_phone, 'phone')"
                  class="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  :title="copiedField === 'phone' ? 'Copied!' : 'Copy phone'"
                >
                  <Check v-if="copiedField === 'phone'" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Role -->
              <div
                v-if="userRole"
                class="flex items-center gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80"
              >
                <div
                  class="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40"
                >
                  <ShieldCheck class="w-3.5 h-3.5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Role
                  </div>
                  <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                    {{ userRole }}
                  </div>
                </div>
              </div>

              <!-- Department -->
              <div
                v-if="storedUser?.department_name"
                class="flex items-start gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/80"
              >
                <div
                  class="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200/60 dark:border-sky-800/40"
                >
                  <Building2 class="w-3.5 h-3.5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Department
                  </div>
                  <div
                    class="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate"
                    :title="storedUser.department_name"
                  >
                    {{ storedUser.department_name }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions Row -->
            <div class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5 px-1">
              <button
                type="button"
                @click="handleGoToSettings(close)"
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Settings class="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>

              <button
                type="button"
                @click="handleLogout(close)"
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut class="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </template>
      </CustomDropdown>
    </div>
  </header>
</template>
