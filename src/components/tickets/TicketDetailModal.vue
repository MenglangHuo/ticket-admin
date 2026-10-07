<script setup lang="ts">
import HtmlDescriptionViewer from '@/components/common/HtmlDescriptionViewer.vue'
import ModernModal from '@/components/common/ModernModal.vue'
import { useAuthStore } from '@/stores/authStore'
import { useTicketStore } from '@/stores/ticketStore'
import { useToastStore } from '@/stores/toastStore'
import type { TicketComment, TicketStatus } from '@/types/ticket'
import { safeUrl } from '@/utils/security'
import {
  Bug,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Edit2,
  FileText,
  HelpCircle,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  User,
  X,
  ZoomIn,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import StatusDropdown from './StatusDropdown.vue'

const ticketStore = useTicketStore()
const authStore = useAuthStore()
const toastStore = useToastStore()

const commentFileInputRef = ref<HTMLInputElement | null>(null)
const previewImage = ref<string | null>(null)
const hasCopiedKey = ref(false)
const hasCopiedEmail = ref(false)
const hasCopiedPhone = ref(false)

// Note composer state
const noteBody = ref('')
const noteFiles = ref<File[]>([])

// Editing note state
const editingNoteId = ref<number | null>(null)
const editNoteBody = ref('')
const isSavingEdit = ref(false)

const ticket = computed(() => ticketStore.selectedTicket)
const notes = computed(() => ticketStore.comments || [])

const reporterPhone = computed(() => {
  if (!ticket.value) return ''
  return (
    ticket.value.reporter_phone ||
    ticket.value.metadata?.reporter_phone ||
    ticket.value.phone ||
    ''
  )
})

// 1 Comment per admin per ticket logic
const userComment = computed<TicketComment | null>(() => {
  if (!notes.value || notes.value.length === 0) return null
  const currentUserId = authStore.user?.id
  if (currentUserId) {
    const found = notes.value.find((c) => c.author?.id === currentUserId)
    if (found) return found
  }
  const currentUserEmail = authStore.user?.email
  if (currentUserEmail) {
    const found = notes.value.find(
      (c) => c.author?.email && c.author.email.toLowerCase() === currentUserEmail.toLowerCase(),
    )
    if (found) return found
  }
  const currentUsername = authStore.user?.username
  if (currentUsername) {
    const found = notes.value.find(
      (c) => c.author?.name && c.author.name.toLowerCase() === currentUsername.toLowerCase(),
    )
    if (found) return found
  }
  if (notes.value.length === 1 && (authStore.isHQ || authStore.userRole.includes('ADMIN'))) {
    return notes.value[0] || null
  }
  return null
})

const hasUserCommented = computed(() => !!userComment.value)

const otherComments = computed(() => {
  if (!userComment.value) return notes.value
  return notes.value.filter((c) => c.id !== userComment.value?.id)
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

async function copyText(text: string, type: 'email' | 'phone') {
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'email') {
      hasCopiedEmail.value = true
      setTimeout(() => (hasCopiedEmail.value = false), 2000)
    } else {
      hasCopiedPhone.value = true
      setTimeout(() => (hasCopiedPhone.value = false), 2000)
    }
  } catch (err) {
    console.warn('Clipboard write failed:', err)
  }
}

// Note file attachments
function onNoteFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const newFiles = Array.from(target.files)
  noteFiles.value = [...noteFiles.value, ...newFiles]
  target.value = ''
}

function removeNoteFile(index: number) {
  noteFiles.value.splice(index, 1)
}

// Post note (Internal admin note - 1 comment per ticket)
async function submitNote() {
  if (!ticket.value) return
  if (hasUserCommented.value) {
    toastStore.warning(
      'Comment limit reached',
      'Only 1 comment per ticket is allowed. You can update your existing comment.',
    )
    return
  }
  if (!noteBody.value.trim() && noteFiles.value.length === 0) {
    toastStore.warning('Note is empty', 'Please type a note or attach a file.')
    return
  }

  const success = await ticketStore.addTicketComment(ticket.value.id, {
    body: noteBody.value.trim(),
    is_internal: true,
    files: noteFiles.value,
  })

  if (success) {
    noteBody.value = ''
    noteFiles.value = []
  }
}

// Keyboard shortcut (Ctrl/Cmd + Enter to post)
function handleNoteKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    submitNote()
  }
}

