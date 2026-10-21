<script setup lang="ts">
import BaseInput from '@/components/common/BaseInput.vue'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useToastStore } from '@/stores/toastStore'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  User,
  X,
} from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import mockService from '@/mocks/mockService'
import EnvironmentBadge from '@/components/common/EnvironmentBadge.vue'
import { isProduction } from '@/config/environment'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const themeStore = useThemeStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isForgotModalOpen = ref(false)
const forgotEmail = ref('')
const isForgotSubmitted = ref(false)

const isMockEnabled = computed(() => mockService.isMockDataEnabled())

function fillDemo(role: 'admin' | 'branch') {
  if (role === 'admin') {
    username.value = 'admin'
    password.value = 'password123'
  } else {
    username.value = 'branch_manager'
    password.value = 'password123'
  }
  handleLogin()
}

async function handleLogin() {
  if (!username.value || !password.value) return

  const success = await authStore.login(username.value, password.value)
  if (success) {
    if (authStore.hasPendingTwoFactor) {
      toastStore.info(
        '2FA Verification Required',
        'HQ Admin security policy requires two-factor authentication.',
      )
      router.push({ name: 'two-factor' })
      return
    }

    const roleName = authStore.user?.role || 'Staff'
    toastStore.success(
      'Welcome To Ticket System!',
      `Signed in as ${authStore.user?.first_name || 'User'} (${roleName})`,
    )
    router.push('/ticket')
  } else {
    toastStore.error('Authentication Failed', authStore.error || 'Please check your credentials.')
  }
}

function handleForgotPassword() {
  if (!forgotEmail.value) return
  isForgotSubmitted.value = true
  toastStore.success('Reset Link Sent', `Password recovery link dispatched to ${forgotEmail.value}`)
  setTimeout(() => {
    isForgotModalOpen.value = false
    isForgotSubmitted.value = false
    forgotEmail.value = ''
  }, 1800)
}
</script>

