<script setup lang="ts">
import HtmlDescriptionEditor from '@/components/common/HtmlDescriptionEditor.vue'
import HtmlDescriptionViewer from '@/components/common/HtmlDescriptionViewer.vue'
import { useAuthStore } from '@/stores/authStore'
import { useTicketStore } from '@/stores/ticketStore'
import { useToastStore } from '@/stores/toastStore'
import type { TicketStatus } from '@/types/ticket'
import { safeUrl } from '@/utils/security'
import { getSourceCategory, getTicketCompany, getTicketSource } from '@/utils/ticket'
import {
  Building,
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  Download,
  Edit3,
  FileText,
  Globe,
  Info,
  Mail,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Paperclip,
  Phone,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UploadCloud,
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

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDraggingFile = ref(false)
const previewImage = ref<string | null>(null)
const hasCopiedKey = ref(false)
const hasCopiedEmail = ref(false)
const hasCopiedPhone = ref(false)
const hasCopiedCompany = ref(false)

// Inline ticket title & description editing state
const isEditingTicket = ref(false)
const editTitle = ref('')
const editDescription = ref('')

function startEditTicket() {
  if (!ticket.value) return
  editTitle.value = ticket.value.title || ''
  editDescription.value = ticket.value.description || ''
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
  },
)

watch(
  () => ticketStore.isDrawerOpen,
  (isOpen) => {
    if (!isOpen) {
      cancelEditTicket()
    }
  },
)
const ticketCompany = computed(() => getTicketCompany(ticket.value))
const ticketSource = computed(() => getTicketSource(ticket.value))
const sourceCategory = computed(() => getSourceCategory(ticketSource.value))

const reporterPhone = computed(() => {
  if (!ticket.value) return ''
  return (
    ticket.value.reporter_phone || ticket.value.metadata?.reporter_phone || ticket.value.phone || ''
  )
})

const drawerPlacementClasses = computed(() => {
  const pos = ticketStore.drawerPosition || 'right'
  const isOpen = ticketStore.isDrawerOpen

  switch (pos) {
    case 'left':
      return {
        wrapper: 'inset-y-0 left-0 w-full max-w-2xl sm:max-w-3xl border-r shadow-2xl',
        transform: isOpen ? 'translate-x-0' : '-translate-x-full',
      }
    case 'top':
      return {
        wrapper: 'inset-x-0 top-0 w-full h-[88vh] max-h-[88vh] border-b rounded-b-3xl shadow-2xl',
        transform: isOpen ? 'translate-y-0' : '-translate-y-full',
      }
    case 'bottom':
      return {
        wrapper:
          'inset-x-0 bottom-0 w-full h-[88vh] max-h-[88vh] border-t rounded-t-3xl shadow-2xl',
        transform: isOpen ? 'translate-y-0' : 'translate-y-full',
      }
    case 'right':
      return {
        wrapper: 'inset-y-0 right-0 w-full max-w-[700px] sm:max-w-3xl border-l shadow-2xl',
        transform: isOpen ? 'translate-x-0' : 'translate-x-full',
      }
    default:
      return {
        wrapper: 'inset-y-0 right-0 w-full max-w-[700px] sm:max-w-3xl border-l shadow-2xl',
        transform: isOpen ? 'translate-x-0' : 'translate-x-full',
      }
  }
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

async function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0 || !ticket.value) return

  const filesArray = Array.from(target.files)
  await ticketStore.uploadAttachments(ticket.value.id, filesArray)
  target.value = ''
}

