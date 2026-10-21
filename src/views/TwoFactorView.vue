<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useToastStore } from '@/stores/toastStore'
import mockService from '@/mocks/mockService'
import BaseButton from '@/components/common/BaseButton.vue'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const toastStore = useToastStore()

const isMockEnabled = computed(() => mockService.isMockDataEnabled())

// Digits state for 6-box OTP entry
const digits = ref<string[]>(['', '', '', '', '', ''])
const inputRefs = ref<(HTMLInputElement | null)[]>([])
const isShaking = ref(false)

const sessionTimeRemaining = ref(600) // 10 minutes in seconds
let sessionTimerInterval: ReturnType<typeof setInterval> | null = null

// WebOTP AbortController
let otpAbortController: AbortController | null = null

const isComplete = computed(() => {
  return digits.value.every((d) => d.length === 1 && /^\d$/.test(d))
})

const formattedCode = computed(() => digits.value.join(''))

const formattedSessionTime = computed(() => {
  const mins = Math.floor(sessionTimeRemaining.value / 60)
  const secs = sessionTimeRemaining.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const isLockedOut = computed(() => {
  return !!(authStore.lockoutUntil && Date.now() < authStore.lockoutUntil)
})

const lockoutSecondsRemaining = ref(0)
let lockoutTimerInterval: ReturnType<typeof setInterval> | null = null

function updateLockoutCountdown() {
  if (authStore.lockoutUntil && Date.now() < authStore.lockoutUntil) {
    lockoutSecondsRemaining.value = Math.ceil((authStore.lockoutUntil - Date.now()) / 1000)
  } else {
    lockoutSecondsRemaining.value = 0
  }
}

function startTimers() {
  // Session challenge timer based on expiresAt
  if (authStore.pendingTwoFactor?.expiresAt) {
    const diff = Math.max(0, Math.floor((authStore.pendingTwoFactor.expiresAt - Date.now()) / 1000))
    sessionTimeRemaining.value = diff
  } else {
    sessionTimeRemaining.value = 600
  }

  if (sessionTimerInterval) clearInterval(sessionTimerInterval)
  sessionTimerInterval = setInterval(() => {
    if (sessionTimeRemaining.value > 0) {
      sessionTimeRemaining.value--
    } else {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval)
      toastStore.error('Session Expired', '2FA challenge window has expired. Please sign in again.')
      cancelAndReturnToLogin()
    }
  }, 1000)

  // Lockout check timer
  if (lockoutTimerInterval) clearInterval(lockoutTimerInterval)
  lockoutTimerInterval = setInterval(updateLockoutCountdown, 1000)
}

// WebOTP API: progressive enhancement for mobile and supported browsers
async function startWebOtpListener() {
  if (typeof window === 'undefined' || !('OTPCredential' in window)) return
  stopWebOtpListener()

  const ac = new AbortController()
  otpAbortController = ac

  try {
    const otp = (await (navigator.credentials as any).get({
      otp: { transport: ['sms'] },
      signal: ac.signal,
    })) as { code: string } | null

    if (otp && otp.code && /^\d{6}$/.test(otp.code)) {
      distributeCode(otp.code)
      handleVerify()
    }
  } catch (err: any) {
    if (err && err.name === 'AbortError') return
  }
}

function stopWebOtpListener() {
  if (otpAbortController) {
    otpAbortController.abort()
    otpAbortController = null
  }
}

function focusInput(index: number) {
  nextTick(() => {
    if (inputRefs.value[index]) {
      inputRefs.value[index]?.focus()
      inputRefs.value[index]?.select()
    }
  })
}

function distributeCode(codeStr: string) {
  const cleaned = codeStr.replace(/\D/g, '').slice(0, 6)
  for (let i = 0; i < 6; i++) {
    digits.value[i] = cleaned[i] || ''
  }
  const lastIndex = Math.min(cleaned.length, 5)
  focusInput(lastIndex)
}

function handleInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const val = target.value

  // Handle multi-character paste or mobile keyboard auto-fill
  if (val.length > 1) {
    distributeCode(val)
    if (isComplete.value) {
      handleVerify()
    }
    return
  }

  // Handle single character
  const char = val.replace(/\D/g, '')
  digits.value[index] = char

  if (char && index < 5) {
    focusInput(index + 1)
  }

  if (isComplete.value) {
    handleVerify()
  }
}

function handleKeyDown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    if (!digits.value[index] && index > 0) {
      // Empty current box -> move to previous box and clear it
      digits.value[index - 1] = ''
      focusInput(index - 1)
      event.preventDefault()
    } else {
      digits.value[index] = ''
    }
  } else if (event.key === 'ArrowLeft' && index > 0) {
    focusInput(index - 1)
    event.preventDefault()
  } else if (event.key === 'ArrowRight' && index < 5) {
    focusInput(index + 1)
    event.preventDefault()
  } else if (event.key === 'Enter' && isComplete.value) {
    handleVerify()
  }
}

