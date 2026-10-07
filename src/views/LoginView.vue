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
  Sun,
  Ticket,
  User,
  X,
} from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()
const themeStore = useThemeStore()

const username = ref('')
const password = ref('')
const twoFactorCode = ref('')
const showPassword = ref(false)
const isForgotModalOpen = ref(false)
const forgotEmail = ref('')
const isForgotSubmitted = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) return

  const success = await authStore.login(username.value, password.value, twoFactorCode.value)
  if (success) {
    const roleName = authStore.user?.role || 'Staff'
    toastStore.success(
      'Welcome To Ticket System!',
      `Signed in as ${authStore.user?.first_name || 'User'} (${roleName})`,
    )
    router.push('/tickets')
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

    <!-- ============================================================== -->
    <!-- MAIN CENTERED AUTHENTICATION CARD                              -->
    <!-- ============================================================== -->
    <main class="w-full max-w-[420px] sm:max-w-[440px] relative z-20 my-auto py-6">
      <header
        class="w-full max-w-5xl flex items-center justify-end absolute z-20 top-6 right-4 py-3"
      >
        <div class="flex items-center gap-2">
          <button
            @click="themeStore.toggleTheme"
            class="p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95"
            :title="themeStore.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          >
            <Sun v-if="themeStore.isDark" class="w-4 h-4 text-amber-400" />
            <Moon v-else class="w-4 h-4 text-indigo-600" />
          </button>
        </div>
      </header>
      <!-- Card Container -->
      <div
        class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-7 sm:p-9 border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/80 relative transition-all"
      >
        <!-- Header / Brand Ticket Icon -->
        <div class="text-center mb-7">
          <div
            class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 ring-4 ring-indigo-500/10 dark:ring-indigo-400/10 mb-3.5 transition-transform hover:scale-105 duration-200"
          >
            <Ticket class="w-7 h-7 text-white stroke-[2.2] -rotate-6" />
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ticket Admin
          </h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Sign in to Ticket System Admin Portal
          </p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Username / Email Field -->
          <BaseInput
            v-model="username"
            label="Username"
            type="text"
            required
            placeholder="Enter your username"
            size="md"
            :icon="User"
          />

          <!-- Password Field with Toggle & Forgot Password Link -->
          <BaseInput
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Password"
            required
            placeholder="••••••••••••"
            size="md"
            :icon="Lock"
          >
            <!-- <template #label-right>
              <button
                type="button"
                @click="isForgotModalOpen = true"
                class="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </template> -->
            <template #suffix>
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
                :title="showPassword ? 'Hide password' : 'Show password'"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </template>
          </BaseInput>

          <!-- Remember Me & 2FA Helper Row -->
          <!-- <div class="flex items-center justify-between text-xs pt-0.5">
            <label
              class="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <input
                type="checkbox"
                v-model="rememberMe"
                class="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/20 dark:bg-slate-950 transition-colors cursor-pointer"
              />
              <span>Remember this device</span>
            </label>

            <button
              type="button"
              @click="showTwoFactorAdvanced = !showTwoFactorAdvanced"
              class="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>2FA Code</span>
              <ChevronUp v-if="showTwoFactorAdvanced" class="w-3 h-3" />
              <ChevronDown v-else class="w-3 h-3" />
            </button>
          </div> -->

          <!-- Expandable 2FA Security Code Field -->
          <!-- <div
            v-if="showTwoFactorAdvanced"
            class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <BaseInput
              v-model="twoFactorCode"
              label="2FA Security Code"
              type="text"
              placeholder="000000"
              size="sm"
              :icon="KeyRound"
            />
            <p class="text-[10px] text-slate-400 dark:text-slate-500">
              Default verification code: <code class="font-mono text-indigo-500 font-semibold">000000</code>
            </p>
          </div> -->

          <!-- Error Message Alert -->
          <div
            v-if="authStore.error"
            class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-xs text-left"
          >
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-500" />
            <span class="font-medium leading-relaxed">{{ authStore.error }}</span>
          </div>

          <!-- Refined Sign-In Button -->
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="w-full h-11 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-sm shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-6"
          >
            <Loader2 v-if="authStore.isLoading" class="w-4 h-4 animate-spin" />
            <span>{{ authStore.isLoading ? 'Authenticating...' : 'Sign In to Admin Portal' }}</span>
            <ArrowRight v-if="!authStore.isLoading" class="w-4 h-4" />
          </button>
        </form>

        <!-- Role-Based Quick Test Accounts Helper -->
        <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <footer
            class="w-full max-w-md text-center text-xs text-slate-400 dark:text-slate-500 relative z-20 pb-2"
          >
            <div class="flex items-center justify-center gap-1.5 mb-1.5 font-medium">
              <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
              <span>End-to-End SSL • Multi-Tenant Enterprise Security</span>
            </div>
            <div class="flex items-center justify-center gap-3 text-[11px]">
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
            v-model="forgotEmail"
            label="Corporate Email Address"
            type="email"
            required
            placeholder="admin@bronx.internal"
            size="md"
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
