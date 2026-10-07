<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useTicketStore } from '@/stores/ticketStore';
import { useToastStore } from '@/stores/toastStore';
import type { TicketType, TicketPriority } from '@/types/ticket';
import CustomSelect, { type SelectOption } from '@/components/common/CustomSelect.vue';
import BaseInput from '@/components/common/BaseInput.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import {
  X,
  PlusCircle,
  Bug,
  Sparkles,
  HelpCircle,
  CheckSquare,
  Building2,
  Globe,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Trash2,
  Paperclip,
  User,
  Mail,
  Phone,
  Ticket as TicketIcon
} from 'lucide-vue-next';

const ticketStore = useTicketStore();
const toastStore = useToastStore();

const form = reactive({
  title: '',
  description: '',
  type: 'bug' as TicketType,
  priority: 'high' as TicketPriority,
  source: 'portal',
  client_name: 'Acme Corp Client Portal',
  reporter_name: 'Admin Staff',
  reporter_email: 'admin@bronx.test',
  reporter_phone: '012345678',
});

// Attachments state
interface AttachedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

const attachedFiles = ref<AttachedFileItem[]>([]);
const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isSubmitting = ref(false);

const typeOptions: SelectOption[] = [
  { label: 'Bug Report', value: 'bug', icon: Bug },
  { label: 'Enhancement', value: 'enhancement', icon: Sparkles },
  { label: 'Question', value: 'question', icon: HelpCircle },
  { label: 'Task / Chore', value: 'task', icon: CheckSquare },
];

const priorityOptions: SelectOption[] = [
  { label: 'Low', value: 'low', dotColor: 'bg-emerald-500' },
  { label: 'Medium', value: 'medium', dotColor: 'bg-sky-500' },
  { label: 'High', value: 'high', dotColor: 'bg-amber-500' },
  { label: 'Critical', value: 'critical', dotColor: 'bg-rose-500' },
];

const sourceOptions: SelectOption[] = [
  { label: 'Internal Portal', value: 'portal', icon: Building2 },
  { label: 'Client API / Webhook', value: 'api', icon: Globe },
];

function triggerFileInput() {
  fileInputRef.value?.click();
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function addFiles(files: FileList | File[]) {
  const maxFiles = 10;
  const maxSizeBytes = 10 * 1024 * 1024; // 10MB

  const fileArray = Array.from(files);
  for (const file of fileArray) {
    if (attachedFiles.value.length >= maxFiles) {
      toastStore.warning('File Limit Exceeded', `You can upload a maximum of ${maxFiles} attachments.`);
      break;
    }

    if (file.size > maxSizeBytes) {
      toastStore.error('File Too Large', `"${file.name}" exceeds the 10MB size limit.`);
      continue;
    }

    const exists = attachedFiles.value.some(
      (item) => item.name === file.name && item.size === file.size
    );
    if (exists) continue;

    let previewUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file);
    }

    attachedFiles.value.push({
      id: Math.random().toString(36).substring(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
    });
  }

  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    addFiles(target.files);
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    addFiles(event.dataTransfer.files);
  }
}

function removeFile(index: number) {
  const removed = attachedFiles.value.splice(index, 1)[0];
  if (removed?.previewUrl) {
    URL.revokeObjectURL(removed.previewUrl);
  }
}

function clearAllFiles() {
  attachedFiles.value.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  attachedFiles.value = [];
}

function getFileIcon(mime: string, name: string) {
  if (mime.includes('pdf')) return FileText;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet;
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html') || name.endsWith('.ts') || name.endsWith('.php')) return FileCode;
  return FileIcon;
}

function closeModal() {
  ticketStore.isCreateModalOpen = false;
}

async function handleSubmit() {
  if (!form.title.trim()) {
    toastStore.warning('Validation Error', 'Ticket title is required.');
    return;
  }

  isSubmitting.value = true;
  const rawFiles = attachedFiles.value.map((f) => f.file);

  const success = await ticketStore.createTicket({
    title: form.title,
    description: form.description,
    type: form.type,
    priority: form.priority,
    source: form.source,
    client_name: form.client_name,
    reporter_name: form.reporter_name,
    reporter_email: form.reporter_email,
    reporter_phone: form.reporter_phone,
    files: rawFiles,
  });

  isSubmitting.value = false;
  if (success) {
    clearAllFiles();
    form.title = '';
    form.description = '';
    form.type = 'bug';
    form.priority = 'high';
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && ticketStore.isCreateModalOpen) {
    closeModal();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape);
  clearAllFiles();
});
</script>

