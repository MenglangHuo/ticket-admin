<script setup lang="ts">
import HtmlDescriptionEditor from '@/components/common/HtmlDescriptionEditor.vue'
import HtmlDescriptionViewer from '@/components/common/HtmlDescriptionViewer.vue'
import ModernModal from '@/components/common/ModernModal.vue'
import { useAuthStore } from '@/stores/authStore'
import { useTicketStore } from '@/stores/ticketStore'
import { useToastStore } from '@/stores/toastStore'
import type { TicketStatus } from '@/types/ticket'
import { safeUrl } from '@/utils/security'
import { getTicketCompany, getTicketSource } from '@/utils/ticket'
import {
  Bug,
  Building2,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Edit3,
  FileText,
  HelpCircle,
  Info,
  Mail,
  Phone,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  X,
  ZoomIn,
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import StatusDropdown from './StatusDropdown.vue'
import EditTicketModal from './EditTicketModal.vue'
import TicketCommentsSection from './TicketCommentsSection.vue'

const ticketStore = useTicketStore()
const authStore = useAuthStore()
const toastStore = useToastStore()

const previewImage = ref<string | null>(null)
const hasCopiedKey = ref(false)
const hasCopiedEmail = ref(false)
const hasCopiedPhone = ref(false)
const hasCopiedCompany = ref(false)

// Discussion stream maximize state (collapses pinned header to 1-line bar to maximize comment area)
const isCommentsMaximized = ref(false)

// Inline ticket title & description editing state
const isEditingTicket = ref(false)
const editTitle = ref('')
const editDescription = ref('')

function startEditTicket() {
  if (!ticket.value) return
  editTitle.value = ticket.value.title || ''
  editDescription.value = ticket.value.description || ''
  isCommentsMaximized.value = false
  isEditingTicket.value = true
}

function cancelEditTicket() {
  isEditingTicket.value = false
  if (ticket.value) {
    editTitle.value = ticket.value.title || ''
    editDescription.value = ticket.value.description || ''
  } else {
    editTitle.value = ''
    editDescription.value = ''
  }
}

async function saveEditTicket() {
  if (!ticket.value) return
  if (!editTitle.value.trim()) {
    toastStore.warning('Title Required', 'Ticket title cannot be empty.')
    return
  }

  const currentTitle = ticket.value.title || ''
  const currentDesc = ticket.value.description || ''
  const hasChanged =
    editTitle.value.trim() !== currentTitle.trim() ||
    editDescription.value.trim() !== (currentDesc || '').trim()

  if (!hasChanged) {
    toastStore.info('No Changes', 'No changes were made.')
    isEditingTicket.value = false
    return
  }

  const success = await ticketStore.updateTicketDetails(ticket.value.id, {
    title: editTitle.value.trim(),
    description: editDescription.value.trim(),
  })

  if (success) {
    isEditingTicket.value = false
  }
}

const ticket = computed(() => ticketStore.selectedTicket)

watch(
  () => ticket.value?.id,
  () => {
    cancelEditTicket()
    isCommentsMaximized.value = false
  },
)

watch(
  () => ticketStore.isDrawerOpen,
  (isOpen) => {
    if (!isOpen) {
      cancelEditTicket()
      isCommentsMaximized.value = false
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (!isEditingTicket.value) return
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    saveEditTicket()
  } else if (e.key === 'Escape') {
    cancelEditTicket()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

const notes = computed(() => ticketStore.comments || [])

const ticketCompany = computed(() => getTicketCompany(ticket.value))
const ticketSource = computed(() => getTicketSource(ticket.value))

const reporterPhone = computed(() => {
  if (!ticket.value) return ''
  return (
    ticket.value.reporter_phone || ticket.value.metadata?.reporter_phone || ticket.value.phone || ''
  )
})

async function handleStatusChange(newStatus: TicketStatus) {
  if (!ticket.value) return
  await ticketStore.transitionTicketStatus(ticket.value.id, newStatus)
}

async function copyTicketKey(key: string) {
  try {
    await navigator.clipboard.writeText(key)
    hasCopiedKey.value = true
    setTimeout(() => {
      hasCopiedKey.value = false
    }, 2000)
  } catch (err) {
    console.warn('Clipboard write failed:', err)
  }
}

async function copyText(text: string, type: 'email' | 'phone' | 'company') {
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'email') {
      hasCopiedEmail.value = true
      setTimeout(() => (hasCopiedEmail.value = false), 2000)
    } else if (type === 'phone') {
      hasCopiedPhone.value = true
      setTimeout(() => (hasCopiedPhone.value = false), 2000)
    } else if (type === 'company') {
      hasCopiedCompany.value = true
      setTimeout(() => (hasCopiedCompany.value = false), 2000)
    }
  } catch (err) {
    console.warn('Clipboard write failed:', err)
  }
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function isImageAttachment(file: {
  mime_type?: string
  file_url?: string
  file_name?: string
}): boolean {
  if (file.mime_type?.startsWith('image/')) return true
  if (file.file_url?.startsWith('data:image/')) return true
  const name = file.file_name || file.file_url || ''
  return Boolean(name.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i))
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Pending'
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <!-- Modern Draggable & Resizable Modal -->
    <ModernModal
      v-model="ticketStore.isDrawerOpen"
      :is-docked-drawer="ticketStore.detailViewMode === 'drawer'"
      :initial-width="1060"
      :initial-height="780"
      :min-width="600"
      :min-height="460"
      @toggle-dock="
        ticketStore.detailViewMode = ticketStore.detailViewMode === 'drawer' ? 'modal' : 'drawer'
      "
      @close="ticketStore.closeTicketDrawer"
    >
      <!-- Custom Header Slot with Ticket Key and Type Badge -->
      <template #header>
        <div v-if="ticket" class="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <!-- Ticket Key Pill with Copy (Enlarged font size for clear visibility) -->
          <div
            class="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <span
              class="text-sm sm:text-base font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-tight"
            >
              {{ ticket.ticket_key }}
            </span>
            <button
              type="button"
              @click="copyTicketKey(ticket.ticket_key)"
              class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5 rounded"
              :title="hasCopiedKey ? 'Copied!' : 'Copy ticket key'"
            >
              <Check v-if="hasCopiedKey" class="w-4 h-4 text-emerald-500" />
              <Copy v-else class="w-4 h-4" />
            </button>
          </div>

          <!-- Created Datetime Badge (Beautiful header timestamp) -->
          <div
            class="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs select-none"
            :title="`Created at: ${formatDate(ticket.created_at)}`"
          >
            <Calendar class="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0" />
            <span class="truncate">{{ formatDate(ticket.created_at) }}</span>
          </div>
        </div>
      </template>

      <!-- Custom Actions inside Header -->
      <template #header-actions>
        <button
          type="button"
          @click="ticketStore.refreshSelectedTicket"
          :disabled="ticketStore.isDrawerLoading"
          title="Refresh ticket & comments"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': ticketStore.isDrawerLoading }" />
        </button>

        <button
          v-if="ticket && authStore.canDeleteTicket"
          type="button"
          @click="ticketStore.deleteTicket(ticket.id)"
          title="Delete Ticket"
          class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </template>

      <!-- Minimized Taskbar Custom Representation -->
      <template #minimized="{ restore, close }">
        <div class="flex items-center gap-3 cursor-pointer" @click="restore">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
            {{ ticket?.ticket_key || 'Ticket' }}
          </span>
          <span
            class="text-xs font-medium text-slate-800 dark:text-slate-200 max-w-[220px] truncate"
          >
            {{ ticket?.title }}
          </span>
          <span
            v-if="notes.length"
            class="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full"
          >
            {{ notes.length }} notes
          </span>
        </div>
        <div class="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
          <button
            type="button"
            @click="restore"
            class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Restore Window"
          >
            <ZoomIn class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            @click="close"
            class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Close"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </template>

      <!-- Main Modal Body: 2-Column Responsive Split -->
      <div
        v-if="ticket"
        class="flex flex-col lg:flex-row h-full min-h-full divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800"
      >
        <!-- LEFT COLUMN: Ticket Content, Pinned Context & Discussion Stream (65%) -->
        <div
          class="flex-1 flex flex-col min-h-0 overflow-hidden lg:h-full bg-white dark:bg-slate-900"
        >
          <!-- Dedicated Edit Workspace Mode (Spacious, full height, distraction-free) -->
          <div
            v-if="isEditingTicket"
            class="flex-1 min-h-0 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden"
          >
            <!-- Sticky Edit Header -->
            <div
              class="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-between gap-3 z-10"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 shrink-0"
                >
                  <Edit3 class="w-4 h-4" />
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-bold text-slate-900 dark:text-white">
                      Edit Ticket Details
                    </h3>
                    <span
                      class="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 shrink-0"
                    >
                      {{ ticket.ticket_key }}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Created {{ formatDate(ticket.created_at) }} • {{ ticketSource }}
                  </p>
                </div>
              </div>

              <!-- Header Action Buttons -->
              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="hidden md:inline-flex items-center text-[11px] text-slate-400 mr-1 select-none"
                >
                  <kbd
                    class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono mr-1"
                    >Esc</kbd
                  >
                  cancel
                </span>
                <button
                  type="button"
                  @click="cancelEditTicket"
                  :disabled="ticketStore.isSavingTicketEdit"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                >
                  <X class="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  @click="saveEditTicket"
                  :disabled="ticketStore.isSavingTicketEdit || !editTitle.trim()"
                  class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-2xs hover:shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span
                    v-if="ticketStore.isSavingTicketEdit"
                    class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                  ></span>
                  <Check v-else class="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>

            <!-- Edit Workspace Form Body: Scrollable & Spacious -->
            <div class="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">
              <!-- Ticket Title Field -->
              <div class="space-y-2">
                <div class="flex items-center justify-between">
                  <label
                    class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <span>Ticket Title</span>
                    <span class="text-rose-500">*</span>
                  </label>
                  <span class="text-[11px] font-mono text-slate-400">
                    {{ editTitle.length }} / 500
                  </span>
                </div>
                <input
                  v-model="editTitle"
                  type="text"
                  maxlength="500"
                  placeholder="Enter ticket title..."
                  class="w-full text-base sm:text-lg font-bold px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                  @keydown.enter.prevent="saveEditTicket"
                  @keydown.esc="cancelEditTicket"
                />
              </div>

              <!-- Ticket Description Field -->
              <div class="space-y-2 flex-1 flex flex-col">
                <div class="flex items-center justify-between">
                  <label
                    class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                  >
                    <span>Description & Details</span>
                  </label>
                  <span class="text-[11px] text-slate-400 font-medium">
                    Supports rich text formatting, lists, code, and HTML mode
                  </span>
                </div>

                <!-- HtmlDescriptionEditor with generous height and full toolbar visibility -->
                <HtmlDescriptionEditor
                  v-model="editDescription"
                  placeholder="Provide accurate, polished description or reproduction steps..."
                  min-height="300px"
                  class="w-full"
                />
              </div>

              <!-- Bottom Helper & Quick Action Footer -->
              <div
                class="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"
              >
                <div class="flex items-center gap-2">
                  <Info class="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Changes will be saved and recorded in the ticket audit history.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Normal Non-Editing Workspace: Pinned Context & Discussion Stream -->
          <template v-else>
            <!-- When isCommentsMaximized is true: Slim 1-line top bar to maximize comments stream -->
            <div
              v-if="isCommentsMaximized"
              class="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-4 py-2.5 flex items-center justify-between gap-3 z-10"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0"
                >
                  {{ ticket.ticket_key }}
                </span>
                <span class="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                <h2
                  class="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate"
                >
                  {{ ticket.title }}
                </h2>
              </div>
            </div>

            <!-- When isCommentsMaximized is false: Normal Context Header: Title, Description & Attachments (45% Height) -->
            <div
              v-else
              class="h-[45%] shrink-0 min-h-0 flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:px-5 sm:py-2 space-y-1 z-10 shadow-2xs overflow-hidden"
            >
              <!-- View Mode: Title & Edit Button -->
              <div class="shrink-0 flex items-start justify-between gap-3">
                <h2
                  class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug flex-1"
                >
                  {{ ticket.title }}
                </h2>
                <button
                  v-if="!authStore.isReadOnly"
                  type="button"
                  @click="startEditTicket"
                  class="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200/90 dark:border-slate-700 hover:border-slate-300 hover:scale-105 duration-200 dark:hover:border-indigo-800/80 hover:text-slate-600 dark:hover:text-indigo-400 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                  title="Edit title, description, and record change audit"
                >
                  <Edit3 class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>Edit Ticket</span>
                </button>
              </div>

              <!-- Scrollable Description Area Only (No attachments inside scroll area) -->
              <div
                class="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin text-xs text-slate-700 dark:text-slate-300"
              >
                <HtmlDescriptionViewer
                  :content="ticket.description"
                  :hide-header="true"
                  :borderless="true"
                  empty-text="No description provided for this ticket."
                />
              </div>

              <!-- Fixed Position Attachments Area (Does NOT scroll with description, pinned at bottom) -->
              <div
                v-if="ticket.attachments && ticket.attachments.length > 0"
                class="shrink-0 pt-1 border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2"
              >
                <template v-for="file in ticket.attachments" :key="file.id">
                  <!-- Image Attachment: Proportional preview card (w-10 h-10) without name -->
                  <div
                    v-if="isImageAttachment(file)"
                    class="group/img relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shadow-2xs hover:shadow-md transition-all duration-200 shrink-0 cursor-pointer"
                    :title="
                      file.file_size
                        ? `Image attachment (${formatFileSize(file.file_size)}) - Click to preview`
                        : 'Click to preview image'
                    "
                    @click="previewImage = file.file_url"
                  >
                    <img
                      :src="file.file_url"
                      :alt="file.file_name || 'Attachment'"
                      class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover/img:scale-105"
                    />

                    <!-- Hover Action Overlay -->
                    <div
                      class="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px] opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-1 text-white transition-opacity duration-150"
                    >
                      <button
                        type="button"
                        @click.stop="previewImage = file.file_url"
                        class="p-0.5 rounded bg-white/20 hover:bg-white/35 text-white transition-colors cursor-pointer"
                        title="Preview image"
                      >
                        <ZoomIn class="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <!-- Non-Image Attachment: Compact pill with name and size -->
                  <div
                    v-else
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-slate-200/80 dark:border-slate-700/80 text-xs shadow-2xs transition-colors group"
                  >
                    <FileText class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span
                      class="max-w-[130px] sm:max-w-[180px] truncate font-medium text-slate-700 dark:text-slate-300"
                      :title="file.file_name"
                    >
                      {{ file.file_name }}
                    </span>
                    <span class="text-[10px] text-slate-400">
                      ({{ formatFileSize(file.file_size) }})
                    </span>
                    <a
                      :href="safeUrl(file.file_url)"
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5 rounded cursor-pointer transition-colors"
                      title="Download"
                    >
                      <Download class="w-3 h-3" />
                    </a>
                  </div>
                </template>
              </div>
            </div>

            <!-- Bottom Independent Activity & Comments Stream (55% Height, or flex-1 when maximized) -->
            <div
              class="min-h-0 flex flex-col overflow-hidden p-3 sm:p-4 bg-slate-50/40 dark:bg-slate-950/20"
              :class="isCommentsMaximized ? 'flex-1' : 'h-[55%] min-h-0 flex-1'"
            >
              <TicketCommentsSection
                :ticket="ticket"
                :is-maximized="isCommentsMaximized"
                @toggle-maximize="isCommentsMaximized = !isCommentsMaximized"
                @preview-image="previewImage = $event"
              />
            </div>
          </template>
        </div>

        <!-- RIGHT COLUMN: Submitter Info & SLA Milestones (35%) -->
        <div
          class="w-full lg:w-80 p-2 sm:p-6 space-y-2 bg-slate-50/50 dark:bg-slate-950/40 shrink-0 overflow-y-auto"
        >
          <!-- Submitter Card -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <h4
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5"
            >
              <User class="w-3.5 h-3.5 text-slate-500" />
              <span>Submitter Information</span>
            </h4>

            <div class="flex items-center gap-3 mb-3">
              <div
                class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-slate-600 dark:text-slate-400 font-bold text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 shrink-0"
              >
                {{ (ticket.reporter_name || 'U').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <h5 class="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {{ ticket.reporter_name || 'Anonymous User' }}
                </h5>
                <span class="text-xs text-slate-500 dark:text-slate-400 truncate block">
                  Ticket Author • {{ ticketCompany }}
                </span>
              </div>
            </div>

            <!-- Company, Email & Phone Channels -->
            <div class="space-y-2 text-xs">
              <!-- Company Row -->
              <div
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <Building2 class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span
                    class="text-slate-800 dark:text-slate-200 font-medium truncate"
                    :title="ticketCompany"
                  >
                    {{ ticketCompany }}
                  </span>
                </div>
                <button
                  type="button"
                  @click="copyText(ticketCompany, 'company')"
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer transition-colors"
                  :title="hasCopiedCompany ? 'Copied!' : 'Copy Company'"
                >
                  <Check v-if="hasCopiedCompany" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Email Row -->
              <div
                v-if="ticket.reporter_email"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <Mail class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <a
                    :href="`mailto:${ticket.reporter_email}`"
                    class="text-slate-600 dark:text-slate -400 truncate max-w-[170px] font-medium hover:underline"
                    :title="ticket.reporter_email"
                  >
                    {{ ticket.reporter_email }}
                  </a>
                </div>
                <button
                  type="button"
                  @click="copyText(ticket.reporter_email, 'email')"
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer transition-colors"
                  :title="hasCopiedEmail ? 'Copied!' : 'Copy Email'"
                >
                  <Check v-if="hasCopiedEmail" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Phone Row -->
              <div
                v-if="reporterPhone"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <Phone class="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <a
                    :href="`tel:${reporterPhone}`"
                    class="text-slate-600 dark:text-slate-400 truncate font-medium hover:underline"
                  >
                    {{ reporterPhone }}
                  </a>
                </div>
                <button
                  type="button"
                  @click="copyText(reporterPhone, 'phone')"
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer transition-colors"
                  :title="hasCopiedPhone ? 'Copied!' : 'Copy Phone'"
                >
                  <Check v-if="hasCopiedPhone" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Ticket Properties Card -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <h4
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5"
            >
              <SlidersHorizontal class="w-3.5 h-3.5 text-indigo-500" />
              <span>Ticket Properties</span>
            </h4>

            <div class="space-y-2 text-xs">
              <!-- Status Row -->
              <div
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300 pl-1"
                  >Status</span
                >
                <StatusDropdown
                  :model-value="ticket.status"
                  :disabled="authStore.isReadOnly"
                  size="sm"
                  placement="right"
                  @change="handleStatusChange"
                />
              </div>

              <!-- Priority Row (View Only) -->
              <div
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300 pl-1"
                  >Priority</span
                >
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider select-none shadow-2xs"
                  :class="{
                    'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30':
                      ticket.priority === 'critical',
                    'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30':
                      ticket.priority === 'high',
                    'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30':
                      ticket.priority === 'medium',
                    'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-700/40':
                      ticket.priority === 'low',
                  }"
                  title="Priority is view-only"
                >
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="{
                      'bg-rose-500 animate-pulse': ticket.priority === 'critical',
                      'bg-amber-500': ticket.priority === 'high',
                      'bg-sky-500': ticket.priority === 'medium',
                      'bg-slate-400': ticket.priority === 'low',
                    }"
                  ></span>
                  <span>{{ ticket.priority }}</span>
                </span>
              </div>

              <!-- Source Row -->
              <div
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <span class="text-xs font-medium text-slate-600 dark:text-slate-300 pl-1"
                  >Type</span
                >
                <!-- Type Badge with Icon -->
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-2xs"
                  :class="{
                    'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30':
                      ticket.type === 'bug',
                    'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30':
                      ticket.type === 'enhancement',
                    'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30':
                      ticket.type === 'question',
                    'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30':
                      ticket.type === 'task',
                  }"
                >
                  <Bug v-if="ticket.type === 'bug'" class="w-3.5 h-3.5" />
                  <Sparkles v-else-if="ticket.type === 'enhancement'" class="w-3.5 h-3.5" />
                  <HelpCircle v-else-if="ticket.type === 'question'" class="w-3.5 h-3.5" />
                  <CheckSquare v-else class="w-3 h-3" />
                  <span>{{ ticket.type }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Activity & SLA Timeline Card -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <h4
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 flex items-center gap-1.5"
            >
              <Clock class="w-3.5 h-3.5 text-indigo-500" />
              <span>SLA & Lifecycle</span>
            </h4>

            <div
              class="relative pl-5 space-y-3.5 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 text-xs"
            >
              <!-- Event 1: Created -->
              <div class="relative">
                <div
                  class="absolute -left-5 top-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900"
                ></div>
                <div class="font-semibold text-slate-800 dark:text-slate-200">Ticket Created</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ formatDate(ticket.created_at) }}
                </div>
              </div>

              <!-- Event 2: First Response -->
              <div class="relative">
                <div
                  class="absolute -left-5 top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900"
                  :class="
                    ticket.first_response_at ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  "
                ></div>
                <div class="font-semibold text-slate-800 dark:text-slate-200">
                  First Staff Response
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{
                    ticket.first_response_at
                      ? formatDate(ticket.first_response_at)
                      : 'Awaiting staff reply'
                  }}
                </div>
              </div>

              <!-- Event 3: Resolved -->
              <div class="relative">
                <div
                  class="absolute -left-5 top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900"
                  :class="ticket.resolved_at ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'"
                ></div>
                <div class="font-semibold text-slate-800 dark:text-slate-200">Resolved</div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ ticket.resolved_at ? formatDate(ticket.resolved_at) : 'In progress' }}
                </div>
              </div>

              <!-- Event 4: Closed -->
              <div v-if="ticket.closed_at" class="relative">
                <div
                  class="absolute -left-5 top-0.5 w-3 h-3 rounded-full bg-slate-600 border-2 border-white dark:border-slate-900"
                ></div>
                <div class="font-semibold text-slate-800 dark:text-slate-200">
                  Closed & Archived
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ formatDate(ticket.closed_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModernModal>

    <!-- Edit Ticket & Record Audit Modal -->
    <EditTicketModal />

    <!-- Image Lightbox Modal -->
    <div
      v-if="previewImage"
      @click="previewImage = null"
      class="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        class="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl"
      >
        <button
          type="button"
          @click="previewImage = null"
          class="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-900 border border-slate-700 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
        <img
          :src="previewImage"
          alt="Preview"
          class="max-h-[85vh] w-auto object-contain rounded-xl"
        />
      </div>
    </div>
  </div>
</template>
