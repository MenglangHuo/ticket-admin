<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'
import {
  ChevronRight,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Ticket,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineProps<{
  isMobileOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'closeMobile'): void
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isCollapsed = ref<boolean>(false)

onMounted(() => {
  const saved = localStorage.getItem('bronx_sidebar_collapsed')
  if (saved !== null) {
    isCollapsed.value = saved === 'true'
  }
})

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('bronx_sidebar_collapsed', String(isCollapsed.value))
}

const currentPath = computed(() => route.path)

const navItems = computed(() => [
  {
    name: 'Dashboard',
    description: 'Analytics & Overview',
    path: '/dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Tickets',
    description: 'Board & Live Queue',
    path: '/tickets',
    icon: KanbanSquare,
    badge: null,
  },
  {
    name: 'Settings',
    description: 'System & Preferences',
    path: '/settings',
    icon: Settings,
    badge: null,
  },
])

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside
    class="h-screen bg-white/95 dark:bg-slate-950/95 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between select-none z-30 transition-[width,transform] duration-300"
    :class="[
      isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0',
      isCollapsed ? 'md:w-20' : 'md:w-64',
      'fixed md:static inset-y-0 left-0',
    ]"
  >
    <!-- Top Brand Area -->
    <div :class="isCollapsed ? 'p-3 flex flex-col items-center gap-2' : 'p-4'">
      <!-- Collapsed Header -->
      <template v-if="isCollapsed">
        <div
          class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-md shadow-indigo-600/25 ring-1 ring-white/20 shrink-0"
          title="Ticket Admin"
        >
          <Ticket class="w-5 h-5 text-white -rotate-6" />
        </div>

        <button
          type="button"
          @click="toggleCollapse"
          title="Expand sidebar"
          class="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <PanelLeftOpen class="w-4 h-4" />
        </button>
      </template>

      <!-- Expanded Header -->
      <template v-else>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-md shadow-indigo-600/25 ring-1 ring-white/20 shrink-0"
            >
              <Ticket class="w-5 h-5 text-white -rotate-6" />
            </div>
            <div class="truncate">
              <div class="flex items-center gap-1.5">
                <span
                  class="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate"
                >
                  Ticket Admin
                </span>
              </div>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                Ticket Management
              </p>
            </div>
          </div>

          <!-- Desktop Collapse Toggle Button -->
          <button
            type="button"
            @click="toggleCollapse"
            title="Collapse sidebar"
            class="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftClose class="w-4 h-4" />
          </button>

          <!-- Mobile Close Button -->
          <button
            v-if="isMobileOpen"
            @click="emit('closeMobile')"
            class="md:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
          >
            ✕
          </button>
        </div>
      </template>
    </div>

    <!-- Navigation Menu -->
    <div class="flex-1 py-4 space-y-2.5 overflow-y-auto" :class="isCollapsed ? 'px-2.5' : 'px-3'">
      <!-- Section Label -->
      <div v-if="!isCollapsed" class="flex items-center justify-between px-2 pb-1">
        <span
          class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          Navigation
        </span>
        <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
      </div>
      <div v-else class="flex justify-center pb-1">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
      </div>

      <!-- Collapsed Nav Items (Icon Only) -->
      <template v-if="isCollapsed">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          @click="emit('closeMobile')"
          :title="item.name"
          class="relative group flex items-center justify-center p-2 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden"
          :class="[
            currentPath.startsWith(item.path)
              ? 'bg-gradient-to-r from-indigo-50/90 via-white to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900 border border-indigo-400/80 dark:border-indigo-500/60 shadow-md shadow-indigo-500/10 dark:shadow-[0_4px_20px_-4px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/15'
              : 'bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70 hover:border-indigo-200/80 dark:hover:border-indigo-500/30 shadow-xs hover:shadow-sm hover:-translate-y-0.5',
          ]"
        >
          <!-- Active Left Indicator Glow Bar -->
          <span
            v-if="currentPath.startsWith(item.path)"
            class="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-gradient-to-b from-indigo-600 to-sky-500 shadow-sm shadow-indigo-500/50"
          ></span>

          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
            :class="[
              currentPath.startsWith(item.path)
                ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 group-hover:scale-105',
            ]"
          >
            <component :is="item.icon" class="w-4.5 h-4.5" />
          </div>
        </router-link>
      </template>

      <!-- Expanded Nav Items (Icon + Text + Badge + Chevron) -->
      <template v-else>
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          @click="emit('closeMobile')"
          class="relative group flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden"
          :class="[
            currentPath.startsWith(item.path)
              ? 'bg-gradient-to-r from-indigo-50/90 via-white to-white dark:from-indigo-950/50 dark:via-slate-900 dark:to-slate-900 border border-indigo-400/80 dark:border-indigo-500/60 shadow-md shadow-indigo-500/10 dark:shadow-[0_4px_20px_-4px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/15'
              : 'bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70 hover:border-indigo-200/80 dark:hover:border-indigo-500/30 shadow-xs hover:shadow-sm hover:-translate-y-0.5',
          ]"
        >
          <!-- Active Left Indicator Glow Bar -->
          <span
            v-if="currentPath.startsWith(item.path)"
            class="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-indigo-600 to-sky-500 shadow-sm shadow-indigo-500/50"
          ></span>

          <div class="flex items-center gap-3 min-w-0 pl-1">
            <!-- Icon Box Card -->
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
              :class="[
                currentPath.startsWith(item.path)
                  ? 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500/20'
                  : 'bg-slate-100/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 group-hover:scale-105',
              ]"
            >
              <component :is="item.icon" class="w-4 h-4" />
            </div>

            <!-- Label and Subtitle -->
            <div class="truncate text-left">
              <p
                class="text-xs tracking-tight transition-colors truncate"
                :class="[
                  currentPath.startsWith(item.path)
                    ? 'font-bold text-slate-900 dark:text-white'
                    : 'font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white',
                ]"
              >
                {{ item.name }}
              </p>
              <p
                class="text-[10px] tracking-normal transition-colors truncate"
                :class="[
                  currentPath.startsWith(item.path)
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400',
                ]"
              >
                {{ item.description }}
              </p>
            </div>
          </div>

          <!-- Right Side Badge / Arrow -->
          <div class="flex items-center gap-1.5 shrink-0 pr-1">
            <span
              v-if="item.badge !== null"
              class="text-[11px] px-2 py-0.5 rounded-full transition-all"
              :class="[
                currentPath.startsWith(item.path)
                  ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30'
                  : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/80 dark:border-indigo-500/30',
              ]"
            >
              {{ item.badge }}
            </span>

            <ChevronRight
              class="w-3.5 h-3.5 transition-all duration-200"
              :class="[
                currentPath.startsWith(item.path)
                  ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5'
                  : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-500 dark:group-hover:text-slate-400 group-hover:translate-x-0.5',
              ]"
            />
          </div>
        </router-link>
      </template>
    </div>

    <!-- Sidebar Bottom: Clean, Beautiful Sign Out Button -->
    <div
      class="border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40"
      :class="isCollapsed ? 'p-2.5 flex justify-center' : 'p-3'"
    >
      <!-- Collapsed: Icon-Only Sign Out Button -->
      <template v-if="isCollapsed">
        <button
          type="button"
          @click="handleLogout"
          title="Sign Out"
          class="group w-10 h-10 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 flex items-center justify-center shadow-xs hover:shadow-md text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 cursor-pointer"
        >
          <LogOut
            class="w-4 h-4 transition-transform group-hover:scale-110 group-hover:-translate-x-0.5"
          />
        </button>
      </template>

      <!-- Expanded: Full Clean & Beautiful Sign Out Button -->
      <template v-else>
        <button
          type="button"
          @click="handleLogout"
          title="Sign Out"
          class="group w-full p-2.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 hover:border-rose-300 dark:hover:border-rose-500/40 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
        >
          <div class="flex items-center gap-3 min-w-0">
            <!-- Icon Box -->
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100/90 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/40 group-hover:text-rose-600 dark:group-hover:text-rose-400 border border-slate-200/60 dark:border-slate-700/60 group-hover:border-rose-200 dark:group-hover:border-rose-800/50 transition-all duration-200 group-hover:scale-105"
            >
              <LogOut class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            </div>

            <!-- Sign Out Labels -->
            <div class="text-left truncate">
              <p
                class="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors"
              >
                Sign Out
              </p>
              <p
                class="text-[10px] text-slate-400 dark:text-slate-500 group-hover:text-rose-500/70 transition-colors font-medium truncate"
              >
                Log out of account
              </p>
            </div>
          </div>

          <ChevronRight
            class="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-rose-500 transition-all group-hover:translate-x-0.5 shrink-0"
          />
        </button>
      </template>
    </div>
  </aside>
</template>