function handlePaste(event: ClipboardEvent) {
  event.preventDefault()
  const text = event.clipboardData?.getData('text') || ''
  const cleaned = text.replace(/\D/g, '')
  if (!cleaned) return

  distributeCode(cleaned)
  if (isComplete.value) {
    handleVerify()
  }
}

async function handleVerify() {
  if (authStore.isLoading || isLockedOut.value) return

  const codeToVerify = formattedCode.value
  if (!codeToVerify) return

  stopWebOtpListener()

  const success = await authStore.verifyTwoFactor(codeToVerify)

  if (success) {
    toastStore.success(
      'Two-Factor Verified',
      `Welcome, ${authStore.user?.first_name || 'HQ Admin'}. Access granted to Admin Portal.`,
    )
    router.push('/ticket')
  } else {
    // Shake animation feedback on error
    isShaking.value = true
    setTimeout(() => {
      isShaking.value = false
    }, 500)

    // Clear inputs and refocus first box
    digits.value = ['', '', '', '', '', '']
    focusInput(0)
  }
}

function fillDemoCode(code: string) {
  distributeCode(code)
  setTimeout(() => {
    handleVerify()
  }, 200)
}

function cancelAndReturnToLogin() {
  stopWebOtpListener()
  authStore.cancelTwoFactor()
  router.push({ name: 'login' })
}

onMounted(() => {
  // If no active pending 2FA session, redirect to login immediately
  if (!authStore.hasPendingTwoFactor) {
    router.replace({ name: 'login' })
    return
  }

  startTimers()
  startWebOtpListener()
  focusInput(0)
})

onUnmounted(() => {
  stopWebOtpListener()
  if (sessionTimerInterval) clearInterval(sessionTimerInterval)
  if (lockoutTimerInterval) clearInterval(lockoutTimerInterval)
})
</script>

