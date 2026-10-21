<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTicketStore } from '@/stores/ticketStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import type { Ticket, TicketComment } from '@/types/ticket'
import { safeUrl } from '@/utils/security'
import { fileToBase64 } from '@/api/ticketApi'
import TicketAuditTimeline from './TicketAuditTimeline.vue'
import {
  MessageSquare,
  MessagesSquare,
  History,
  Send,
  Paperclip,
  Trash2,
  X,
  ZoomIn,
  Download,
  ShieldCheck,
  Eye,
  FileText,
} from 'lucide-vue-next'

const props = defineProps<{
  ticket: Ticket
}>()

const emit = defineEmits<{
  (e: 'preview-image', url: string): void
}>()

const ticketStore = useTicketStore()
const authStore = useAuthStore()
const toastStore = useToastStore()

// State for composer file preview items
export interface ComposerFileItem {
  id: string
  file?: File
  name: string
  size: number
  type: string
  dataUrl: string
  isImage: boolean
}

// -------------------------------------------------------------
// TAB 1: Discussion & Notes State (Admin Comment Only)
// -------------------------------------------------------------
const discussionBody = ref('')
const discussionFiles = ref<ComposerFileItem[]>([])
const discussionFileInputRef = ref<HTMLInputElement | null>(null)
const discussionIsInternal = ref(true)

// -------------------------------------------------------------
// TAB 2: All Comments State (Chat UI)
// -------------------------------------------------------------
// Local fallback lightbox for self-contained image previewing
const localPreviewImage = ref<string | null>(null)

function openImagePreview(url: string) {
  localPreviewImage.value = url
  emit('preview-image', url)
}

function closeImagePreview() {
  localPreviewImage.value = null
}

// Comments from store
const notes = computed(() => ticketStore.comments || [])

// Determine admin username
const currentAdminUsername = computed(() => {
  return authStore.user?.username || authStore.user?.first_name || 'admin'
})

// -------------------------------------------------------------
// File Processing & Image Pre-Submit Preview Helpers
// -------------------------------------------------------------
async function processFiles(files: FileList | File[]): Promise<ComposerFileItem[]> {
  const items: ComposerFileItem[] = []
  for (const file of Array.from(files)) {
    const isImg =
      file.type.startsWith('image/') || Boolean(file.name.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i))
    let dataUrl = ''
    try {
      dataUrl = await fileToBase64(file)
    } catch (e) {
      console.warn('Failed to convert file to dataUrl:', e)
    }
    items.push({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      dataUrl,
      isImage: isImg,
    })
  }
  return items
}

// Discussion Tab file handlers
async function onDiscussionFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const processed = await processFiles(target.files)
  discussionFiles.value = [...discussionFiles.value, ...processed]
  target.value = ''
}

function removeDiscussionFile(index: number) {
  discussionFiles.value.splice(index, 1)
}

// -------------------------------------------------------------
// Submission Handlers (Admin Comment Only)
// -------------------------------------------------------------
async function submitDiscussionNote() {
  if (!props.ticket) return
  if (!discussionBody.value.trim() && discussionFiles.value.length === 0) {
    toastStore.warning('Note is empty', 'Please type a message or attach an image/file.')
    return
  }

  const username = currentAdminUsername.value
  const base64Files = discussionFiles.value.map((f) => f.dataUrl).filter(Boolean)

  const success = await ticketStore.addTicketComment(props.ticket.id, {
    username,
    body: discussionBody.value.trim(),
    is_internal: discussionIsInternal.value,
    files: base64Files,
  })

  if (success) {
    // Clean all text inside textarea & reset files
    discussionBody.value = ''
    discussionFiles.value = []
  }
}

// Keyboard shortcut (Ctrl/Cmd + Enter)
function handleDiscussionKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    submitDiscussionNote()
  }
}

// -------------------------------------------------------------
// Delete Comments in All Comments Chat Stream
// -------------------------------------------------------------
async function handleDeleteComment(commentId: number) {
  if (!props.ticket) return
  if (confirm('Are you sure you want to delete this comment?')) {
    await ticketStore.deleteTicketComment(props.ticket.id, commentId)
  }
}

