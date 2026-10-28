<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useToastStore } from '@/stores/toastStore'
import {
  X,
  Link as LinkIcon,
  Copy,
  Check,
  QrCode,
  Sparkles,
  ShieldCheck,
  Send,
  ExternalLink,
  Bot,
  RotateCw,
  AlertCircle,
  Download,
} from 'lucide-vue-next'

defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const settingsStore = useSettingsStore()
const toastStore = useToastStore()

const isGenerated = ref(false)
const generatedLink = ref('')
const isCopied = ref(false)
const showQrCode = ref(false)
const isDownloadingQr = ref(false)
const errorMessage = ref<string | null>(null)

const targetBotName = computed(() => {
  return (
    settingsStore.botConfig.botUsername ||
    settingsStore.botInfo?.bot_username ||
    ''
  ).replace(/^@/, '')
})

async function downloadQrCode() {
  if (!generatedLink.value) return
  isDownloadingQr.value = true
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(generatedLink.value)}`
    const res = await fetch(qrUrl)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `telegram-bot-invite-qr-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
    toastStore.success('QR Code Downloaded', 'Saved QR code image to your device.')
  } catch (e) {
    console.error('Failed to download QR code image:', e)
    window.open(
      `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(generatedLink.value)}`,
      '_blank',
    )
  } finally {
    isDownloadingQr.value = false
  }
}

async function handleGenerate() {
  errorMessage.value = null
  try {
    const url = await settingsStore.generateInviteLink()
    if (!url) {
      errorMessage.value = 'Failed to generate link. The server returned an empty URL.'
      return
    }
    generatedLink.value = url
    isGenerated.value = true
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message ||
      err.message ||
      'Failed to generate invite link. Please check your network and bot settings.'
  }
}

async function copyLink() {
  if (!generatedLink.value) return

  let copied = false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(generatedLink.value)
      copied = true
    }
  } catch (e) {
    console.warn('navigator.clipboard failed, attempting fallback', e)
  }

  if (!copied) {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = generatedLink.value
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      copied = document.execCommand('copy')
      document.body.removeChild(textArea)
    } catch (e) {
      console.error('execCommand copy failed', e)
    }
  }

  if (copied) {
    isCopied.value = true
    toastStore.success('Copied to Clipboard', generatedLink.value)
    setTimeout(() => {
      isCopied.value = false
    }, 2500)
  } else {
    toastStore.error(
      'Copy Failed',
      'Unable to auto-copy. Please select and copy the link text manually.',
    )
  }
}

function handleReset() {
  isGenerated.value = false
  generatedLink.value = ''
  showQrCode.value = false
  errorMessage.value = null
}

function handleClose() {
  handleReset()
  emit('close')
}

