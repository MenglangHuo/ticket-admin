<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import Topbar from '@/components/layout/Topbar.vue'
import ToastContainer from '@/components/layout/ToastContainer.vue'

const route = useRoute()
const isMobileSidebarOpen = ref<boolean>(false)

const isStandaloneRoute = computed(() => {
  if (route.meta?.standalone) return true

  const currentPath =
    route.path && route.path !== '/'
      ? route.path
      : typeof window !== 'undefined'
        ? window.location.pathname
        : ''
  const currentName = route.name as string | undefined

  return (
    currentName === 'login' ||
    currentName === 'two-factor' ||
    currentName === 'client-ticket' ||
    currentPath === '/login' ||
    currentPath === '/two-factor' ||
    currentPath === '/two_factor' ||
    currentPath === '/client-ticket'
  )
})

function toggleMobileSidebar() {
  isMobileSidebarOpen.value = !isMobileSidebarOpen.value
}

function closeMobileSidebar() {
  isMobileSidebarOpen.value = false
}
</script>

<template>
  <div
    :class="[
      'min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors',
      isStandaloneRoute ? 'w-full block min-h-screen' : 'flex overflow-hidden',
    ]"
  >
    <!-- Toast notifications container -->
    <ToastContainer />

    <!-- If on Standalone page (Login or Client Ticket Portal), render directly -->
    <template v-if="isStandaloneRoute">
      <router-view />
    </template>

    <!-- Otherwise, render Main Application Layout -->
    <template v-else>
      <!-- Mobile Backdrop -->
      <div
        v-if="isMobileSidebarOpen"
        @click="closeMobileSidebar"
        class="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm md:hidden"
      ></div>

      <!-- Collapsible / Responsive Sidebar -->
      <Sidebar :isMobileOpen="isMobileSidebarOpen" @closeMobile="closeMobileSidebar" />

      <!-- Main App Content Area -->
      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <!-- Top Navigation Bar -->
        <Topbar :isMobileOpen="isMobileSidebarOpen" @toggleMobile="toggleMobileSidebar" />

        <!-- Main View Container -->
        <main class="flex-1 overflow-y-auto p-4">
          <router-view />
        </main>
      </div>
    </template>
  </div>
</template>