// -------------------------------------------------------------
// Extraction of comment attachments / files
// -------------------------------------------------------------
export interface DisplayAttachmentItem {
  id: string | number
  name: string
  url: string
  isImage: boolean
  sizeText?: string
}

function getCommentAttachments(comment: TicketComment): DisplayAttachmentItem[] {
  const result: DisplayAttachmentItem[] = []

  if (comment.attachments && Array.isArray(comment.attachments)) {
    for (const att of comment.attachments) {
      const isImg =
        Boolean(att.mime_type?.startsWith('image/')) ||
        Boolean(att.file_url?.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) ||
        att.file_url?.startsWith('data:image/')
      result.push({
        id: att.id || Math.random(),
        name: att.file_name || 'attachment',
        url: att.file_url,
        isImage: isImg,
        sizeText: att.file_size ? formatFileSize(att.file_size) : undefined,
      })
    }
  }

  if (comment.files && Array.isArray(comment.files)) {
    comment.files.forEach((fileItem, idx) => {
      if (typeof fileItem === 'string') {
        if (result.some((r) => r.url === fileItem)) return
        const isImg =
          fileItem.startsWith('data:image/') ||
          Boolean(fileItem.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i))
        result.push({
          id: `f-${comment.id}-${idx}`,
          name: isImg ? `snapshot_${idx + 1}.png` : `file_${idx + 1}`,
          url: fileItem,
          isImage: isImg,
        })
      } else if (typeof fileItem === 'object' && fileItem !== null && (fileItem as any).file_url) {
        const att = fileItem as any
        if (result.some((r) => r.url === att.file_url)) return
        const isImg =
          Boolean(att.mime_type?.startsWith('image/')) ||
          Boolean(att.file_url?.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) ||
          att.file_url?.startsWith('data:image/')
        result.push({
          id: att.id || `f-${comment.id}-${idx}`,
          name: att.file_name || (isImg ? `snapshot_${idx + 1}.png` : `attachment_${idx + 1}`),
          url: att.file_url,
          isImage: isImg,
          sizeText: att.file_size ? formatFileSize(att.file_size) : undefined,
        })
      }
    })
  }

  return result
}

function getAuthorDisplayName(comment: TicketComment): string {
  if (comment.username) return comment.username
  if (comment.author?.name) return comment.author.name
  return comment.is_internal ? 'Staff Admin' : 'Client / Customer'
}

function isCommentClientSide(comment: TicketComment): boolean {
  if (comment.is_internal) return false
  const authorRole = (comment.author as any)?.role?.toLowerCase()
  if (authorRole === 'admin' || authorRole === 'staff' || authorRole === 'agent') {
    return false
  }
  const authorName = (comment.username || comment.author?.name || '').toLowerCase()
  const currentAdmin = (authStore.user?.username || '').toLowerCase()
  if (authorName && currentAdmin && authorName === currentAdmin) {
    return false
  }
  if (authorName.includes('admin') || authorName.includes('staff') || authorName.startsWith('hq_')) {
    return false
  }
  const reporter = (props.ticket.reporter_name || '').toLowerCase()
  if (reporter && (authorName === reporter || authorName.includes(reporter))) {
    return true
  }
  if (
    authorName.includes('client') ||
    authorName.includes('customer') ||
    authorName.includes('alex')
  ) {
    return true
  }
  return !comment.is_internal
}