defineExpose({
  isGenerated,
  generatedLink,
  showQrCode,
  isCopied,
  handleGenerate,
  copyLink,
  downloadQrCode,
  handleReset,
  handleClose,
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
    @click.self="handleClose"
  >
    <div
      class="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[92vh] flex flex-col my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all text-slate-900 dark:text-slate-100"
    >
      <!-- Modal Header -->
      <div
        class="shrink-0 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20"
          >
            <LinkIcon class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">
              Generate Telegram Bot Invite Link
            </h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Instant Staff Onboarding via /start Deep Linking
            </p>
          </div>
        </div>

        <button
          @click="handleClose"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- State 1: Explainer & Generate Action -->
      <div
        v-if="!isGenerated"
        class="flex-1 overflow-y-auto min-h-0 custom-modal-scroll p-5 sm:p-6 space-y-4 text-xs"
      >
        <!-- Error Alert if failed -->
        <div
          v-if="errorMessage"
          class="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
        >
          <AlertCircle class="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div class="leading-relaxed">{{ errorMessage }}</div>
        </div>

        <div
          class="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-start gap-3"
        >
          <Bot class="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
          <div class="space-y-1">
            <div class="font-bold text-slate-900 dark:text-white text-xs">
              How Telegram Subscription Works:
            </div>
            <p class="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              1. The server generates a unique cryptographic secret token linked to your company.<br />
              2. Staff opens the generated link in Telegram and taps <strong>Start</strong>.<br />
              3. The Telegram Bot webhook automatically records their private Chat ID and company
              tenant.<br />
              4. From then on, any ticket submitted by clients will push instant notifications to
              their chat!
            </p>
          </div>
        </div>

        <div
          class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
        >
          <div class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            Target Bot:
          </div>
          <div class="font-mono text-xs text-sky-600 dark:text-sky-400">
            @{{ settingsStore.botConfig.botUsername.replace(/^@/, '') }}
          </div>
        </div>
      </div>

      <!-- State 2: Generated Link Result -->
      <div
        v-else
        class="flex-1 overflow-y-auto min-h-0 custom-modal-scroll p-4 sm:p-5 space-y-3.5 text-xs animate-fade-in"
      >
        <div class="text-center space-y-1.5">
          <div
            class="w-10 h-10 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shadow-2xs"
          >
            <ShieldCheck class="w-5 h-5" />
          </div>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">Subscription Link Ready!</h4>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Send this secure link to your team member. When opened, Telegram will prompt them to tap
            <strong>Start</strong> to subscribe.
          </p>
        </div>

        <!-- Link Copy Bar -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-semibold text-slate-600 dark:text-slate-400">Telegram Deep Link</span>
            <span class="text-emerald-500 font-medium">Valid for 7 days</span>
          </div>

          <div
            class="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
          >
            <input
              type="text"
              readonly
              :value="generatedLink"
              @click="($event.target as HTMLInputElement).select()"
              class="w-full bg-transparent font-mono text-xs text-sky-600 dark:text-sky-400 px-2 focus:outline-none select-all cursor-pointer truncate"
            />
            <button
              @click="copyLink"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shrink-0 shadow-sm transition-all cursor-pointer"
            >
              <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" />
              <span>{{ isCopied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <!-- Action Row: Open in Telegram & Toggle QR Code -->
        <div class="flex flex-wrap items-center justify-center gap-2 pt-0.5">
          <a
            :href="generatedLink"
            target="_blank"
            rel="noopener noreferrer"
            class="h-8.5 px-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/60 font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Send class="w-3.5 h-3.5" />
            <span>Open in Telegram</span>
            <ExternalLink class="w-3 h-3 text-sky-400/80" />
          </a>

          <button
            @click="showQrCode = !showQrCode"
            type="button"
            class="h-8.5 px-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
            :class="
              showQrCode
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
            "
          >
            <QrCode class="w-3.5 h-3.5" />
            <span>{{ showQrCode ? 'Hide QR Code' : 'Show Mobile QR Code' }}</span>
          </button>
        </div>

        <!-- Expanded Dedicated QR Code Card -->
        <div
          v-if="showQrCode"
          class="p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-200/90 dark:border-slate-800 flex flex-col items-center justify-center gap-2.5 animate-fade-in shadow-xs"
        >
          <div
            class="flex items-center justify-between w-full text-[11px] font-semibold text-slate-600 dark:text-slate-400 px-1"
          >
            <span class="flex items-center gap-1.5">
              <QrCode class="w-3.5 h-3.5 text-indigo-500" />
              <span>Mobile QR Code Onboarding</span>
            </span>
            <span
              v-if="targetBotName"
              class="font-mono text-[10px] text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-full border border-sky-200/80 dark:border-sky-800/60"
            >
              {{ '@' + targetBotName }}
            </span>
          </div>

          <!-- Crisp White QR Code Container with Frame -->
          <div class="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200">
            <img
              :src="`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedLink)}`"
              alt="Telegram Bot QR Code"
              class="w-32 h-32 rounded-xl block mx-auto"
              loading="lazy"
            />
          </div>

          <p class="text-[11px] text-slate-500 dark:text-slate-400 text-center max-w-xs leading-relaxed">
            Scan with your mobile camera or Telegram app to subscribe directly.
          </p>

          <!-- Quick Action for QR: Download Image -->
          <button
            type="button"
            @click="downloadQrCode"
            :disabled="isDownloadingQr"
            class="h-8 px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <RotateCw v-if="isDownloadingQr" class="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <Download v-else class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ isDownloadingQr ? 'Downloading...' : 'Download QR Image' }}</span>
          </button>
        </div>
      </div>

      <!-- Modal Footer -->
      <div
        class="shrink-0 flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50"
      >
        <template v-if="!isGenerated">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="settingsStore.isGeneratingInvite"
            @click="handleGenerate"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw v-if="settingsStore.isGeneratingInvite" class="w-4 h-4 animate-spin" />
            <Sparkles v-else class="w-4 h-4" />
            <span>Generate Link</span>
          </button>
        </template>

        <template v-else>
          <button
            type="button"
            @click="handleReset"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Generate Another
          </button>
          <button
            type="button"
            @click="handleClose"
            class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs shadow-sm transition-all cursor-pointer"
          >
            Done
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-modal-scroll::-webkit-scrollbar {
  width: 5px;
}
.custom-modal-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-modal-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 9999px;
}
.custom-modal-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}
</style>