<template>
  <div
    class="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-indigo-500 selection:text-white"
  >
    <!-- ============================================================== -->
    <!-- SOFT & CLEAN AMBIENT BACKGROUND GLOWS                          -->
    <!-- ============================================================== -->
    <div
      class="absolute -top-24 -left-24 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-indigo-500/12 dark:bg-indigo-600/15 rounded-full blur-[110px] pointer-events-none"
    ></div>
    <div
      class="absolute -bottom-24 -right-24 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-violet-500/12 dark:bg-violet-600/15 rounded-full blur-[110px] pointer-events-none"
    ></div>

    <!-- Subtle Clean Dot Texture -->
    <div
      class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
      style="
        background-image: radial-gradient(rgba(99, 102, 241, 0.7) 1px, transparent 1px);
        background-size: 24px 24px;
      "
    ></div>

    <!-- ============================================================== -->
    <!-- TOP FLOATING BAR: THEME SWITCHER                               -->
    <!-- ============================================================== -->
    <header
      class="w-full max-w-7xl flex items-center justify-end absolute z-30 top-6 right-6 sm:right-8"
    >
      <div class="flex items-center gap-2">
        <EnvironmentBadge v-if="!isProduction" />
        <button
          @click="themeStore.toggleTheme"
          class="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95"
          :title="themeStore.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <Sun v-if="themeStore.isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-indigo-600" />
        </button>
      </div>
    </header>

    <!-- ============================================================== -->
    <!-- MAIN CENTERED AUTHENTICATION CARD                              -->
    <!-- ============================================================== -->
    <main
      class="w-full max-w-[580px] h-[80vh] min-h-[620px] max-h-[840px] relative z-20 my-auto py-2 flex flex-col justify-center"
    >
      <!-- Card Container -->
      <div
        class="h-full w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 md:p-12 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-indigo-950/10 dark:shadow-slate-950/80 relative transition-all flex flex-col justify-between overflow-y-auto"
      >
        <!-- Header / Brand Ticket Icon -->
        <div class="text-center pt-1 pb-1">
          <div
            class="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/25 ring-4 ring-indigo-500/10 dark:ring-indigo-400/10 mb-4 transition-transform hover:scale-105 duration-200"
          >
            <Ticket class="w-8 h-8 sm:w-10 sm:h-10 text-white stroke-[2.2] -rotate-6" />
          </div>
          <h1
            class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Ticket Admin
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Sign in to Ticket System Admin Portal
          </p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-5 my-auto py-2">
          <!-- Username / Email Field -->
          <BaseInput
            id="username"
            name="username"
            autocomplete="username"
            enterkeyhint="next"
            v-model="username"
            label="Username"
            type="text"
            required
            placeholder="Enter your username"
            size="lg"
            :icon="User"
          />

          <!-- Password Field with Toggle & Forgot Password Link -->
          <BaseInput
            id="current-password"
            name="password"
            autocomplete="current-password"
            enterkeyhint="done"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            required
            placeholder="••••••••••••"
            size="lg"
            :icon="Lock"
          >
            <template #suffix>
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 cursor-pointer transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                :title="showPassword ? 'Hide password' : 'Show password'"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <EyeOff v-if="showPassword" class="w-5 h-5" />
                <Eye v-else class="w-5 h-5" />
              </button>
            </template>
          </BaseInput>

          <!-- Error Message Alert -->
          <div
            v-if="authStore.error"
            class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-3 shadow-xs text-left"
          >
            <AlertCircle class="w-5 h-5 shrink-0 text-rose-500" />
            <span class="font-medium leading-relaxed">{{ authStore.error }}</span>
          </div>

          <!-- Mock Mode Demo Banner -->
          <div
            v-if="isMockEnabled"
            class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs space-y-2.5 text-left"
          >
            <div class="flex items-center justify-between">
              <span
                class="font-semibold flex items-center gap-2 text-xs sm:text-sm text-amber-900 dark:text-amber-100"
              >
                <Sparkles class="w-4 h-4 text-amber-500 shrink-0" />
                Mock Mode Active (.env)
              </span>
              <span
                class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/20 font-bold text-amber-800 dark:text-amber-200"
              >
                DEMO
              </span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Backend API is mocked. Select a test account below:
            </p>
            <div class="flex gap-2.5 pt-1">
              <button
                type="button"
                @click="fillDemo('admin')"
                class="flex-1 py-2 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm font-semibold transition-all text-center cursor-pointer shadow-2xs border border-indigo-500/20 hover:scale-[1.01] active:scale-[0.99]"
              >
                Demo HQ Admin (2FA)
              </button>
              <button
                type="button"
                @click="fillDemo('branch')"
                class="flex-1 py-2 px-3 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all text-center cursor-pointer shadow-2xs hover:scale-[1.01] active:scale-[0.99]"
              >
                Demo Branch User
              </button>
            </div>
          </div>

          <!-- Refined Sign-In Button -->
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="w-full h-12 sm:h-13 px-5 rounded-xl font-semibold text-sm sm:text-base text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            <Loader2 v-if="authStore.isLoading" class="w-5 h-5 animate-spin" />
            <span>{{ authStore.isLoading ? 'Authenticating...' : 'Sign In to Admin Portal' }}</span>
            <ArrowRight v-if="!authStore.isLoading" class="w-5 h-5" />
          </button>
        </form>

        <!-- Role-Based Quick Test Accounts Helper -->
        <div class="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <footer class="w-full text-center text-xs text-slate-400 dark:text-slate-500">
            <div class="flex items-center justify-center gap-2 mb-2 font-medium">
              <ShieldCheck class="w-4 h-4 text-emerald-500" />
              <span>End-to-End SSL • Multi-Tenant Enterprise Security</span>
            </div>
            <div class="flex items-center justify-center gap-3 text-xs">
              <a href="#" class="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >Privacy Policy</a
              >
              <span>•</span>
              <a href="#" class="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >Terms of Service</a
              >
              <span>•</span>
              <a href="#" class="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >System Status</a
              >
            </div>
          </footer>
        </div>
      </div>
    </main>

    <!-- ============================================================== -->
    <!-- BOTTOM FOOTER & SECURITY BADGE                                 -->
    <!-- ============================================================== -->

    <!-- ============================================================== -->
    <!-- FORGOT PASSWORD MODAL                                          -->
    <!-- ============================================================== -->
    <div
      v-if="isForgotModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      @click.self="isForgotModalOpen = false"
    >
      <div
        class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left"
      >
        <!-- Close Button -->
        <button
          @click="isForgotModalOpen = false"
          class="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>

        <div
          class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4"
        >
          <Mail class="w-5 h-5" />
        </div>

        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">Reset Your Password</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Enter your registered work email. We'll send you an encrypted token link to reset your
          credentials.
        </p>

        <form @submit.prevent="handleForgotPassword" class="space-y-4">
          <BaseInput
            id="forgot-email"
            name="email"
            autocomplete="email"
            enterkeyhint="send"
            v-model="forgotEmail"
            label="Corporate Email Address"
            type="email"
            required
            placeholder="admin@bronx.internal"
            size="lg"
            :icon="Mail"
          />

          <div class="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              @click="isForgotModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isForgotSubmitted"
              class="px-4 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 shadow-md shadow-indigo-500/30 transition-all cursor-pointer"
            >
              <span v-if="isForgotSubmitted" class="flex items-center gap-1.5">
                <CheckCircle2 class="w-4 h-4" /> Sent
              </span>
              <span v-else>Send Recovery Link</span>
            </button>
          </div>
        </form>

        <div
          class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center"
        >
          Need immediate access? Contact your administrator at
          <span class="font-mono text-indigo-500 font-semibold">ops@bronx-helpdesk.internal</span>
        </div>
      </div>
    </div>

  </div>
</template>
