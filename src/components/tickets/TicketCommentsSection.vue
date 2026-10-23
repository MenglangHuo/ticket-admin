<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useTicketStore } from '@/stores/ticketStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import type { Ticket, TicketComment } from '@/types/ticket'
import { safeUrl } from '@/utils/security'
import { fileToBase64 } from '@/api/ticketApi'
import TicketAuditTimeline from './TicketAuditTimeline.vue'
import {
  MessagesSquare,
  History,
  Send,
  Paperclip,
  X,
  ZoomIn,
  Download,
  FileText,
  ChevronDown,
  Reply,
  CornerUpLeft,
  CornerDownRight,
  Maximize2,
  Minimize2,
} from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    ticket: Ticket
    isMaximized?: boolean
  }>(),
  {
    isMaximized: false,
  },
)

const emit = defineEmits<{
  (e: 'preview-image', url: string): void
  (e: 'toggle-maximize'): void
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
// All Comments & Telegram / Messenger Composer State
// -------------------------------------------------------------
const composerBody = ref('')
const composerFiles = ref<ComposerFileItem[]>([])
const composerFileInputRef = ref<HTMLInputElement | null>(null)
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null)

// 1-Row Compact Composer state (expands on click, focus, or input)
const isComposerExpanded = ref(false)

const shouldShowExpandedComposer = computed(() => {
  return (
    isComposerExpanded.value ||
    composerBody.value.trim().length > 0 ||
    composerFiles.value.length > 0 ||
    replyingToComment.value !== null
  )
})

function expandComposer() {
  isComposerExpanded.value = true
  nextTick(() => {
    composerTextareaRef.value?.focus()
  })
}

function collapseComposerManual() {
  if (composerFiles.value.length > 0 || composerBody.value.trim().length > 0) {
    composerBody.value = ''
    composerFiles.value = []
  }
  replyingToComment.value = null
  isComposerExpanded.value = false
}

// Reply state
const replyingToComment = ref<TicketComment | null>(null)
const highlightedCommentId = ref<number | null>(null)

// Local fallback lightbox for self-contained image previewing
const localPreviewImage = ref<string | null>(null)

function openImagePreview(url: string) {
  localPreviewImage.value = url
  emit('preview-image', url)
}

function closeImagePreview() {
  localPreviewImage.value = null
}

// Comments from store sorted chronologically so newest comments and replies always appear at the bottom
const notes = computed(() => {
  const list = ticketStore.comments || []
  return [...list].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime()
    const timeB = new Date(b.created_at || 0).getTime()
    if (timeA !== timeB) return timeA - timeB
    return (Number(a.id) || 0) - (Number(b.id) || 0)
  })
})

// Determine admin username
const currentAdminUsername = computed(() => {
  return authStore.user?.username || authStore.user?.first_name || 'admin'
})

// -------------------------------------------------------------
// Auto-Scroll & Floating Action Button (Telegram / Messenger UX)
// -------------------------------------------------------------
const commentsStreamRef = ref<HTMLElement | null>(null)
const commentsBottomSentinelRef = ref<HTMLElement | null>(null)
const showScrollToBottom = ref(false)
const isNearBottom = ref(true)
const unreadCountWhileScrolled = ref(0)
const isStreamReady = ref(false)

function scrollToBottom(smooth = false) {
  const performScroll = (isSmooth: boolean) => {
    const el = commentsStreamRef.value
    if (!el) return
    const targetTop = el.scrollHeight

    if (isSmooth) {
      // Telegram / Messenger optimization:
      // If user is far up (> 1200px), pre-jump close to bottom first (within 350px),
      // then smooth scroll the remaining distance.
      const currentDistance = targetTop - (el.scrollTop + el.clientHeight)
      if (currentDistance > 1200) {
        el.scrollTop = targetTop - 350
      }
      if (typeof el.scrollTo === 'function') {
        try {
          el.scrollTo({
            top: targetTop,
            behavior: 'smooth',
          })
        } catch {
          el.scrollTop = targetTop
        }
      } else {
        el.scrollTop = targetTop
      }
    } else {
      // Instant 0ms positioning (for tab preview, opening modal, initial render)
      el.scrollTop = targetTop
      if (typeof el.scrollTo === 'function') {
        try {
          el.scrollTo({
            top: targetTop,
            behavior: 'instant' as ScrollBehavior,
          })
        } catch {}
      }
    }
  }

  // 1. Synchronous attempt immediately (0ms)
  performScroll(smooth)

  // 2. Next tick to account for Vue DOM patch
  nextTick(() => {
    performScroll(smooth)

    // 3. Frame commit - mark stream ready so opacity transitions to 100 with bottom in place
    requestAnimationFrame(() => {
      performScroll(smooth)
      isStreamReady.value = true
    })

    // Fallback safety timeout
    setTimeout(() => {
      performScroll(smooth)
      isStreamReady.value = true
    }, 40)
  })
}

