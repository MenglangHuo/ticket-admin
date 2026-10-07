<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ticketApi } from '@/api/ticketApi'
import { useThemeStore } from '@/stores/themeStore'
import { useToastStore } from '@/stores/toastStore'
import HtmlDescriptionEditor from '@/components/common/HtmlDescriptionEditor.vue'
import {
  Ticket,
  Bug,
  Sparkles,
  HelpCircle,
  CheckSquare,
  User,
  Mail,
  Phone,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Trash2,
  CheckCircle2,
  Sun,
  Moon,
  ShieldCheck,
  Send,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Sparkle,
} from 'lucide-vue-next'

const themeStore = useThemeStore()
const toastStore = useToastStore()

const form = reactive({
  title: '',
  description: '',
  type: 'bug' as 'bug' | 'enhancement' | 'question' | 'task',
  priority: 'high' as 'low' | 'medium' | 'high' | 'critical',
  reporter_name: '',
  reporter_email: '',
  reporter_phone: '',
})

interface AttachedFileItem {
  id: string
  file: File
  name: string
  size: number
  type: string
  previewUrl?: string
}

const attachedFiles = ref<AttachedFileItem[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const isSubmitting = ref(false)
const submittedTicket = ref<any | null>(null)
const errorMessage = ref<string | null>(null)
const isKeyCopied = ref(false)

const typeOptions = [
  {
    value: 'bug',
    label: 'Bug Report',
    desc: 'Something is broken or not working as expected',
    icon: Bug,
    color: 'text-rose-500',
    activeBg: 'bg-rose-500/10 border-rose-500/50 text-rose-600 dark:text-rose-400',
  },
  {
    value: 'enhancement',
    label: 'Feature Request',
    desc: 'New functionality or enhancement idea',
    icon: Sparkles,
    color: 'text-purple-500',
    activeBg: 'bg-purple-500/10 border-purple-500/50 text-purple-600 dark:text-purple-400',
  },
  {
    value: 'question',
    label: 'Question',
    desc: 'Need help or inquiry about services',
    icon: HelpCircle,
    color: 'text-sky-500',
    activeBg: 'bg-sky-500/10 border-sky-500/50 text-sky-600 dark:text-sky-400',
  },
  {
    value: 'task',
    label: 'Task',
    desc: 'General maintenance or operational request',
    icon: CheckSquare,
    color: 'text-emerald-500',
    activeBg: 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
  },
]

const priorityOptions = [
  { value: 'low', label: 'Low', dotColor: 'bg-emerald-500', badgeColor: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'medium', label: 'Medium', dotColor: 'bg-sky-500', badgeColor: 'text-sky-600 dark:text-sky-400' },
  { value: 'high', label: 'High', dotColor: 'bg-amber-500', badgeColor: 'text-amber-600 dark:text-amber-400' },
  { value: 'critical', label: 'Critical', dotColor: 'bg-rose-500', badgeColor: 'text-rose-600 dark:text-rose-400' },
]

function triggerFileInput() {
  fileInputRef.value?.click()
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function addFiles(files: FileList | File[]) {
  const maxFiles = 10
  const maxSizeBytes = 10 * 1024 * 1024 // 10MB
  const fileArray = Array.from(files)

  for (const file of fileArray) {
    if (attachedFiles.value.length >= maxFiles) {
      toastStore.warning('File Limit', `Maximum ${maxFiles} attachments allowed per ticket.`)
      break
    }
    if (file.size > maxSizeBytes) {
      toastStore.error('File Too Large', `"${file.name}" exceeds the 10MB limit.`)
      continue
    }

    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.scr', '.pif', '.com']
    if (dangerousExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      toastStore.error('Restricted File', `Executable files like "${file.name}" are not permitted.`)
      continue
    }

    if (attachedFiles.value.some((item) => item.name === file.name && item.size === file.size)) {
      continue
    }

    let previewUrl: string | undefined
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file)
    }

    attachedFiles.value.push({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
    })
  }

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function handleFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    addFiles(target.files)
  }
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    addFiles(e.dataTransfer.files)
  }
}