<template>
  <div
    v-if="ticketStore.isCreateModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
  >
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 shrink-0">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 shadow-xs">
            <TicketIcon class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">Create New Ticket</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Submit a support ticket or client issue to triage</p>
          </div>
        </div>

        <button
          type="button"
          @click="closeModal"
          class="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close modal"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Modal Body (Form) -->
      <form @submit.prevent="handleSubmit" class="flex flex-col flex-1 overflow-hidden">
        <div class="p-6 space-y-5 overflow-y-auto flex-1">
          <!-- Ticket Title -->
          <BaseInput
            v-model="form.title"
            label="Ticket Title"
            required
            placeholder="e.g. Payment gateway timeout on step 3 checkout"
            size="md"
            :icon="TicketIcon"
          />

          <!-- Classification Grid: Type, Priority, Source (3 Equal Columns) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <!-- Type -->
            <div class="w-full">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Type <span class="text-rose-500">*</span>
              </label>
              <CustomSelect
                v-model="form.type"
                :options="typeOptions"
                :block="true"
                size="md"
                placeholder="Select Type"
              />
            </div>

            <!-- Priority -->
            <div class="w-full">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Priority <span class="text-rose-500">*</span>
              </label>
              <CustomSelect
                v-model="form.priority"
                :options="priorityOptions"
                :block="true"
                size="md"
                placeholder="Select Priority"
              />
            </div>

            <!-- Source -->
            <div class="w-full">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Source
              </label>
              <CustomSelect
                v-model="form.source"
                :options="sourceOptions"
                :block="true"
                size="md"
                placeholder="Select Source"
              />
            </div>
          </div>

          <!-- Client Organization / Origin -->
          <BaseInput
            v-model="form.client_name"
            label="Client Organization / Origin"
            placeholder="e.g. Acme Corp Client Portal"
            size="md"
            :icon="Building2"
          />

          <!-- Description Textarea -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Description
              </label>
              <span class="text-[11px] text-slate-400">Markdown supported</span>
            </div>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Provide a detailed description of the issue, error logs, or steps to reproduce..."
              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-normal resize-y"
            ></textarea>
          </div>

          <!-- Attachments Upload Section -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <Paperclip class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <label class="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Attachments
                </label>
                <span
                  v-if="attachedFiles.length > 0"
                  class="ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"
                >
                  {{ attachedFiles.length }} / 10
                </span>
              </div>
              <span class="text-[11px] text-slate-400">Max 10MB per file</span>
            </div>

            <!-- Hidden Native File Input -->
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              @change="handleFileInputChange"
              class="hidden"
            />

            <!-- Drag & Drop Zone -->
            <div
              @click="triggerFileInput"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              class="border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all select-none"
              :class="[
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 scale-[0.99]'
                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20'
              ]"
            >
              <div class="flex flex-col items-center justify-center gap-1.5">
                <div class="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs">
                  <UploadCloud class="w-5 h-5" />
                </div>
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span class="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/50">Click to upload</span>
                  or drag & drop files here
                </p>
                <p class="text-[11px] text-slate-400">
                  PNG, JPG, PDF, DOCX, CSV or TXT (up to 10 files)
                </p>
              </div>
            </div>

            <!-- Attached Files Preview Grid -->
            <div v-if="attachedFiles.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div
                v-for="(item, index) in attachedFiles"
                :key="item.id"
                class="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 group transition-all shadow-2xs"
              >
                <div class="flex items-center gap-2.5 min-w-0 pr-2">
                  <!-- Thumbnail preview or file icon -->
                  <div class="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-300/60 dark:border-slate-700">
                    <img
                      v-if="item.previewUrl"
                      :src="item.previewUrl"
                      alt="preview"
                      class="w-full h-full object-cover"
                    />
                    <component
                      v-else
                      :is="getFileIcon(item.type, item.name)"
                      class="w-4 h-4 text-slate-500 dark:text-slate-400"
                    />
                  </div>

                  <!-- Name & Size -->
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" :title="item.name">
                      {{ item.name }}
                    </p>
                    <p class="text-[10px] text-slate-400 font-mono">
                      {{ formatFileSize(item.size) }}
                    </p>
                  </div>
                </div>

                <!-- Remove Button -->
                <button
                  type="button"
                  @click.stop="removeFile(index)"
                  class="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                  title="Remove file"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- Reporter Contact Section (3 Equal Columns) -->
          <div class="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Reporter Contact Details
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <BaseInput
                v-model="form.reporter_name"
                label="Name"
                size="md"
                placeholder="Reporter Name"
                :icon="User"
              />
              <BaseInput
                v-model="form.reporter_email"
                label="Email"
                type="email"
                size="md"
                placeholder="reporter@domain.com"
                :icon="Mail"
              />
              <BaseInput
                v-model="form.reporter_phone"
                label="Phone"
                size="md"
                placeholder="e.g. 012345678"
                :icon="Phone"
              />
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between shrink-0">
          <span class="text-xs text-slate-400 hidden sm:inline">
            Press <kbd class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Esc</kbd> to dismiss
          </span>
          <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <BaseButton
              variant="outline"
              size="md"
              type="button"
              @click="closeModal"
            >
              Cancel
            </BaseButton>
            <BaseButton
              variant="primary"
              size="md"
              type="submit"
              :loading="isSubmitting"
              :icon="PlusCircle"
            >
              Create Ticket
            </BaseButton>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