function handleScroll() {
  const el = commentsStreamRef.value
  if (!el) return
  const { scrollTop, scrollHeight, clientHeight } = el
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight)
  const atBottom = distanceFromBottom <= 60
  isNearBottom.value = atBottom
  showScrollToBottom.value = !atBottom && scrollHeight > clientHeight + 30

  if (atBottom) {
    unreadCountWhileScrolled.value = 0
  }
}

function selectCommentsTab() {
  const isAlreadyActive = ticketStore.activeDetailTab === 'comments'
  ticketStore.activeDetailTab = 'comments'
  unreadCountWhileScrolled.value = 0

  if (isAlreadyActive) {
    scrollToBottom(true)
  } else {
    isStreamReady.value = false
    scrollToBottom(false)
  }
}

function onImageLoad() {
  if (ticketStore.activeDetailTab === 'comments' && isNearBottom.value) {
    scrollToBottom(false)
  }
}

// -------------------------------------------------------------
// Reply and Quote Navigation
// -------------------------------------------------------------
function startReply(comment: TicketComment) {
  replyingToComment.value = comment
  isComposerExpanded.value = true
  nextTick(() => {
    if (composerTextareaRef.value) {
      composerTextareaRef.value.focus()
    }
  })
}

function cancelReply() {
  replyingToComment.value = null
}