// Start inline editing
function startEditNote(comment: TicketComment) {
  editingNoteId.value = comment.id
  editNoteBody.value = comment.body
}

function cancelEditNote() {
  editingNoteId.value = null
  editNoteBody.value = ''
}

async function saveEditNote(commentId: number) {
  if (!ticket.value || !editNoteBody.value.trim()) return
  isSavingEdit.value = true
  const success = await ticketStore.updateTicketComment(ticket.value.id, commentId, {
    body: editNoteBody.value.trim(),
    is_internal: true,
  })
  isSavingEdit.value = false
  if (success) {
    cancelEditNote()
  }
}

async function handleDeleteNote(commentId: number) {
  if (!ticket.value) return
  if (confirm('Are you sure you want to delete this note?')) {
    await ticketStore.deleteTicketComment(ticket.value.id, commentId)
  }
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

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
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
            <CheckSquare v-else class="w-3.5 h-3.5" />
            <span>{{ ticket.type }}</span>
          </span>
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
        <!-- LEFT COLUMN: Ticket Content, Attachments & Discussion Stream (65%) -->
        <div class="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          <!-- Hero Section: Title & Details -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <div class="flex items-center gap-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar class="w-3.5 h-3.5 text-slate-400" />
              <span>Created {{ formatDate(ticket.created_at) }}</span>
              <span v-if="ticket.source" class="text-slate-300 dark:text-slate-700">•</span>
            </div>

            <h2
              class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug"
            >
              {{ ticket.title }}
            </h2>

            <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <HtmlDescriptionViewer
                :content="ticket.description"
                empty-text="No description provided for this ticket."
              />
            </div>
          </div>

          <!-- Attachments Card (Admin View Only - shown when attachments exist) -->
          <div
            v-if="ticket.attachments && ticket.attachments.length > 0"
            class="bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800/80"
          >
            <div class="flex items-center justify-between mb-3">
              <h4
                class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2"
              >
                <Paperclip class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Ticket Attachments ({{ ticket.attachments.length }})</span>
              </h4>
              <span class="text-[11px] text-slate-400 dark:text-slate-500">
                View & download only
              </span>
            </div>

            <!-- Attachments grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                v-for="file in ticket.attachments"
                :key="file.id"
                class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 group hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div
                    v-if="file.mime_type?.startsWith('image/')"
                    @click="previewImage = file.file_url"
                    class="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-950 cursor-pointer relative group/thumb border border-slate-200 dark:border-slate-800"
                  >
                    <img
                      :src="file.file_url"
                      :alt="file.file_name"
                      class="w-full h-full object-cover"
                    />
                    <div
                      class="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <ZoomIn class="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div
                    v-else
                    class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200 dark:border-slate-700/60"
                  >
                    <FileText class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
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
                    class="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Download"
                  >
                    <Download class="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================================= -->
          <!-- ADMIN COMMENT FIELD (Direct card, no redundant wrapper)   -->
          <!-- ========================================================= -->
          <div class="space-y-3">
            <!-- Loading indicator -->
            <div
              v-if="ticketStore.isCommentsLoading"
              class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2"
            >
              <RefreshCw class="w-4 h-4 animate-spin text-indigo-500" />
              <span>Loading comments...</span>
            </div>

            <!-- Other Staff Comments (shown if other team members commented) -->
            <div v-if="otherComments.length > 0" class="space-y-2">
              <div
                class="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 px-1"
              >
                <MessageSquare class="w-3.5 h-3.5 text-indigo-500" />
                <span>Other Staff Comments ({{ otherComments.length }})</span>
              </div>
              <div
                v-for="comment in otherComments"
                :key="comment.id"
                class="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 p-3 sm:p-3.5 space-y-1.5"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {{ comment.author?.name || 'Staff' }}
                    </span>
                    <span class="text-slate-300 dark:text-slate-600 text-xs">•</span>
                    <span
                      class="text-[11px] text-slate-400 dark:text-slate-500 shrink-0"
                      :title="formatDate(comment.created_at)"
                    >
                      {{ formatRelativeTime(comment.created_at) }}
                    </span>
                  </div>
                  <button
                    v-if="!authStore.isReadOnly && authStore.isHQ"
                    type="button"
                    @click="handleDeleteNote(comment.id)"
                    class="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
                <p
                  class="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words"
                >
                  {{ comment.body }}
                </p>
                <div
                  v-if="comment.attachments && comment.attachments.length > 0"
                  class="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap gap-1.5"
                >
                  <div
                    v-for="att in comment.attachments"
                    :key="att.id"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-2xs"
                  >
                    <Paperclip class="w-3 h-3 text-indigo-500 shrink-0" />
                    <span class="max-w-[120px] truncate" :title="att.file_name">{{
                      att.file_name
                    }}</span>
                    <span class="text-[10px] text-slate-400"
                      >({{ formatFileSize(att.file_size) }})</span
                    >
                    <a
                      :href="safeUrl(att.file_url)"
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      class="text-indigo-600 hover:text-indigo-500 p-0.5"
                    >
                      <Download class="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <!-- STATE A: User already has commented -> Display comment card with Edit button -->
            <div
              v-if="hasUserCommented && userComment"
              class="rounded-2xl border border-indigo-200/90 dark:border-indigo-900/60 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
            >
              <!-- Card Header -->
              <div
                class="px-3.5 py-2.5 sm:px-4 sm:py-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <MessageSquare
                    class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0"
                  />
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200"
                    >Admin Comment</span
                  >
                  <span
                    class="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 shrink-0"
                  >
                    Your Comment
                  </span>
                  <span class="text-slate-300 dark:text-slate-600 text-xs">•</span>
                  <span
                    class="text-[11px] text-slate-400 dark:text-slate-500 truncate"
                    :title="formatDate(userComment.created_at)"
                  >
                    {{ formatRelativeTime(userComment.created_at) }}
                  </span>
                </div>

                <!-- Actions: Edit & Delete -->
                <div v-if="!authStore.isReadOnly" class="flex items-center gap-1 shrink-0">
                  <button
                    v-if="editingNoteId !== userComment.id"
                    type="button"
                    @click="startEditNote(userComment)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 dark:hover:bg-indigo-600 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-all cursor-pointer"
                    title="Edit comment"
                  >
                    <Edit2 class="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    @click="handleDeleteNote(userComment.id)"
                    class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <!-- Card Body: Inline Edit Mode vs Display Mode -->
              <div class="p-3.5 sm:p-4">
                <!-- Inline Edit Form -->
                <div v-if="editingNoteId === userComment.id" class="space-y-2.5">
                  <textarea
                    v-model="editNoteBody"
                    rows="3"
                    placeholder="Update your comment..."
                    class="w-full text-xs sm:text-[13px] p-3 rounded-xl bg-slate-50/50 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-slate-200 resize-y"
                  ></textarea>

                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      @click="cancelEditNote"
                      class="px-3 py-1.5 text-xs rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      @click="saveEditNote(userComment.id)"
                      :disabled="isSavingEdit || !editNoteBody.trim()"
                      class="px-3.5 py-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {{ isSavingEdit ? 'Saving...' : 'Save Changes' }}
                    </button>
                  </div>
                </div>

                <!-- Display Mode -->
                <div v-else>
                  <p
                    class="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap break-words"
                  >
                    {{ userComment.body }}
                  </p>

                  <!-- Attachments on user comment -->
                  <div
                    v-if="userComment.attachments && userComment.attachments.length > 0"
                    class="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5"
                  >
                    <div
                      v-for="att in userComment.attachments"
                      :key="att.id"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs text-slate-700 dark:text-slate-300"
                    >
                      <Paperclip class="w-3 h-3 text-indigo-500 shrink-0" />
                      <span class="max-w-[140px] truncate" :title="att.file_name">
                        {{ att.file_name }}
                      </span>
                      <span class="text-[10px] text-slate-400"
                        >({{ formatFileSize(att.file_size) }})</span
                      >
                      <a
                        :href="safeUrl(att.file_url)"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        class="text-indigo-600 hover:text-indigo-500 p-0.5 rounded transition-colors"
                        title="Download"
                      >
                        <Download class="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- STATE B: User has NOT commented yet -> Display "Add Admin Comment" directly -->
            <div
              v-else
              class="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs focus-within:border-indigo-500/80 dark:focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
            >
              <!-- Composer Header -->
              <div
                class="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <MessageSquare class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Add Admin Comment
                  </h3>
                </div>
                <span
                  class="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/60 dark:border-indigo-800/60"
                >
                  1 comment allowed
                </span>
              </div>

              <!-- Textarea Body -->
              <div class="p-3">
                <textarea
                  v-model="noteBody"
                  @keydown="handleNoteKeydown"
                  rows="3"
                  placeholder="Write your comment for this ticket..."
                  class="w-full text-xs sm:text-[13px] p-2 bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-y min-h-[64px]"
                ></textarea>

                <!-- Attachment preview chips -->
                <div v-if="noteFiles.length > 0" class="px-2 pb-2 flex flex-wrap gap-1.5">
                  <div
                    v-for="(f, i) in noteFiles"
                    :key="i"
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs"
                  >
                    <Paperclip class="w-3 h-3 text-slate-400 shrink-0" />
                    <span class="max-w-[130px] truncate">{{ f.name }}</span>
                    <button
                      type="button"
                      @click="removeNoteFile(i)"
                      class="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer ml-0.5 transition-colors"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Action Bar -->
              <div
                class="px-3.5 py-2 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
              >
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="commentFileInputRef?.click()"
                    class="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Attach file"
                  >
                    <Paperclip class="w-3.5 h-3.5" />
                    <span class="text-xs">Attach file</span>
                  </button>
                  <input
                    ref="commentFileInputRef"
                    type="file"
                    multiple
                    class="hidden"
                    @change="onNoteFileSelect"
                  />

                  <span class="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                    Press
                    <kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]"
                      >Ctrl+Enter</kbd
                    >
                    to submit
                  </span>
                </div>

                <button
                  type="button"
                  @click="submitNote"
                  :disabled="
                    ticketStore.isPostingComment || (!noteBody.trim() && noteFiles.length === 0)
                  "
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send v-if="!ticketStore.isPostingComment" class="w-3 h-3" />
                  <span
                    v-else
                    class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
                  ></span>
                  <span>Submit Comment</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Submitter Info & SLA Milestones (35%) -->
        <div
          class="w-full lg:w-80 p-5 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-950/40 shrink-0 overflow-y-auto"
        >
          <!-- Submitter Card -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <h4
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5"
            >
              <User class="w-3.5 h-3.5 text-indigo-500" />
              <span>Submitter Information</span>
            </h4>

            <div class="flex items-center gap-3 mb-3">
              <div
                class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center border border-indigo-200 dark:border-indigo-800/60 shrink-0"
              >
                {{ (ticket.reporter_name || 'U').charAt(0).toUpperCase() }}
              </div>
              <div class="min-w-0">
                <h5 class="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {{ ticket.reporter_name || 'Anonymous User' }}
                </h5>
                <span class="text-xs text-slate-500 dark:text-slate-400"> Ticket Author </span>
              </div>
            </div>

            <!-- Email & Phone Channels -->
            <div class="space-y-2 text-xs">
              <div
                v-if="ticket.reporter_email"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <a
                  :href="`mailto:${ticket.reporter_email}`"
                  class="text-indigo-600 dark:text-indigo-400 truncate max-w-[180px] font-medium hover:underline"
                  :title="ticket.reporter_email"
                >
                  {{ ticket.reporter_email }}
                </a>
                <button
                  type="button"
                  @click="copyText(ticket.reporter_email, 'email')"
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  :title="hasCopiedEmail ? 'Copied!' : 'Copy Email'"
                >
                  <Check v-if="hasCopiedEmail" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>

              <div
                v-if="reporterPhone"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
              >
                <a
                  :href="`tel:${reporterPhone}`"
                  class="text-indigo-600 dark:text-indigo-400 truncate font-medium hover:underline"
                >
                  {{ reporterPhone }}
                </a>
                <button
                  type="button"
                  @click="copyText(reporterPhone, 'phone')"
                  class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  :title="hasCopiedPhone ? 'Copied!' : 'Copy Phone'"
                >
                  <Check v-if="hasCopiedPhone" class="w-3.5 h-3.5 text-emerald-500" />
                  <Copy v-else class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Status & Priority Card -->
          <div
            class="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            <h4
              class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5"
            >
              <SlidersHorizontal class="w-3.5 h-3.5 text-indigo-500" />
              <span>Status & Priority</span>
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
                <div class="font-semibold text-slate-800 dark:text-slate-200">Resolve</div>
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
