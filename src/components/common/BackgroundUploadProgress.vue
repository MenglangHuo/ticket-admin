<script setup lang="ts">
import { useUploadQueueStore } from '@/stores/uploadQueueStore'
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  Paperclip,
} from 'lucide-vue-next'

const uploadQueueStore = useUploadQueueStore()
</script>

<template>
  <aside
    v-if="uploadQueueStore.tasks.length > 0"
    aria-label="Background Uploads"
    class="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full"
  >
    <TransitionGroup
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="task in uploadQueueStore.tasks"
        :key="task.id"
        class="pointer-events-auto bg-slate-900/95 text-white border rounded-xl shadow-2xl backdrop-blur-md p-3.5 transition-all"
        :class="{
          'border-sky-500/40 shadow-sky-950/20':
            task.status === 'uploading' || task.status === 'compressing',
          'border-emerald-500/40 shadow-emerald-950/20': task.status === 'completed',
          'border-rose-500/40 shadow-rose-950/20': task.status === 'error',
        }"
      >
        <div class="flex items-start gap-3">
          <!-- Status Icon -->
          <div class="shrink-0 mt-0.5">
            <div
              v-if="task.status === 'compressing'"
              class="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400"
            >
              <Loader2 class="w-4 h-4 animate-spin" />
            </div>
            <div
              v-else-if="task.status === 'uploading'"
              class="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400"
            >
              <UploadCloud class="w-4 h-4 animate-pulse" />
            </div>
            <div
              v-else-if="task.status === 'completed'"
              class="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400"
            >
              <CheckCircle2 class="w-4 h-4" />
            </div>
            <div
              v-else
              class="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400"
            >
              <AlertCircle class="w-4 h-4" />
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h4 class="text-xs font-semibold text-slate-100 truncate">
                <span v-if="task.status === 'compressing'">Optimizing Attachments...</span>
                <span v-else-if="task.status === 'uploading'">Uploading to {{ task.ticketKey }}</span>
                <span v-else-if="task.status === 'completed'">Uploaded to {{ task.ticketKey }}</span>
                <span v-else>Upload Failed ({{ task.ticketKey }})</span>
              </h4>
              <span class="text-[10px] text-slate-400 font-mono shrink-0">
                {{ task.progress }}%
              </span>
            </div>

            <p class="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1 truncate">
              <Paperclip class="w-3 h-3 text-slate-400 shrink-0" />
              <span>{{ task.fileCount }} file(s)</span>
              <span v-if="task.errorMessage" class="text-rose-400 ml-1 truncate">
                - {{ task.errorMessage }}
              </span>
            </p>

            <!-- Progress Bar -->
            <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300 ease-out"
                :class="{
                  'bg-gradient-to-r from-sky-500 to-indigo-500':
                    task.status === 'uploading' || task.status === 'compressing',
                  'bg-emerald-500': task.status === 'completed',
                  'bg-rose-500': task.status === 'error',
                }"
                :style="{ width: `${task.progress}%` }"
              ></div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
            <button
              v-if="task.status === 'error'"
              @click="uploadQueueStore.retryUpload(task.id)"
              title="Retry Upload"
              class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <RefreshCw class="w-3.5 h-3.5" />
            </button>
            <button
              @click="uploadQueueStore.dismissTask(task.id)"
              title="Dismiss"
              class="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </aside>
</template>
