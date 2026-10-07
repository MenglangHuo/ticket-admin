<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useToastStore } from '@/stores/toastStore';
import {
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
  ArrowRight,
  Users,
} from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'done'): void;
}>();

const settingsStore = useSettingsStore();
const toastStore = useToastStore();

const isGenerated = ref(false);
const generatedLink = ref('');
const isCopied = ref(false);
const showQrCode = ref(false);
const errorMessage = ref<string | null>(null);

async function handleGenerate() {
  errorMessage.value = null;
  try {
    const url = await settingsStore.generateInviteLink();
    if (!url) {
      errorMessage.value = 'Failed to generate link. The server returned an empty URL.';
      return;
    }
    generatedLink.value = url;
    isGenerated.value = true;
  } catch (err: any) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'Failed to generate invite link. Please check your network and bot settings.';
  }
}

async function copyLink() {
  if (!generatedLink.value) return;

  let copied = false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(generatedLink.value);
      copied = true;
    }
  } catch (e) {
    console.warn('navigator.clipboard failed, attempting fallback', e);
  }

  if (!copied) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = generatedLink.value;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (e) {
      console.error('execCommand copy failed', e);
    }
  }

  if (copied) {
    isCopied.value = true;
    toastStore.success('Copied to Clipboard', generatedLink.value);
    setTimeout(() => {
      isCopied.value = false;
    }, 2500);
  } else {
    toastStore.error('Copy Failed', 'Unable to auto-copy. Please select and copy the link text manually.');
  }
}

function handleReset() {
  isGenerated.value = false;
  generatedLink.value = '';
  showQrCode.value = false;
  errorMessage.value = null;
}
</script>

<template>
  <div
    class="p-3 sm:p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 transition-all w-full"
  >
    <!-- Card Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800/80 gap-4">
      <div class="flex items-start sm:items-center gap-3.5">
        <div
          class="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs"
        >
          <LinkIcon class="w-5 h-5" />
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Generate Telegram Bot Invite Link
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create an onboarding invite link so staff members can subscribe with a single tap on Telegram.
          </p>
        </div>
      </div>

      <!-- Target Bot Pill -->
      <a
        :href="`https://t.me/${settingsStore.botConfig.botUsername.replace(/^@/, '')}`"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/80 dark:border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors self-start sm:self-auto cursor-pointer"
        title="Open bot in Telegram"
      >
        <Bot class="w-4 h-4 text-sky-500" />
        <span>@{{ settingsStore.botConfig.botUsername.replace(/^@/, '') }}</span>
        <ExternalLink class="w-3 h-3 text-sky-400 opacity-60" />
      </a>
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="mt-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5 animate-fade-in"
    >
      <AlertCircle class="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
      <div class="leading-relaxed">{{ errorMessage }}</div>
    </div>

    <!-- State 1: Before Generating -->
    <div v-if="!isGenerated" class="mt-6 space-y-6">
      <!-- 3 Steps Explainer Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div class="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div class="font-semibold text-slate-900 dark:text-white text-xs">
            Generate Secure Token
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            The gateway creates a cryptographically signed one-time invite token mapped to your workspace.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div class="w-7 h-7 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div class="font-semibold text-slate-900 dark:text-white text-xs">
            Share Link or QR Code
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Send the direct link or show the QR code to your staff member to open Telegram.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div class="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div class="font-semibold text-slate-900 dark:text-white text-xs">
            Instant Subscription
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            When they tap <strong>Start</strong> in Telegram, they immediately receive real-time ticket alerts!
          </p>
        </div>
      </div>

      <!-- Generate Button CTA -->
      <div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="text-xs text-slate-500 dark:text-slate-400">
          Generated links are active for 7 days and can be unlinked at any time.
        </div>

        <button
          @click="handleGenerate"
          :disabled="settingsStore.isGeneratingInvite"
          class="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
        >
          <RotateCw v-if="settingsStore.isGeneratingInvite" class="w-4 h-4 animate-spin" />
          <Sparkles v-else class="w-4 h-4" />
          <span>Generate Telegram Invite Link</span>
        </button>
      </div>
    </div>

    <!-- State 2: Generated Link Ready -->
    <div v-else class="mt-6 space-y-6 animate-fade-in">
      <div class="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 flex items-start sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck class="w-5 h-5" />
          </div>
          <div>
            <div class="text-sm font-bold text-emerald-950 dark:text-emerald-300">
              Subscription Link Created Successfully
            </div>
            <div class="text-xs text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
              Valid for 7 days • Share this secure link with your team member.
            </div>
          </div>
        </div>

        <span class="hidden sm:inline-flex text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700">
          Active Link
        </span>
      </div>

      <!-- Link Copy Field -->
      <div class="space-y-2">
        <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Telegram Deep Link URL:
        </label>
        <div
          class="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 shadow-2xs"
        >
          <input
            type="text"
            readonly
            :value="generatedLink"
            @click="($event.target as HTMLInputElement).select()"
            class="w-full bg-transparent font-mono text-xs text-sky-600 dark:text-sky-400 px-3 py-1.5 focus:outline-none select-all cursor-pointer"
          />
          <button
            @click="copyLink"
            type="button"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shrink-0 shadow-xs transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
          >
            <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" />
            <span>{{ isCopied ? 'Copied' : 'Copy Link' }}</span>
          </button>
        </div>
      </div>

      <!-- Actions Row: Open, QR, Reset -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div class="flex items-center gap-2.5">
          <a
            :href="generatedLink"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Send class="w-3.5 h-3.5 text-sky-500" />
            <span>Open in Telegram</span>
            <ExternalLink class="w-3 h-3 text-slate-400" />
          </a>

          <button
            @click="showQrCode = !showQrCode"
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <QrCode class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ showQrCode ? 'Hide QR Code' : 'Show QR Code' }}</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="handleReset"
            type="button"
            class="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Generate Another
          </button>

          <button
            @click="$emit('done')"
            type="button"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Users class="w-3.5 h-3.5" />
            <span>View Subscribers</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- QR Code Container -->
      <div
        v-if="showQrCode"
        class="mt-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center animate-fade-in"
      >
        <div class="p-2.5 bg-white rounded-2xl inline-block shadow-sm border border-slate-200">
          <img
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedLink)}`"
            alt="Telegram Bot QR Code"
            class="w-36 h-36 mx-auto rounded-lg"
            loading="lazy"
          />
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
          Scan with mobile camera to subscribe directly on Telegram
        </p>
      </div>
    </div>
  </div>
</template>