function formatAttachmentDisplayName(name: string): string {
  if (!name) return 'attachment'
  const lastDotIndex = name.lastIndexOf('.')
  const hasExt = lastDotIndex > 0 && lastDotIndex > name.length - 8
  const ext = hasExt ? name.slice(lastDotIndex) : ''
  const base = hasExt ? name.slice(0, lastDotIndex) : name

  if (base.length > 20) {
    return `${base.slice(0, 10)}...${base.slice(-6)}${ext}`
  }
  return name
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
  <div class="space-y-4">
    <!-- ========================================================= -->
    <!-- TABS SWITCHER: Discussion & Notes vs All Comments vs Audits -->
    <!-- ========================================================= -->
    <div
      class="flex items-center gap-1.5 sm:gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800"
    >
      <!-- TAB 1: Discussion -->
      <button
        type="button"
        @click="ticketStore.activeDetailTab = 'discussion'"
        class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
        :class="
          ticketStore.activeDetailTab === 'discussion'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
        "
      >
        <MessageSquare class="w-3.5 h-3.5 shrink-0" />
        <span class="truncate">Discussion</span>
      </button>

      <!-- TAB 2: All Comments -->
      <button
        type="button"
        @click="ticketStore.activeDetailTab = 'comments'"
        class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
        :class="
          ticketStore.activeDetailTab === 'comments'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
        "
      >
        <MessagesSquare class="w-3.5 h-3.5 shrink-0" />
        <span class="truncate">All Comments</span>
        <span
          class="px-1.5 py-0.2 rounded-full text-[10px] font-semibold"
          :class="
            ticketStore.activeDetailTab === 'comments'
              ? 'bg-white/20 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          "
        >
          {{ notes.length }}
        </span>
      </button>

      <!-- TAB 3: Audit History -->
      <button
        type="button"
        @click="ticketStore.activeDetailTab = 'audits'"
        class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
        :class="
          ticketStore.activeDetailTab === 'audits'
            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
        "
      >
        <History class="w-3.5 h-3.5 shrink-0" />
        <span class="truncate">Audit History</span>
        <span
          class="px-1.5 py-0.2 rounded-full text-[10px] font-semibold"
          :class="
            ticketStore.activeDetailTab === 'audits'
              ? 'bg-white/20 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          "
        >
          {{ ticketStore.ticketAudits.length }}
        </span>
      </button>
    </div>

    <!-- ========================================================= -->
    <!-- TAB 1 CONTENT: Discussion & Notes (Admin Comment Only)    -->
    <!-- ========================================================= -->
    <div v-show="ticketStore.activeDetailTab === 'discussion'" class="space-y-4">
      <!-- Composer Card: Admin only, multiple notes supported -->
      <div
        class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs focus-within:border-indigo-500/80 dark:focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
      >
        <!-- Composer Header -->
        <div
          class="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0"
            >
              <ShieldCheck class="w-4 h-4" />
            </div>
            <div>
              <h3
                class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
              >
                <span>Add Admin Discussion Note</span>
              </h3>
            </div>
          </div>
        </div>

        <!-- Textarea Body -->
        <div class="p-3">
          <textarea
            v-model="discussionBody"
            @keydown="handleDiscussionKeydown"
            rows="3"
            placeholder="Write an internal discussion note or admin update... (Markdown and images supported)"
            class="w-full text-xs sm:text-[13px] p-2 bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-y min-h-[70px]"
          ></textarea>

          <!-- ======================================================== -->
          <!-- PRE-SUBMIT IMAGE & FILE PREVIEW GALLERY (Compact)         -->
          <!-- ======================================================== -->
          <div
            v-if="discussionFiles.length > 0"
            class="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5"
          >
            <div
              class="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1"
            >
              <span class="font-semibold flex items-center gap-1">
                <Eye class="w-3 h-3 text-indigo-500" />
                <span>Attachments ({{ discussionFiles.length }})</span>
              </span>
              <span class="text-[10px] text-slate-400">Click to preview</span>
            </div>

            <div class="flex flex-wrap gap-2">
              <div
                v-for="(f, i) in discussionFiles"
                :key="f.id"
                class="group relative"
              >
                <!-- Compact Image Thumbnail (w-14 h-14) -->
                <div
                  v-if="f.isImage && f.dataUrl"
                  @click="openImagePreview(f.dataUrl)"
                  class="w-14 h-14 rounded-xl overflow-hidden relative cursor-pointer bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all"
                  :title="f.name"
                >
                  <img :src="f.dataUrl" :alt="f.name" class="w-full h-full object-cover" />
                  <div
                    class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                  >
                    <ZoomIn class="w-3.5 h-3.5" />
                  </div>
                  <!-- Floating Remove Button -->
                  <button
                    type="button"
                    @click.stop="removeDiscussionFile(i)"
                    class="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer z-2"
                    title="Remove image"
                  >
                    <X class="w-2.5 h-2.5" />
                  </button>
                </div>

                <!-- Compact Non-image file pill -->
                <div
                  v-else
                  class="h-14 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-2xs"
                >
                  <FileText class="w-4 h-4 text-indigo-500 shrink-0" />
                  <div class="max-w-[110px] truncate">
                    <p
                      class="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate"
                      :title="f.name"
                    >
                      {{ f.name }}
                    </p>
                    <span class="text-[9px] text-slate-400 uppercase font-mono">{{
                      f.type.split('/')[1] || 'FILE'
                    }}</span>
                  </div>
                  <button
                    type="button"
                    @click="removeDiscussionFile(i)"
                    class="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition-colors shrink-0 ml-1"
                    title="Remove file"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Composer Action Bar -->
        <div
          class="px-3.5 py-2 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="discussionFileInputRef?.click()"
              class="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Attach screenshot or file"
            >
              <Paperclip class="w-3.5 h-3.5" />
              <span class="text-xs">Attach image / file</span>
            </button>
            <input
              ref="discussionFileInputRef"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
              class="hidden"
              @change="onDiscussionFileSelect"
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
            @click="submitDiscussionNote"
            :disabled="
              ticketStore.isPostingComment ||
              (!discussionBody.trim() && discussionFiles.length === 0)
            "
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send v-if="!ticketStore.isPostingComment" class="w-3 h-3" />
            <span
              v-else
              class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"
            ></span>
            <span>Submit Note</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- TAB 2 CONTENT: All Comments Stream (Clean Chat-like UI)     -->
    <!-- ========================================================= -->
    <div
      v-show="ticketStore.activeDetailTab === 'comments'"
      data-testid="all-comments-tab"
      class="space-y-2"
    >
      <!-- Chat Messages Timeline (Scrollable when many comments, compact when single) -->
      <div
        data-testid="all-comments-stream"
        class="space-y-3.5 max-h-[460px] sm:max-h-[520px] overflow-y-auto px-1 py-1 focus:outline-none scrollbar-thin"
      >
        <!-- Empty State -->
        <div
          v-if="notes.length === 0"
          class="p-8 rounded-2xl border border-dashed border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-2"
        >
          <div
            class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto"
          >
            <MessagesSquare class="w-4 h-4" />
          </div>
          <h4 class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            No comments yet
          </h4>
          <p class="text-xs text-slate-400 max-w-xs mx-auto">
            Comments and notes will appear here in chronological order.
          </p>
        </div>

        <!-- Chat Bubble Message Item (Admin on Right, Client on Left) -->
        <div
          v-for="comment in notes"
          :key="comment.id"
          class="flex items-start gap-2.5 group"
          :class="isCommentClientSide(comment) ? 'flex-row' : 'flex-row-reverse justify-start'"
        >
          <!-- Modern Avatar with Initials & Subtle Gradient Ring (h-8 aligns with header h-8) -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 select-none shadow-2xs"
            :class="
              isCommentClientSide(comment)
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-500/20'
                : 'bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-indigo-500/20'
            "
          >
            {{ (getAuthorDisplayName(comment) || 'U').charAt(0).toUpperCase() }}
          </div>

          <!-- Speech Bubble Container (Hugs content, max-width prevents taking full screen) -->
          <div
            class="flex flex-col max-w-[85%] sm:max-w-[78%] min-w-0"
            :class="isCommentClientSide(comment) ? 'items-start' : 'items-end'"
          >
            <!-- Comment Header OUTSIDE box card: Username (at vertical middle of profile) + Timestamp + Actions -->
            <div
              data-testid="comment-header"
              class="h-8 flex items-center gap-2 px-1 select-none"
              :class="isCommentClientSide(comment) ? 'flex-row' : 'flex-row-reverse'"
            >
              <span class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {{ getAuthorDisplayName(comment) }}
              </span>

              <span
                class="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-normal shrink-0"
                :title="formatDate(comment.created_at)"
              >
                {{ formatRelativeTime(comment.created_at) }}
              </span>

              <!-- Delete action button (reveal on hover) -->
              <div
                v-if="!authStore.isReadOnly"
                class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  v-if="
                    authStore.isHQ ||
                    authStore.isTicketAdmin ||
                    authStore.user?.username === comment.username ||
                    authStore.user?.id === comment.author?.id
                  "
                  type="button"
                  @click="handleDeleteComment(comment.id)"
                  class="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Delete comment"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>

            <!-- Speech Bubble Card (Starts from bottom of profile avatar with unified slate background) -->
            <div
              class="w-fit max-w-full px-3.5 py-2.5 transition-all text-left shadow-2xs rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 mt-0.5"
              :class="isCommentClientSide(comment) ? 'rounded-tl-xs' : 'rounded-tr-xs'"
            >
              <!-- Comment Body Text -->
              <p
                v-if="comment.body"
                class="text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words"
              >
                {{ comment.body }}
              </p>

              <!-- Attachments & Snapshots Gallery (Minimized space for images, beautiful compact cards) -->
              <div
                v-if="getCommentAttachments(comment).length > 0"
                class="flex flex-wrap gap-1.5"
                :class="[
                  isCommentClientSide(comment) ? 'justify-start' : 'justify-end',
                  comment.body
                    ? 'mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/40'
                    : '',
                ]"
              >
                <template v-for="att in getCommentAttachments(comment)" :key="att.id">
                  <!-- Image thumbnail: sleek, space-saving thumbnail with hover zoom & download -->
                  <div
                    v-if="att.isImage"
                    class="group/img relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-slate-200/90 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-900 shadow-2xs shrink-0 cursor-pointer hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200"
                    :title="att.name + (att.sizeText ? ' (' + att.sizeText + ')' : '')"
                    @click="openImagePreview(att.url)"
                  >
                    <img
                      :src="att.url"
                      :alt="att.name"
                      class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover/img:scale-110"
                    />
                    <!-- Screen-reader accessible name (satisfies accessibility and text searches) -->
                    <span class="sr-only">{{ formatAttachmentDisplayName(att.name) }}</span>
                    <!-- Hover overlay with quick actions -->
                    <div
                      class="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px] opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-1 text-white transition-opacity duration-150"
                    >
                      <button
                        type="button"
                        @click.stop="openImagePreview(att.url)"
                        class="p-1 rounded-md bg-white/20 hover:bg-white/35 text-white transition-colors cursor-pointer"
                        title="Zoom image"
                      >
                        <ZoomIn class="w-3 h-3" />
                      </button>
                      <a
                        :href="safeUrl(att.url)"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        class="p-1 rounded-md bg-white/20 hover:bg-white/35 text-white transition-colors cursor-pointer"
                        title="Download image"
                        @click.stop
                      >
                        <Download class="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <!-- Non-image file attachment: compact pill -->
                  <div
                    v-else
                    class="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg border border-slate-200/80 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/80 text-xs shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                  >
                    <FileText class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span
                      class="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]"
                      :title="att.name"
                    >
                      {{ formatAttachmentDisplayName(att.name) }}
                    </span>
                    <span v-if="att.sizeText" class="text-[10px] text-slate-400">
                      {{ att.sizeText }}
                    </span>
                    <a
                      :href="safeUrl(att.url)"
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      class="p-0.5 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Download"
                    >
                      <Download class="w-3 h-3" />
                    </a>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- TAB 3 CONTENT: Audit Trail Timeline                        -->
    <!-- ========================================================= -->
    <div v-show="ticketStore.activeDetailTab === 'audits'">
      <TicketAuditTimeline />
    </div>

    <!-- Fallback Lightbox Modal for Image Previews -->
    <div
      v-if="localPreviewImage"
      @click="closeImagePreview"
      class="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        class="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl"
      >
        <button
          type="button"
          @click="closeImagePreview"
          class="absolute top-3 right-3 p-2 rounded-full bg-slate-950/80 text-white hover:bg-slate-900 border border-slate-700 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
        <img
          :src="localPreviewImage"
          alt="Preview"
          class="max-h-[85vh] w-auto object-contain rounded-xl"
        />
      </div>
    </div>
  </div>
</template>