async function onDropFiles(event: DragEvent) {
  isDraggingFile.value = false
  if (!event.dataTransfer?.files || event.dataTransfer.files.length === 0 || !ticket.value) return

  const filesArray = Array.from(event.dataTransfer.files)
  await ticketStore.uploadAttachments(ticket.value.id, filesArray)
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
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

function onKeydown(e: KeyboardEvent) {
  if (isEditingTicket.value) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      saveEditTicket()
      return
    }
  }
  if (e.key === 'Escape' && ticketStore.isDrawerOpen && !previewImage.value) {
    if (isEditingTicket.value) {
      cancelEditTicket()
      return
    }
    ticketStore.closeTicketDrawer()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div>
    <!-- Drawer Overlay Backdrop -->
    <div
      v-if="ticketStore.isDrawerOpen"
      @click="ticketStore.closeTicketDrawer"
      class="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-40 transition-opacity"
    ></div>

    <!-- Multi-directional Drawer Panel -->
    <div
      class="fixed z-50 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out select-text ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
      :class="[drawerPlacementClasses.wrapper, drawerPlacementClasses.transform]"
    >
      <div v-if="ticket" class="flex-1 flex flex-col h-full overflow-hidden">
        <!-- Drawer Header -->
        <div
          class="px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 shrink-0"
        >
          <!-- Left: Key & Interactive Status & Priority Dropdowns -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Ticket Key Pill with Copy -->
            <div
              class="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <span class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {{ ticket.ticket_key }}
              </span>
              <button
                type="button"
                @click="copyTicketKey(ticket.ticket_key)"
                class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer p-0.5"
                :title="hasCopiedKey ? 'Copied!' : 'Copy ticket key'"
              >
                <Check v-if="hasCopiedKey" class="w-3.5 h-3.5 text-emerald-500" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Custom Status Dropdown -->
            <StatusDropdown
              :model-value="ticket.status"
              :disabled="authStore.isReadOnly"
              size="sm"
              @change="handleStatusChange"
            />

            <!-- View-Only Priority Badge -->
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider select-none shadow-2xs"
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

          <!-- Right: Drawer Placement Switcher, Refresh, Delete, Close -->
          <div class="flex items-center gap-1.5">
            <!-- Drawer Dock Placement Switcher (Left, Top, Bottom, Right) -->
            <div
              class="flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700/60"
              title="Drawer dock placement"
            >
              <button
                type="button"
                @click="ticketStore.setDrawerPosition('left')"
                class="p-1 rounded-lg transition-all cursor-pointer"
                :class="
                  ticketStore.drawerPosition === 'left'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                "
                title="Dock Left"
              >
                <PanelLeft class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                @click="ticketStore.setDrawerPosition('top')"
                class="p-1 rounded-lg transition-all cursor-pointer"
                :class="
                  ticketStore.drawerPosition === 'top'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                "
                title="Dock Top"
              >
                <PanelTop class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                @click="ticketStore.setDrawerPosition('bottom')"
                class="p-1 rounded-lg transition-all cursor-pointer"
                :class="
                  ticketStore.drawerPosition === 'bottom'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                "
                title="Dock Bottom"
              >
                <PanelBottom class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                @click="ticketStore.setDrawerPosition('right')"
                class="p-1 rounded-lg transition-all cursor-pointer"
                :class="
                  ticketStore.drawerPosition === 'right'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                "
                title="Dock Right (Default)"
              >
                <PanelRight class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Refresh Live Data from API -->
            <button
              type="button"
              @click="ticketStore.refreshSelectedTicket"
              :disabled="ticketStore.isDrawerLoading"
              title="Refresh live ticket data"
              class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': ticketStore.isDrawerLoading }" />
            </button>

            <!-- Delete Button (HQ Admin Only) -->
            <button
              v-if="authStore.canDeleteTicket"
              type="button"
              @click="ticketStore.deleteTicket(ticket.id)"
              title="Delete Ticket"
              class="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 class="w-4 h-4" />
            </button>

            <!-- Close Drawer button -->
            <button
              type="button"
              @click="ticketStore.closeTicketDrawer"
              title="Close drawer (Esc)"
              class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Live Sync Progress Indicator -->
        <div
          v-if="ticketStore.isDrawerLoading"
          class="h-0.5 w-full bg-indigo-500/20 overflow-hidden shrink-0"
        >
          <div class="h-full bg-indigo-500 w-1/2 animate-pulse"></div>
        </div>

        <!-- Drawer Body (Scrollable) -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          <!-- Hero Section: Title & Classification Strip -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <div class="flex flex-wrap items-center gap-2 mb-2.5">
              <!-- Type Badge -->
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
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
                {{ ticket.type }}
              </span>

              <!-- Submitted Timestamp -->
              <span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 text-slate-400" />
                Submitted {{ formatDate(ticket.created_at) }}
              </span>

              <span class="text-slate-300 dark:text-slate-700">•</span>

              <!-- Company Pill -->
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/50 shadow-2xs"
                :title="`Company: ${ticketCompany}`"
              >
                <Building2 class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{{ ticketCompany }}</span>
              </span>

              <span class="text-slate-300 dark:text-slate-700">•</span>

              <!-- Source Pill -->
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border shadow-2xs"
                :class="{
                  'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50':
                    sourceCategory === 'hq',
                  'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50':
                    sourceCategory === 'branch',
                  'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60':
                    sourceCategory === 'other',
                }"
                :title="`Source: ${ticketSource}`"
              >
                <ShieldCheck
                  v-if="sourceCategory === 'hq'"
                  class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"
                />
                <Building
                  v-else-if="sourceCategory === 'branch'"
                  class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400"
                />
                <Globe v-else class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{{ ticketSource }}</span>
              </span>
            </div>

            <!-- View Mode: Title & Edit Button -->
            <div
              v-if="!isEditingTicket"
              class="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
            >
              <h2
                class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug flex-1"
              >
                {{ ticket.title }}
              </h2>
              <button
                v-if="!authStore.isReadOnly"
                type="button"
                @click="startEditTicket"
                class="inline-flex items-center gap-2 px-2.5 py-2 rounded-sm text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800/80 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
                title="Edit title, description, and record change audit"
              >
                <Edit3 class="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>Edit Ticket</span>
              </button>
            </div>

            <!-- Edit Mode: Title input form -->
            <div v-else class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <label
                  class="block text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                  <span>Edit Ticket Title</span>
                  <span class="text-rose-500">*</span>
                </label>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-mono text-slate-400 mr-1">
                    {{ editTitle.length }} / 500
                  </span>
                  <button
                    type="button"
                    @click="cancelEditTicket"
                    :disabled="ticketStore.isSavingTicketEdit"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  >
                    <X class="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    @click="saveEditTicket"
                    :disabled="ticketStore.isSavingTicketEdit || !editTitle.trim()"
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span
                      v-if="ticketStore.isSavingTicketEdit"
                      class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                    ></span>
                    <Check v-else class="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
              <input
                v-model="editTitle"
                type="text"
                maxlength="500"
                placeholder="Enter ticket title..."
                class="w-full text-base sm:text-lg font-bold px-3.5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                @keydown.enter.prevent="saveEditTicket"
                @keydown.esc="cancelEditTicket"
              />
            </div>
          </div>

          <!-- Description Section (HTML Rendered / RichText Editor) -->
          <HtmlDescriptionViewer
            v-if="!isEditingTicket"
            :content="ticket.description"
            empty-text="No description provided for this ticket."
          />
          <div v-else class="space-y-3">
            <div class="flex items-center justify-between">
              <label
                class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
              >
                <span>Description & Details</span>
              </label>
              <span class="text-[11px] text-slate-400 font-medium">
                Supports rich text formatting, lists, code, and HTML mode
              </span>
            </div>
            <HtmlDescriptionEditor
              v-model="editDescription"
              placeholder="Provide accurate, polished description or reproduction steps..."
              min-height="260px"
            />
            <!-- Bottom Helper & Quick Action Footer -->
            <div
              class="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"
            >
              <div class="flex items-center gap-2">
                <Info class="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Changes will be recorded in the ticket audit history.</span>
              </div>
            </div>
          </div>

          <!-- Submitter Details Card -->
          <div
            class="bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80"
          >
            <h4
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 flex items-center gap-2"
            >
              <User class="w-4 h-4 text-slate-600 dark:text-indigo-400" />
              <span>Submitter Information</span>
            </h4>

            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <!-- Submitter Identity -->
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-slate-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 shrink-0"
                >
                  {{ (ticket.reporter_name || 'U').charAt(0).toUpperCase() }}
                </div>
                <div>
                  <h5 class="text-sm font-bold text-slate-900 dark:text-white">
                    {{ ticket.reporter_name || 'Anonymous User' }}
                  </h5>
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    Ticket Author • {{ ticketCompany }}
                  </span>
                </div>
              </div>

              <!-- Contact & Origin Channels -->
              <div class="flex flex-wrap items-center gap-2">
                <!-- Company Pill with Copy -->
                <div
                  class="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs shadow-2xs"
                >
                  <Building2 class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span
                    class="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]"
                    :title="ticketCompany"
                  >
                    {{ ticketCompany }}
                  </span>
                  <button
                    type="button"
                    @click="copyText(ticketCompany, 'company')"
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer ml-0.5 transition-colors"
                    :title="hasCopiedCompany ? 'Company Copied!' : 'Copy Company'"
                  >
                    <Check v-if="hasCopiedCompany" class="w-3 h-3 text-emerald-500" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>

                <!-- Source Badge -->
                <div
                  class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide border shadow-2xs"
                  :class="{
                    'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50':
                      sourceCategory === 'hq',
                    'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50':
                      sourceCategory === 'branch',
                    'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60':
                      sourceCategory === 'other',
                  }"
                  :title="`Source: ${ticketSource}`"
                >
                  <ShieldCheck
                    v-if="sourceCategory === 'hq'"
                    class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0"
                  />
                  <Building
                    v-else-if="sourceCategory === 'branch'"
                    class="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0"
                  />
                  <Globe v-else class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{{ ticketSource }}</span>
                </div>

                <!-- Email link -->
                <div
                  v-if="ticket.reporter_email"
                  class="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs"
                >
                  <a
                    :href="`mailto:${ticket.reporter_email}`"
                    class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1.5 font-medium hover:underline truncate max-w-[180px]"
                    :title="ticket.reporter_email"
                  >
                    <Mail class="w-3.5 h-3.5 shrink-0" />
                    <span class="truncate">{{ ticket.reporter_email }}</span>
                  </a>
                  <button
                    type="button"
                    @click="copyText(ticket.reporter_email, 'email')"
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer ml-1"
                    :title="hasCopiedEmail ? 'Email Copied!' : 'Copy Email'"
                  >
                    <Check v-if="hasCopiedEmail" class="w-3 h-3 text-emerald-500" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>

                <!-- Phone link -->
                <div
                  v-if="reporterPhone"
                  class="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs"
                >
                  <a
                    :href="`tel:${reporterPhone}`"
                    class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1.5 font-medium hover:underline truncate"
                    :title="reporterPhone"
                  >
                    <Phone class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ reporterPhone }}</span>
                  </a>
                  <button
                    type="button"
                    @click="copyText(reporterPhone, 'phone')"
                    class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer ml-1"
                    :title="hasCopiedPhone ? 'Phone Copied!' : 'Copy Phone'"
                  >
                    <Check v-if="hasCopiedPhone" class="w-3 h-3 text-emerald-500" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>

                <span
                  v-if="!ticket.reporter_email && !reporterPhone"
                  class="text-xs text-slate-400"
                >
                  No contact info available
                </span>
              </div>
            </div>
          </div>

          <!-- Attachments Gallery -->
          <div
            class="bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80"
          >
            <div class="flex items-center justify-between mb-3">
              <h4
                class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2"
              >
                <Paperclip class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Attachments ({{ ticket.attachments?.length || 0 }})</span>
              </h4>
              <button
                v-if="!authStore.isReadOnly"
                type="button"
                @click="fileInputRef?.click()"
                class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <UploadCloud class="w-3.5 h-3.5" />
                <span>Add files</span>
              </button>
              <input
                ref="fileInputRef"
                type="file"
                multiple
                class="hidden"
                @change="onFileSelect"
              />
            </div>

            <!-- Drag-and-drop upload zone -->
            <div
              v-if="!authStore.isReadOnly"
              @dragover.prevent="isDraggingFile = true"
              @dragleave="isDraggingFile = false"
              @drop="onDropFiles"
              @click="fileInputRef?.click()"
              class="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors mb-4"
              :class="
                isDraggingFile
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/50'
              "
            >
              <UploadCloud class="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p class="text-xs font-medium text-slate-700 dark:text-slate-300">
                Click to browse or drop files to attach
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Supports PNG, JPG, PDF, CSV, logs up to 10MB
              </p>
            </div>

            <!-- Attachments List / Grid -->
            <div
              v-if="ticket.attachments && ticket.attachments.length > 0"
              class="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div
                v-for="file in ticket.attachments"
                :key="file.id"
                class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <!-- Thumbnail if image -->
                  <div
                    v-if="file.mime_type.startsWith('image/')"
                    @click="previewImage = file.file_url"
                    class="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-950 cursor-pointer relative group/thumb border border-slate-200 dark:border-slate-800"
                  >
                    <img
                      :src="file.file_url"
                      :alt="file.file_name"
                      class="w-full h-full object-cover"
                    />
                    <div
                      class="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <ZoomIn class="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <!-- Document icon if non-image -->
                  <div
                    v-else
                    class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200 dark:border-slate-700/60"
                  >
                    <FileText class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  <div class="truncate">
                    <p
                      class="text-xs font-medium text-slate-800 dark:text-slate-200 truncate"
                      :title="file.file_name"
                    >
                      {{ file.file_name }}
                    </p>
                    <span class="text-[10px] text-slate-500 dark:text-slate-400">
                      {{ formatFileSize(file.file_size) }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <a
                    :href="safeUrl(file.file_url)"
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Download"
                  >
                    <Download class="w-3.5 h-3.5" />
                  </a>
                  <button
                    v-if="!authStore.isReadOnly"
                    type="button"
                    @click="ticketStore.deleteAttachment(ticket.id, file.id)"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete attachment"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="text-xs text-slate-500 dark:text-slate-400 text-center py-2">
              No files currently attached to this ticket.
            </div>
          </div>

          <!-- Comments, Discussion & Audit Trail Section -->
          <TicketCommentsSection :ticket="ticket" @preview-image="previewImage = $event" />

          <!-- Activity & SLA Timeline -->
          <div
            class="bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80"
          >
            <h4
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3.5 flex items-center gap-2"
            >
              <Clock class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>SLA Timestamps & Activity Timeline</span>
            </h4>

            <div
              class="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800"
            >
              <!-- Event 1: Creation -->
              <div class="relative">
                <div
                  class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-950"
                ></div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Ticket Created
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ formatDate(ticket.created_at) }}
                </div>
              </div>

              <!-- Event 2: First response -->
              <div v-if="ticket.first_response_at" class="relative">
                <div
                  class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-950"
                ></div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  First Staff Response (SLA Recorded)
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ formatDate(ticket.first_response_at) }}
                </div>
              </div>

              <!-- Event 3: Resolved -->
              <div v-if="ticket.resolved_at" class="relative">
                <div
                  class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950"
                ></div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Resolved by Support Team
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ formatDate(ticket.resolved_at) }}
                </div>
              </div>

              <!-- Event 4: Closed -->
              <div v-if="ticket.closed_at" class="relative">
                <div
                  class="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-slate-600 border-2 border-white dark:border-slate-950"
                ></div>
                <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Ticket Closed & Archived
                </div>
                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                  {{ formatDate(ticket.closed_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