<template>
  <div
    class="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-indigo-500 selection:text-white"
  >
    <!-- Ambient Background Glows -->
    <div
      class="absolute -top-24 -left-24 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-indigo-500/12 dark:bg-indigo-600/15 rounded-full blur-[110px] pointer-events-none"
    ></div>
    <div
      class="absolute -bottom-24 -right-24 w-96 sm:w-[520px] h-96 sm:h-[520px] bg-violet-500/12 dark:bg-violet-600/15 rounded-full blur-[110px] pointer-events-none"
    ></div>

    <!-- Subtle Dot Pattern Background -->
    <div
      class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
      style="
        background-image: radial-gradient(rgba(99, 102, 241, 0.7) 1px, transparent 1px);
        background-size: 24px 24px;
      "
    ></div>

    <!-- Top Floating Theme Switcher -->
    <header
      class="w-full max-w-7xl flex items-center justify-end absolute z-30 top-6 right-6 sm:right-8"
    >
      <div class="flex items-center gap-2">
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

    <!-- Main Two-Factor Validation Card -->
    <main class="w-full max-w-[500px] sm:max-w-[540px] relative z-20 my-auto py-6">
      <div
        class="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-7 sm:p-10 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-indigo-950/10 dark:shadow-slate-950/80 relative transition-all"
        :class="{ 'animate-shake': isShaking }"
      >
        <!-- Security Shield Brand Icon -->
        <div class="text-center mb-6">
          <div
            class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 ring-4 ring-indigo-500/10 dark:ring-indigo-400/10 mb-3.5 transition-transform hover:scale-105 duration-200"
          >
            <ShieldCheck class="w-8 h-8 text-white stroke-[2.2]" />
          </div>
          <h1
            class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Two-Factor Authentication
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            HQ Admin Security Checkpoint
          </p>
        </div>

        <!-- Authenticated User Context Badge -->
        <div
          v-if="authStore.pendingTwoFactor"
          class="mb-6 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs uppercase"
            >
              {{ authStore.pendingTwoFactor.username.slice(0, 2) }}
            </div>
            <div class="text-left">
              <div
                class="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"
              >
                <span>{{
                  authStore.pendingTwoFactor.user?.first_name || authStore.pendingTwoFactor.username
                }}</span>
                <span class="text-xs text-slate-400 font-normal"
                  >@{{ authStore.pendingTwoFactor.username }}</span
                >
              </div>
              <div
                class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5"
              >
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Requires Multi-Factor Token</span>
              </div>
            </div>
          </div>
          <span
            class="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
          >
            {{ authStore.pendingTwoFactor.role }}
          </span>
        </div>

        <!-- Verification Prompt -->
        <div
          class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 text-center leading-relaxed"
        >
          <p>
            Enter the 6-digit verification code from your authenticator app or registered security
            device.
          </p>
        </div>

        <!-- 6-Digit OTP Form -->
        <form @submit.prevent="handleVerify" class="space-y-5">
          <!-- OTP Digits Container -->
          <div class="flex items-center justify-center gap-2 sm:gap-3" @paste="handlePaste">
            <template v-for="(digit, idx) in digits" :key="idx">
              <input
                :ref="(el) => (inputRefs[idx] = el as HTMLInputElement)"
                v-model="digits[idx]"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="1"
                autocomplete="one-time-code"
                :disabled="authStore.isLoading || isLockedOut"
                :aria-label="`Verification code digit ${idx + 1} of 6`"
                class="w-12 sm:w-14 h-14 sm:h-16 text-center text-2xl sm:text-3xl font-mono font-bold rounded-2xl border transition-all select-none outline-hidden"
                :class="[
                  digit
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-300/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white hover:border-slate-400 dark:hover:border-slate-600',
                  'focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900',
                  isLockedOut ? 'opacity-40 cursor-not-allowed' : '',
                ]"
                @input="handleInput(idx, $event)"
                @keydown="handleKeyDown(idx, $event)"
              />
            </template>
          </div>

          <!-- Challenge Expiry & Rate Limiting Row -->
          <div
            class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-1"
          >
            <div class="flex items-center gap-1.5">
              <Clock class="w-4 h-4 text-indigo-500" />
              <span>Expires:</span>
              <span class="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {{ formattedSessionTime }}
              </span>
            </div>

            <div
              v-if="authStore.remainingAttempts < 5 && !isLockedOut"
              class="text-amber-600 dark:text-amber-400 font-medium"
            >
              {{ authStore.remainingAttempts }} attempts remaining
            </div>

            <div
              v-if="isLockedOut"
              class="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"
            >
              <ShieldAlert class="w-4 h-4" />
              <span>Locked: {{ lockoutSecondsRemaining }}s</span>
            </div>
          </div>

          <!-- Error Message Alert -->
          <div
            v-if="authStore.error"
            role="alert"
            class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-3 shadow-xs text-left"
          >
            <AlertCircle class="w-5 h-5 shrink-0 text-rose-500" />
            <span class="font-medium leading-relaxed">{{ authStore.error }}</span>
          </div>

          <!-- Mock Mode Helper Card -->
          <div
            v-if="isMockEnabled"
            class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-xs space-y-2.5 text-left"
          >
            <div class="flex items-center justify-between">
              <span
                class="font-semibold flex items-center gap-2 text-xs sm:text-sm text-amber-900 dark:text-amber-100"
              >
                <Sparkles class="w-4 h-4 text-amber-500 shrink-0" />
                Mock 2FA Mode
              </span>
              <span
                class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 font-bold"
              >
                DEV HELPER
              </span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              Default code is
              <code class="font-mono text-indigo-600 dark:text-indigo-400 font-bold">000000</code>.
              Test below:
            </p>
            <div class="flex gap-2.5 pt-0.5">
              <button
                type="button"
                @click="fillDemoCode('000000')"
                class="flex-1 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors text-center cursor-pointer border border-emerald-500/20"
              >
                Fill 000000 (Pass)
              </button>
              <button
                type="button"
                @click="fillDemoCode('999999')"
                class="flex-1 py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 text-xs font-semibold transition-colors text-center cursor-pointer border border-rose-500/20"
              >
                Fill 999999 (Fail)
              </button>
            </div>
          </div>

          <!-- Verification Button -->
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            class="w-full !rounded-xl !h-12 sm:!h-13 text-sm sm:text-base font-semibold shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40"
            :loading="authStore.isLoading"
            :disabled="!isComplete || isLockedOut"
            :icon-right="ArrowRight"
          >
            <span>{{
              authStore.isLoading ? 'Verifying Security Token...' : 'Verify & Continue'
            }}</span>
          </BaseButton>
        </form>

        <!-- Cancel & Return to Login -->
        <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
          <button
            type="button"
            @click="cancelAndReturnToLogin"
            class="text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft class="w-4 h-4" />
            <span>Sign in with a different account</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Footer Security Information -->
    <footer
      class="w-full max-w-md text-center text-xs text-slate-400 dark:text-slate-500 relative z-20 pb-2"
    >
      <div class="flex items-center justify-center gap-1.5 mb-1.5 font-medium">
        <ShieldCheck class="w-3.5 h-3.5 text-emerald-500" />
        <span>Enterprise 256-Bit SSL • ISO/IEC 27001 Multi-Factor Security</span>
      </div>
      <div class="flex items-center justify-center gap-3 text-[11px]">
        <a href="#" class="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >Security Policy</a
        >
        <span>•</span>
        <a href="#" class="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >Help Desk</a
        >
        <span>•</span>
        <a href="#" class="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >Status</a
        >
      </div>
    </footer>
  </div>
</template>