function removeFile(index: number) {
  const removed = attachedFiles.value.splice(index, 1)[0]
  if (removed?.previewUrl) {
    URL.revokeObjectURL(removed.previewUrl)
  }
}

function getFileIcon(mime: string, name: string) {
  if (mime.includes('pdf')) return FileText
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  if (mime.includes('javascript') || mime.includes('json') || name.endsWith('.ts')) return FileCode
  return FileIcon
}

function copyTicketKey(key: string) {
  navigator.clipboard.writeText(key)
  isKeyCopied.value = true
  toastStore.success('Copied', `Ticket key ${key} copied to clipboard`)
  setTimeout(() => {
    isKeyCopied.value = false
  }, 2000)
}

async function handleSubmit() {
  if (!form.title.trim()) {
    errorMessage.value = 'Please provide a ticket title or brief subject.'
    return
  }
  if (!form.reporter_name.trim()) {
    errorMessage.value = 'Please provide your full name.'
    return
  }
  if (!form.reporter_email.trim()) {
    errorMessage.value = 'Please provide a valid email address.'
    return
  }

  errorMessage.value = null
  isSubmitting.value = true

  try {
    const formData = new FormData()
    formData.append('title', form.title.trim())
    if (form.description.trim()) {
      formData.append('description', form.description.trim())
      formData.append('descritpion', form.description.trim())
    }
    formData.append('type', form.type)
    formData.append('priority', form.priority)
    formData.append('reporter_name', form.reporter_name.trim())
    formData.append('reporter_email', form.reporter_email.trim())
    if (form.reporter_phone.trim()) {
      formData.append('reporter_phone', form.reporter_phone.trim())
    }

    // Attach raw files
    attachedFiles.value.forEach((item) => {
      formData.append('files[]', item.file)
    })

    const res = await ticketApi.submitClientTicket(formData)
    const created = (res as any).data || res
    submittedTicket.value = created
    toastStore.success('Ticket Submitted', `Ticket #${created.ticket_key || created.id} created successfully!`)
  } catch (err: any) {
    console.error('Failed to submit client ticket:', err)
    const msg =
      err.response?.data?.message || err.message || 'Failed to submit ticket. Please check your network and try again.'
    errorMessage.value = msg
    toastStore.error('Submission Failed', msg)
  } finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.type = 'bug'
  form.priority = 'high'
  form.reporter_name = ''
  form.reporter_email = ''
  form.reporter_phone = ''
  attachedFiles.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
  attachedFiles.value = []
  submittedTicket.value = null
  errorMessage.value = null
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-indigo-500/20 selection:text-indigo-600">
    <!-- Modern Sleek Header -->
    <header class="h-16 px-4 sm:px-6 lg:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-md shadow-indigo-600/20 ring-1 ring-white/20">
          <Ticket class="w-4 h-4 text-white -rotate-6" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Bronx Support
            </span>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
              Client Portal
            </span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Direct ticketing queue connected to engineering
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <!-- Live System Status Indicator -->
        <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Systems Operational</span>
        </div>

        <!-- Theme Toggle -->
        <button
          @click="themeStore.toggleTheme"
          class="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          :title="themeStore.isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <Sun v-if="themeStore.isDark" class="w-4 h-4 text-amber-400" />
          <Moon v-else class="w-4 h-4 text-indigo-600" />
        </button>

        <!-- Staff Board Link -->
        <router-link
          to="/tickets"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
        >
          <span>Staff Board</span>
          <ExternalLink class="w-3.5 h-3.5" />
        </router-link>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <!-- Success State (After Submission) -->
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
      >
        <div
          v-if="submittedTicket"
          class="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xl max-w-xl mx-auto text-center"
        >
          <div class="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 class="w-7 h-7" />
          </div>

          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Ticket Submitted Successfully
          </h2>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
            Thank you, <span class="font-semibold text-slate-900 dark:text-white">{{ form.reporter_name || 'Client' }}</span>. Your request has been queued in our Helpdesk. You will receive progress updates directly.
          </p>

          <!-- Ticket Key Pill -->
          <div class="flex items-center justify-center gap-2 mb-6">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold">
              <span>{{ submittedTicket.ticket_key || 'TCK-' + submittedTicket.id }}</span>
              <button
                @click="copyTicketKey(submittedTicket.ticket_key || 'TCK-' + submittedTicket.id)"
                class="hover:text-indigo-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy Ticket Key"
              >
                <Check v-if="isKeyCopied" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
              </button>
            </div>
          </div>

          <!-- Ticket Details Card -->
          <div class="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 text-left text-xs space-y-2.5 mb-8">
            <div class="flex justify-between items-start gap-4">
              <span class="text-slate-500 dark:text-slate-400 shrink-0">Subject:</span>
              <span class="font-semibold text-slate-900 dark:text-white text-right truncate">{{ submittedTicket.title }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500 dark:text-slate-400">Type / Priority:</span>
              <div class="flex items-center gap-2">
                <span class="font-semibold uppercase text-indigo-600 dark:text-indigo-400 text-[11px]">{{ submittedTicket.type }}</span>
                <span class="text-slate-300 dark:text-slate-700">•</span>
                <span class="font-semibold uppercase text-slate-700 dark:text-slate-300 text-[11px]">{{ submittedTicket.priority }}</span>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500 dark:text-slate-400">Reporter:</span>
              <span class="font-medium text-slate-900 dark:text-white truncate">{{ form.reporter_email }}</span>
            </div>
            <div v-if="attachedFiles.length > 0" class="flex justify-between items-center">
              <span class="text-slate-500 dark:text-slate-400">Attachments:</span>
              <span class="text-slate-700 dark:text-slate-300 font-medium">{{ attachedFiles.length }} file(s) attached</span>
            </div>
            <div class="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
              <span class="text-slate-500 dark:text-slate-400">Queue Status:</span>
              <span class="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Open (Triage Queue)
              </span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              @click="resetForm"
              class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Submit Another Ticket</span>
            </button>
            <router-link
              to="/tickets"
              class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <span>Go to Staff Board</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </router-link>
          </div>
        </div>
      </transition>

      <!-- Active Ticket Submission Form -->
      <div v-if="!submittedTicket" class="space-y-6">
        <!-- Hero Header -->
        <div class="text-center sm:text-left">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-medium mb-3">
            <Sparkle class="w-3.5 h-3.5 text-indigo-500" />
            <span>Public Client Support Desk</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Submit a Support Ticket
          </h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Report an issue, request an enhancement, or ask a question. Submissions route immediately into our active triage queue.
          </p>
        </div>

        <!-- Global Error Alert -->
        <div
          v-if="errorMessage"
          class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start justify-between gap-3 animate-shake"
        >
          <div class="flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div>
              <p class="font-bold">Submission Error</p>
              <p class="mt-0.5 leading-relaxed">{{ errorMessage }}</p>
            </div>
          </div>
          <button
            @click="errorMessage = null"
            class="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 text-base font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        <!-- 2-Column Responsive Form Layout -->
        <form @submit.prevent="handleSubmit" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Main Form Column (8 cols) -->
          <div class="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <!-- Ticket Title -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Subject / Title <span class="text-rose-500">*</span>
              </label>
              <input
                v-model="form.title"
                type="text"
                required
                placeholder="e.g. Fix issue on Dashboard UI"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <!-- Issue Type -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Issue Type
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  v-for="t in typeOptions"
                  :key="t.value"
                  type="button"
                  @click="form.type = t.value as any"
                  class="p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between"
                  :class="[
                    form.type === t.value
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700',
                  ]"
                >
                  <div class="flex items-center justify-between mb-2">
                    <component :is="t.icon" class="w-4 h-4" :class="t.color" />
                    <span
                      v-if="form.type === t.value"
                      class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                    ></span>
                  </div>
                  <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {{ t.label }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Severity / Priority -->
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                Priority
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  v-for="p in priorityOptions"
                  :key="p.value"
                  type="button"
                  @click="form.priority = p.value as any"
                  class="p-2.5 rounded-xl border text-center flex items-center justify-center gap-2 transition-all cursor-pointer"
                  :class="[
                    form.priority === p.value
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-bold shadow-xs'
                      : 'bg-slate-50/80 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300',
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="p.dotColor"></span>
                  <span class="text-xs">{{ p.label }}</span>
                </button>
              </div>
            </div>

            <!-- Description -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Description & Details
                </label>
                <span class="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Rich text enabled</span>
              </div>
              <HtmlDescriptionEditor
                v-model="form.description"
                placeholder="Describe what happened, error messages, steps to reproduce, or requirements..."
                min-height="180px"
              />
            </div>

            <!-- File Attachments Dropzone -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Attachments & Screenshots
                </label>
                <span class="text-[11px] text-slate-400 font-mono">
                  {{ attachedFiles.length }}/10 files
                </span>
              </div>

              <!-- Drag Drop Area -->
              <div
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
                @click="triggerFileInput"
                class="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all"
                :class="[
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50/80 dark:hover:bg-slate-950/40',
                ]"
              >
                <input
                  ref="fileInputRef"
                  type="file"
                  multiple
                  class="hidden"
                  @change="handleFileInputChange"
                />
                <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2">
                  <UploadCloud class="w-5 h-5" />
                </div>
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to upload or drag & drop files
                </p>
                <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  PNG, JPG, PDF, DOCX, TXT up to 10MB each (max 10 attachments)
                </p>
              </div>

              <!-- Uploaded Files Preview List -->
              <div v-if="attachedFiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                <div
                  v-for="(f, idx) in attachedFiles"
                  :key="f.id"
                  class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <img
                      v-if="f.previewUrl"
                      :src="f.previewUrl"
                      class="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div
                      v-else
                      class="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0"
                    >
                      <component :is="getFileIcon(f.type, f.name)" class="w-4 h-4 text-slate-500" />
                    </div>
                    <div class="truncate">
                      <p class="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {{ f.name }}
                      </p>
                      <p class="text-[10px] text-slate-400 font-mono">{{ formatFileSize(f.size) }}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    @click="removeFile(idx)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                    title="Remove File"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar Column (4 cols) -->
          <div class="lg:col-span-4 space-y-6">
            <!-- Reporter Contact Information Card -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Reporter Information
                </h3>
                <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  How our support team can follow up with you
                </p>
              </div>

              <!-- Name -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <User class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="form.reporter_name"
                    type="text"
                    required
                    placeholder="e.g. menglang"
                    class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Work Email <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <Mail class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="form.reporter_email"
                    type="email"
                    required
                    placeholder="e.g. menglanghuo@gmail.com"
                    class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <!-- Phone -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <span class="text-[11px] text-slate-400">Optional</span>
                </div>
                <div class="relative">
                  <Phone class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    v-model="form.reporter_phone"
                    type="tel"
                    placeholder="e.g. 099191919"
                    class="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <!-- Submit Action & Security Card -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <!-- Security Badge -->
              <div class="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2.5">
                <ShieldCheck class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div class="text-[11px] leading-tight">
                  <p class="font-bold text-slate-900 dark:text-white">Secure Client Channel</p>
                  <p class="text-slate-500 dark:text-slate-400 mt-0.5">Authenticated via client credentials</p>
                </div>
              </div>

              <!-- Primary Submit Button -->
              <button
                type="submit"
                :disabled="isSubmitting"
                class="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  v-if="isSubmitting"
                  class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                ></span>
                <Send v-else class="w-4 h-4" />
                <span>{{ isSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket' }}</span>
              </button>

              <!-- Reset Form Button -->
              <button
                type="button"
                @click="resetForm"
                :disabled="isSubmitting"
                class="w-full py-2 px-3 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer text-center"
              >
                Clear form fields
              </button>

              <!-- SLA Guarantee -->
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>⚡ Triage response</span>
                <span class="font-medium text-slate-700 dark:text-slate-300">&lt; 2 hours for High</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
