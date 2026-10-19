<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useTicketStore } from '@/stores/ticketStore'
import { useToastStore } from '@/stores/toastStore'
import type { TicketPriority, TicketType } from '@/types/ticket'
import CustomSelect, { type SelectOption } from '@/components/common/CustomSelect.vue'
import {
  X,
  Edit3,
  Sparkles,
  ShieldAlert,
} from 'lucide-vue-next'

const ticketStore = useTicketStore()
const toastStore = useToastStore()

const form = reactive({
  title: '',
  description: '',
  type: 'bug' as TicketType,
  priority: 'medium' as TicketPriority,
  audit_reason: '',
})

const quickReasons = [
  'Corrected title grammar & typos',
  'Clarified issue reproduction steps',
  'Added missing environment details',
  'Adjusted priority & severity',
]

function selectQuickReason(reason: string) {
  if (!form.audit_reason) {
    form.audit_reason = reason
  } else {
    form.audit_reason += `; ${reason}`
  }
}

// Sync form with selected ticket when modal opens
watch(
  () => ticketStore.isEditTicketModalOpen,
  (isOpen) => {
    if (isOpen && ticketStore.selectedTicket) {
      form.title = ticketStore.selectedTicket.title || ''
      form.description = ticketStore.selectedTicket.description || ''
      form.type = ticketStore.selectedTicket.type || 'bug'
      form.priority = ticketStore.selectedTicket.priority || 'medium'
      form.audit_reason = ''
    }
  },
  { immediate: true }
)

const typeOptions: SelectOption[] = [
  { label: 'Bug / Defect', value: 'bug' },
  { label: 'Feature Enhancement', value: 'enhancement' },
  { label: 'Question / Inquiry', value: 'question' },
  { label: 'Task / Chore', value: 'task' },
]

const priorityOptions: SelectOption[] = [
  { label: 'Critical', value: 'critical', dotColor: 'bg-rose-500' },
  { label: 'High', value: 'high', dotColor: 'bg-amber-500' },
  { label: 'Medium', value: 'medium', dotColor: 'bg-sky-500' },
  { label: 'Low', value: 'low', dotColor: 'bg-slate-400' },
]

async function handleSubmit() {
  if (!ticketStore.selectedTicket) return

  if (!form.title.trim()) {
    toastStore.warning('Title Required', 'Ticket title cannot be empty.')
    return
  }

  // Check if anything actually changed
  const current = ticketStore.selectedTicket
  const hasChanged =
    form.title.trim() !== current.title ||
    form.description.trim() !== (current.description || '').trim() ||
    form.type !== current.type ||
    form.priority !== current.priority

  if (!hasChanged) {
    toastStore.info('No Changes', 'No fields were modified.')
    ticketStore.isEditTicketModalOpen = false
    return
  }

  const success = await ticketStore.updateTicketDetails(current.id, {
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    priority: form.priority,
    audit_reason: form.audit_reason.trim() || undefined,
  })

  if (success) {
    ticketStore.activeDetailTab = 'audits'
  }
}
</script>

<template>
  <div
    v-if="ticketStore.isEditTicketModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
    @click.self="ticketStore.isEditTicketModalOpen = false"
  >
    <!-- Modal Dialog -->
    <div
      class="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div
        class="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/50"
      >
        <div class="flex items-center gap-2.5">
          <div
            class="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0"
          >
            <Edit3 class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Modify Ticket & Record Audit
              </h3>
              <span
                v-if="ticketStore.selectedTicket"
                class="px-2 py-0.5 rounded-lg text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60"
              >
                {{ ticketStore.selectedTicket.ticket_key }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Fix grammar, improve title clarity, or update details. All edits are logged.
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="ticketStore.isEditTicketModalOpen = false"
          class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Scrollable Form Body -->
      <form @submit.prevent="handleSubmit" class="p-5 overflow-y-auto space-y-4 flex-1">
        <!-- Title Field -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Ticket Title <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="form.title"
            type="text"
            required
            maxlength="500"
            placeholder="e.g. Payment Gateway Timeout on ABA KHQR during checkout"
            class="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
          <div class="flex justify-between items-center mt-1 text-[11px] text-slate-400">
            <span>Clarify client grammar or specify exact symptoms</span>
            <span>{{ form.title.length }}/500</span>
          </div>
        </div>

        <!-- Type & Priority Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Issue Type
            </label>
            <CustomSelect
              v-model="form.type"
              :options="typeOptions"
              size="md"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Priority Level
            </label>
            <CustomSelect
              v-model="form.priority"
              :options="priorityOptions"
              size="md"
            />
          </div>
        </div>

        <!-- Description Field -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Description</span>
            <span class="text-[11px] font-normal text-slate-400">Supports text & HTML formatting</span>
          </label>
          <textarea
            v-model="form.description"
            rows="6"
            placeholder="Provide accurate, polished description or reproduction steps..."
            class="w-full text-xs sm:text-[13px] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono leading-relaxed resize-y min-h-[120px]"
          ></textarea>
        </div>

        <!-- Audit Reason Field (Highlighted UX) -->
        <div
          class="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5"
        >
          <div class="flex items-center gap-2">
            <Sparkles class="w-4 h-4 text-amber-500 shrink-0" />
            <label class="text-xs font-bold text-amber-900 dark:text-amber-200">
              Audit Reason / Note <span class="font-normal text-amber-700 dark:text-amber-400">(Recommended)</span>
            </label>
          </div>

          <input
            v-model="form.audit_reason"
            type="text"
            placeholder="e.g. Fixed grammatical mistakes and added missing reproduction steps"
            class="w-full text-xs px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:text-slate-400"
          />

          <!-- Quick Suggestion Chips -->
          <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              Quick insert:
            </span>
            <button
              v-for="reason in quickReasons"
              :key="reason"
              type="button"
              @click="selectQuickReason(reason)"
              class="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 transition-colors cursor-pointer shadow-2xs"
            >
              + {{ reason }}
            </button>
          </div>

          <!-- Compliance Note -->
          <p class="text-[10px] text-amber-800/80 dark:text-amber-300/70 flex items-center gap-1.5 pt-1">
            <ShieldAlert class="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Your staff identity, timestamp, IP address, and exact change diff will be permanently recorded in the audit trail.
            </span>
          </p>
        </div>
      </form>

      <!-- Footer Action Buttons -->
      <div
        class="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-end gap-2.5"
      >
        <button
          type="button"
          @click="ticketStore.isEditTicketModalOpen = false"
          :disabled="ticketStore.isSavingTicketEdit"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="button"
          @click="handleSubmit"
          :disabled="ticketStore.isSavingTicketEdit || !form.title.trim()"
          class="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span
            v-if="ticketStore.isSavingTicketEdit"
            class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
          ></span>
          <Edit3 v-else class="w-3.5 h-3.5" />
          <span>Save & Record Audit</span>
        </button>
      </div>
    </div>
  </div>
</template>