function jumpToComment(commentId?: number | null) {
  if (!commentId) return
  const el = document.getElementById(`comment-${commentId}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    highlightedCommentId.value = commentId
    setTimeout(() => {
      if (highlightedCommentId.value === commentId) {
        highlightedCommentId.value = null
      }
    }, 1800)
  }
}

function getParentPreview(
  parentId?: number | null,
  parentObj?: TicketComment | null,
): { authorName: string; text: string } | null {
  if (!parentId && !parentObj) return null
  if (parentObj) {
    return {
      authorName: getAuthorDisplayName(parentObj),
      text: parentObj.body || 'Attachment',
    }
  }
  const found = notes.value.find((c) => c.id === parentId)
  if (found) {
    return {
      authorName: getAuthorDisplayName(found),
      text: found.body || 'Attachment',
    }
  }
  return {
    authorName: 'Previous Message',
    text: 'Original message',
  }
}

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

async function onComposerFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const processed = await processFiles(target.files)
  composerFiles.value = [...composerFiles.value, ...processed]
  isComposerExpanded.value = true
  target.value = ''
}

function removeComposerFile(index: number) {
  composerFiles.value.splice(index, 1)
}

// -------------------------------------------------------------
// Submission Handlers (Telegram / Messenger Chat UI)
// -------------------------------------------------------------
async function submitComposerComment() {
  if (!props.ticket) return
  if (!composerBody.value.trim() && composerFiles.value.length === 0) {
    toastStore.warning('Empty Comment', 'Please type a message or attach an image/file.')
    return
  }

  const username = currentAdminUsername.value
  const base64Files = composerFiles.value.map((f) => f.dataUrl).filter(Boolean)
  const parentId = replyingToComment.value ? replyingToComment.value.id : null

  const success = await ticketStore.addTicketComment(props.ticket.id, {
    username,
    body: composerBody.value.trim(),
    parent_id: parentId,
    is_internal: false,
    files: base64Files,
  })

  if (success) {
    composerBody.value = ''
    composerFiles.value = []
    replyingToComment.value = null
    isComposerExpanded.value = false
    nextTick(() => {
      scrollToBottom(true)
    })
  }
}

// Keyboard shortcuts: Enter to send (Shift+Enter for newline), or Ctrl/Cmd + Enter
function handleComposerKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      // Allow newline
      return
    }
    // Enter sends the comment
    e.preventDefault()
    submitComposerComment()
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

function getAuthorDisplayName(comment?: TicketComment | null): string {
  if (!comment) return 'User'
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
  if (
    authorName.includes('admin') ||
    authorName.includes('staff') ||
    authorName.startsWith('hq_')
  ) {
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

function isFirstInGroup(index: number): boolean {
  if (index === 0) return true
  const curr = notes.value[index]
  const prev = notes.value[index - 1]
  if (!curr || !prev) return true
  const sameSide = isCommentClientSide(curr) === isCommentClientSide(prev)
  const sameAuthor = getAuthorDisplayName(curr) === getAuthorDisplayName(prev)
  return !(sameSide && sameAuthor)
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
  if (diffMin < 60) return `${diffMin}min ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

// Watch for tab switch to 'comments'
watch(
  () => ticketStore.activeDetailTab,
  (newTab) => {
    if (newTab === 'discussion') {
      ticketStore.activeDetailTab = 'comments'
      return
    }
    if (newTab === 'comments') {
      unreadCountWhileScrolled.value = 0
      isStreamReady.value = false
      scrollToBottom(false)
    }
  },
  { flush: 'post' },
)

// Watch for new comments arriving
watch(
  () => notes.value.length,
  (newCount, oldCount) => {
    if (newCount === 0) {
      isStreamReady.value = true
      return
    }
    if (ticketStore.activeDetailTab !== 'comments') return

    if (isNearBottom.value || !oldCount) {
      // If initial load (!oldCount), instant 0ms jump. If new note posted, smooth scroll.
      scrollToBottom(Boolean(oldCount && oldCount > 0))
    } else if (newCount > oldCount) {
      unreadCountWhileScrolled.value += newCount - oldCount
    }
  },
  { flush: 'post' },
)

// Watch for ticket selection changes
watch(
  () => props.ticket?.id,
  () => {
    unreadCountWhileScrolled.value = 0
    replyingToComment.value = null
    composerBody.value = ''
    composerFiles.value = []
    if (ticketStore.activeDetailTab === 'comments') {
      isStreamReady.value = false
      scrollToBottom(false)
    }
  },
  { flush: 'post' },
)

onMounted(() => {
  if (ticketStore.activeDetailTab === 'discussion') {
    ticketStore.activeDetailTab = 'comments'
  }
  if (ticketStore.activeDetailTab === 'comments') {
    isStreamReady.value = false
    scrollToBottom(false)
  } else {
    isStreamReady.value = true
  }
})

defineExpose({
  scrollToBottom,
  commentsBottomSentinelRef,
})
</script>

<template>
  <div class="flex-1 min-h-0 flex flex-col h-full space-y-3">
    <!-- ========================================================= -->
    <!-- TABS SWITCHER: All Comments vs Audit History               -->
    <!-- ========================================================= -->
    <div
      class="flex items-center justify-between gap-1.5 sm:gap-2 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 shrink-0"
    >
      <div class="flex items-center gap-1.5 flex-1 min-w-0">
        <!-- TAB 1: All Comments -->
        <button
          type="button"
          @click="selectCommentsTab"
          class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
          :class="
            ticketStore.activeDetailTab === 'comments'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
          "
        >
          <MessagesSquare class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate">All Comments</span>
          <span
            v-if="notes.length > 0"
            class="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none"
            :class="
              ticketStore.activeDetailTab === 'comments'
                ? 'bg-white/25 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            "
          >
            {{ notes.length }}
          </span>
        </button>

        <!-- TAB 2: Audit History -->
        <button
          type="button"
          @click="ticketStore.activeDetailTab = 'audits'"
          class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none"
          :class="
            ticketStore.activeDetailTab === 'audits'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
          "
        >
          <History class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate">Audit History</span>
        </button>
      </div>

      <!-- Action Button: Toggle Maximize Height for Comment Section -->
      <button
        type="button"
        @click="emit('toggle-maximize')"
        class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer shrink-0 shadow-2xs border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
        :title="
          isMaximized ? 'Show ticket details (Normal View)' : 'Expand comments area (Full Height)'
        "
      >
        <Minimize2 v-if="isMaximized" class="w-3.5 h-3.5 text-indigo-500" />
        <Maximize2 v-else class="w-3.5 h-3.5 text-indigo-500" />
        <span class="hidden sm:inline text-[11px]">{{ isMaximized ? 'Normal' : '' }}</span>
      </button>
    </div>

    <!-- ========================================================= -->
    <!-- TAB 1 CONTENT: All Comments Stream & Bottom Chat Composer -->
    <!-- ========================================================= -->
    <div
      v-show="ticketStore.activeDetailTab === 'comments'"
      data-testid="all-comments-tab"
      class="flex-1 min-h-0 flex flex-col relative"
    >
      <!-- Chat Messages Timeline (Scrollable, fills available space, client on left, admin on right) -->
      <div
        ref="commentsStreamRef"
        @scroll="handleScroll"
        data-testid="all-comments-stream"
        class="flex-1 min-h-0 overflow-y-auto px-1 pt-1 pb-2 space-y-2 focus:outline-none scrollbar-thin transition-opacity duration-150"
        :class="isStreamReady ? 'opacity-100' : 'opacity-0'"
      >
        <!-- Empty State -->
        <div
          v-if="notes.length === 0"
          class="p-8 rounded-2xl border border-dashed border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-2 my-auto"
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
            Comments and notes will appear here in chronological order. Send a message below to
            start the conversation.
          </p>
        </div>

        <!-- Chat Bubble Message Item (Admin on Right, Client on Left) -->
        <div
          v-for="(comment, index) in notes"
          :id="`comment-${comment.id}`"
          :key="comment.id"
          class="flex items-start gap-2 group transition-colors duration-200 rounded-2xl p-0.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
          :class="[
            isCommentClientSide(comment) ? 'flex-row' : 'flex-row-reverse',
            isFirstInGroup(index) ? 'mt-2.5' : 'mt-1',
            highlightedCommentId === comment.id
              ? 'bg-indigo-100/60 dark:bg-indigo-950/50 ring-2 ring-indigo-500/60'
              : '',
          ]"
        >
          <!-- Modern Avatar (Only shown on FIRST comment in consecutive group) -->
          <div
            v-if="isFirstInGroup(index)"
            class="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 select-none shadow-2xs mt-0.5"
            :class="
              isCommentClientSide(comment)
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-500/20'
                : 'bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-indigo-500/20'
            "
          >
            {{ (getAuthorDisplayName(comment) || 'U').charAt(0).toUpperCase() }}
          </div>
          <!-- Spacer placeholder for consecutive messages in group so bubbles stay aligned -->
          <div
            v-else
            class="w-7 sm:w-7.5 shrink-0 select-none pointer-events-none"
            aria-hidden="true"
          ></div>

          <!-- Speech Bubble & Metadata Container -->
          <div
            class="flex flex-col max-w-[85%] sm:max-w-[82%] min-w-0"
            :class="isCommentClientSide(comment) ? 'items-start' : 'items-end'"
          >
            <!-- Group Header: Username + Role Indicator (Only shown once at top of consecutive group) -->
            <div
              v-if="isFirstInGroup(index)"
              data-testid="comment-header"
              class="flex items-center gap-1.5 px-1 mb-1 select-none text-[11px]"
              :class="isCommentClientSide(comment) ? 'flex-row' : 'flex-row-reverse'"
            >
              <span class="font-bold text-slate-800 dark:text-slate-200 truncate">
                {{ getAuthorDisplayName(comment) }}
              </span>

              <span class="sr-only">{{
                isCommentClientSide(comment) ? 'Customer' : 'Support Staff'
              }}</span>
            </div>

            <!-- Bubble Row: Date & Reply shown at Left for Admin, Right for Client -->
            <div
              class="flex items-end gap-1.5 max-w-full"
              :class="isCommentClientSide(comment) ? 'flex-row' : 'flex-row-reverse'"
            >
              <!-- Speech Bubble Card (Compact & smaller font size: text-[11px] sm:text-xs) -->
              <div
                class="w-fit max-w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs rounded-2xl shadow-2xs text-left bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700/60 text-slate-800 dark:text-slate-200"
                :class="isCommentClientSide(comment) ? 'rounded-tl-sm' : 'rounded-tr-sm'"
              >
                <!-- Replying-to Quote Banner -->
                <div
                  v-if="comment.parent_id && getParentPreview(comment.parent_id, comment.parent)"
                  @click="jumpToComment(comment.parent_id)"
                  class="mb-1.5 p-1 sm:p-1.5 rounded-lg border-l-[3px] border-indigo-500 bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors cursor-pointer select-none text-left text-slate-700 dark:text-slate-200"
                  title="Click to jump to original message"
                >
                  <div
                    class="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                  >
                    <CornerUpLeft class="w-2.5 h-2.5 shrink-0" />
                    <span class="truncate">{{
                      getParentPreview(comment.parent_id, comment.parent)?.authorName
                    }}</span>
                  </div>
                  <p class="text-[9px] sm:text-[10px] truncate max-w-sm mt-0.5 opacity-90">
                    {{ getParentPreview(comment.parent_id, comment.parent)?.text }}
                  </p>
                </div>

                <!-- Comment Body Text -->
                <p v-if="comment.body" class="leading-relaxed whitespace-pre-wrap break-words">
                  {{ comment.body }}
                </p>

                <!-- Attachments & Snapshots Gallery -->
                <div
                  v-if="getCommentAttachments(comment).length > 0"
                  class="flex flex-wrap gap-1.5"
                  :class="
                    comment.body
                      ? 'mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/50'
                      : ''
                  "
                >
                  <template v-for="att in getCommentAttachments(comment)" :key="att.id">
                    <!-- Image thumbnail (Compact: w-8 h-8 sm:w-9 sm:h-9) -->
                    <div
                      v-if="att.isImage"
                      class="group/img relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-2xs shrink-0 cursor-pointer hover:shadow-md transition-all duration-200"
                      :title="att.name + (att.sizeText ? ' (' + att.sizeText + ')' : '')"
                      @click="openImagePreview(att.url)"
                    >
                      <img
                        :src="att.url"
                        :alt="att.name"
                        @load="onImageLoad"
                        class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover/img:scale-110"
                      />
                      <span class="sr-only">{{ formatAttachmentDisplayName(att.name) }}</span>
                      <div
                        class="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px] opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-1 text-white transition-opacity duration-150"
                      >
                        <button
                          type="button"
                          @click.stop="openImagePreview(att.url)"
                          class="p-0.5 rounded bg-white/20 hover:bg-white/35 text-white transition-colors cursor-pointer"
                          title="Zoom image"
                        >
                          <ZoomIn class="w-3 h-3" />
                        </button>
                        <a
                          :href="safeUrl(att.url)"
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          class="p-0.5 rounded bg-white/20 hover:bg-white/35 text-white transition-colors cursor-pointer"
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
                      class="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-lg text-[10px] shadow-2xs transition-all border border-slate-200/80 dark:border-slate-700/70 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    >
                      <FileText class="w-3 h-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <span class="font-medium truncate max-w-[110px]" :title="att.name">
                        {{ formatAttachmentDisplayName(att.name) }}
                      </span>
                      <span v-if="att.sizeText" class="text-[9px] opacity-75">
                        {{ att.sizeText }}
                      </span>
                      <a
                        :href="safeUrl(att.url)"
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        class="p-0.5 rounded transition-colors text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Download"
                      >
                        <Download class="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Date and Reply Action (at LEFT of comment for Admin, RIGHT of comment for Client) -->
              <div
                class="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 shrink-0 select-none pb-0.5 opacity-70 group-hover:opacity-100 transition-opacity"
                :class="isCommentClientSide(comment) ? 'flex-row' : 'flex-row-reverse'"
              >
                <span
                  class="font-normal whitespace-nowrap"
                  :title="formatDate(comment.created_at)"
                >
                  {{ formatRelativeTime(comment.created_at) }}
                </span>
                <span class="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  @click="startReply(comment)"
                  class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Reply to comment"
                >
                  <Reply class="w-2.5 h-2.5" />
                  <span>Reply</span>
                </button>
              </div>
            </div>

            <!-- Replies count indicator if comment has replies -->
            <div
              v-if="comment.replies_count && comment.replies_count > 0"
              class="flex items-center gap-1 px-1 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium"
              :class="isCommentClientSide(comment) ? 'justify-start' : 'justify-end'"
            >
              <CornerDownRight class="w-2.5 h-2.5 text-indigo-500" />
              <span
                >{{ comment.replies_count }}
                {{ comment.replies_count === 1 ? 'reply' : 'replies' }}</span
              >
            </div>
          </div>
        </div>

        <!-- Sentinel element for auto-scroll and bottom anchoring -->
        <div
          ref="commentsBottomSentinelRef"
          data-testid="comments-bottom-sentinel"
          class="h-0.5 w-full pointer-events-none"
          aria-hidden="true"
        ></div>
      </div>

      <!-- Telegram / Messenger Style Floating Scroll-to-Bottom Button -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-3 scale-75"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-2 scale-75"
      >
        <button
          v-if="showScrollToBottom"
          type="button"
          data-testid="scroll-to-bottom-btn"
          @click="scrollToBottom(true)"
          class="absolute bottom-24 right-3 sm:bottom-28 sm:right-4 z-20 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/80 shadow-lg hover:shadow-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all cursor-pointer backdrop-blur-md group"
          title="Scroll to latest comment"
          aria-label="Scroll to latest comment"
        >
          <ChevronDown
            class="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-y-0.5"
          />
          <span
            v-if="unreadCountWhileScrolled > 0"
            class="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs"
          >
            {{ unreadCountWhileScrolled > 99 ? '99+' : unreadCountWhileScrolled }}
          </span>
        </button>
      </Transition>

      <!-- ========================================================= -->
      <!-- 2-MODE COMPOSER: Compact 1-Row Bar & Full Expanded Editor  -->
      <!-- ========================================================= -->
      <div data-testid="comments-composer" class="relative shrink-0 pt-1 pb-0.5">
        <!-- MODE A: Single Row Compact Input Bar (attachmentIcon - input - sendbutton) -->
        <div
          v-show="!shouldShowExpandedComposer"
          data-testid="compact-composer-bar"
          class="flex items-center gap-1.5 p-1 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
        >
          <!-- Attachment Icon Button -->
          <button
            type="button"
            @click="composerFileInputRef?.click()"
            class="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Attach files or screenshots"
          >
            <Paperclip class="w-4 h-4" />
          </button>

          <!-- 1-Row Input (Expands on focus / click / enter) -->
          <input
            data-testid="compact-composer-input"
            type="text"
            placeholder="Write a comment... (Enter to type)"
            class="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none py-1.5 px-2 cursor-text"
            @click="expandComposer"
            @focus="expandComposer"
            @keydown.enter.prevent="expandComposer"
          />

          <!-- Send Icon Button -->
          <button
            type="button"
            @click="expandComposer"
            class="w-8 h-8 rounded-full flex items-center justify-center text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            title="Open comment editor"
          >
            <Send class="w-3.5 h-3.5 translate-x-px" />
          </button>
        </div>

        <!-- MODE B: Full Multi-Line Rich Textarea Composer -->
        <div
          v-show="shouldShowExpandedComposer"
          data-testid="expanded-composer-box"
          class="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-200 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20"
        >
          <!-- 1. Replying-To Banner -->
          <div
            v-if="replyingToComment"
            data-testid="composer-reply-banner"
            class="px-3.5 py-2 bg-indigo-50/80 dark:bg-indigo-950/50 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2"
          >
            <div class="flex items-center gap-2 min-w-0">
              <CornerUpLeft class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div class="text-xs truncate">
                <span class="font-bold text-indigo-900 dark:text-indigo-200">
                  Replying to {{ getAuthorDisplayName(replyingToComment) }}
                </span>
                <span class="text-indigo-600/70 dark:text-indigo-400/70 ml-1.5 truncate">
                  "{{ replyingToComment.body?.substring(0, 45) }}..."
                </span>
              </div>
            </div>
            <button
              type="button"
              @click="cancelReply"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              title="Cancel reply"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- 2. Attached Files Preview Strip -->
          <div
            v-if="composerFiles.length > 0"
            class="p-2 sm:p-2.5 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto"
          >
            <div v-for="(f, i) in composerFiles" :key="f.id" class="shrink-0 relative group">
              <!-- Thumbnail Image Preview -->
              <div
                v-if="f.isImage && f.dataUrl"
                @click="openImagePreview(f.dataUrl)"
                class="w-12 h-12 rounded-lg overflow-hidden relative cursor-pointer bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs group-hover:ring-2 group-hover:ring-indigo-500/30 transition-all"
                :title="f.name"
              >
                <img :src="f.dataUrl" :alt="f.name" class="w-full h-full object-cover" />
                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                >
                  <ZoomIn class="w-3 h-3" />
                </div>
                <button
                  type="button"
                  @click.stop="removeComposerFile(i)"
                  class="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer z-2"
                  title="Remove image"
                >
                  <X class="w-2 h-2" />
                </button>
              </div>

              <!-- Non-image file pill -->
              <div
                v-else
                class="h-10 px-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs"
              >
                <FileText class="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <div class="max-w-[100px] truncate">
                  <p
                    class="text-[10px] font-medium text-slate-800 dark:text-slate-200 truncate"
                    :title="f.name"
                  >
                    {{ f.name }}
                  </p>
                </div>
                <button
                  type="button"
                  @click="removeComposerFile(i)"
                  class="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer transition-colors shrink-0"
                  title="Remove file"
                >
                  <X class="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Textarea Input Area -->
          <div class="p-2 sm:p-2.5">
            <textarea
              ref="composerTextareaRef"
              v-model="composerBody"
              @keydown="handleComposerKeydown"
              rows="2"
              :placeholder="
                replyingToComment
                  ? 'Write a reply to ' +
                    getAuthorDisplayName(replyingToComment) +
                    '... (Enter to send)'
                  : 'Write a comment... (Enter to send, Shift+Enter for new line)'
              "
              class="w-full text-xs sm:text-[13px] px-2 py-1 bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-y min-h-[44px] max-h-[140px]"
            ></textarea>
          </div>

          <!-- 4. Bottom Action Bar -->
          <div
            class="px-3 py-1.5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2"
          >
            <div class="flex items-center gap-2">
              <!-- Attach File Button -->
              <button
                type="button"
                @click="composerFileInputRef?.click()"
                class="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Attach screenshot or file"
              >
                <Paperclip class="w-3.5 h-3.5" />
                <span class="text-xs hidden sm:inline">Attach</span>
              </button>

              <span class="text-[11px] text-slate-400 dark:text-slate-500 hidden md:inline ml-1">
                Press
                <kbd class="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]"
                  >Enter</kbd
                >
                to send
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <!-- Collapse button to minimize back to 1-row if desired -->
              <button
                type="button"
                @click="collapseComposerManual"
                class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Minimize composer"
              >
                <ChevronDown class="w-4 h-4" />
              </button>

              <!-- Send Button -->
              <button
                type="button"
                @click="submitComposerComment"
                :disabled="
                  ticketStore.isPostingComment ||
                  (!composerBody.trim() && composerFiles.length === 0)
                "
                class="w-8 h-8 rounded-full flex items-center justify-center text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                :title="replyingToComment ? 'Send Reply' : 'Send Comment'"
              >
                <Send v-if="!ticketStore.isPostingComment" class="w-3.5 h-3.5 translate-x-px" />
                <span
                  v-else
                  class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                ></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Hidden input for file picking -->
        <input
          ref="composerFileInputRef"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json"
          class="hidden"
          @change="onComposerFileSelect"
        />
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- TAB 2 CONTENT: Audit Trail Timeline (Scrollable)           -->
    <!-- ========================================================= -->
    <div
      v-show="ticketStore.activeDetailTab === 'audits'"
      data-testid="audit-history-tab"
      class="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin"
    >
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
