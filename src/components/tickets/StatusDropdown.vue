<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { TicketStatus } from '@/types/ticket';
import { useTicketStore } from '@/stores/ticketStore';
import { ChevronDown, Check, AlertCircle } from 'lucide-vue-next';

interface StatusConfig {
  value: TicketStatus;
  label: string;
  dotColor: string;
  badgeStyle: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: TicketStatus;
    disabled?: boolean;
    size?: 'xs' | 'sm' | 'md';
    showTransitionCheck?: boolean;
    placement?: 'left' | 'right';
  }>(),
  {
    disabled: false,
    size: 'sm',
    showTransitionCheck: true,
    placement: 'left',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: TicketStatus): void;
  (e: 'change', value: TicketStatus): void;
}>();

const ticketStore = useTicketStore();
const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const statuses: StatusConfig[] = [
  {
    value: 'open',
    label: 'Open',
    dotColor: 'bg-indigo-500',
    badgeStyle: 'text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    dotColor: 'bg-amber-500',
    badgeStyle: 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10',
  },
  {
    value: 'resolved',
    label: 'Resolved',
    dotColor: 'bg-emerald-500',
    badgeStyle: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    value: 'closed',
    label: 'Closed',
    dotColor: 'bg-slate-500',
    badgeStyle: 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/40',
  },
];

const currentConfig = computed(() => {
  return statuses.find((s) => s.value === props.modelValue) || statuses[0]!;
});

function isTransitionAllowed(targetStatus: TicketStatus): boolean {
  if (!props.showTransitionCheck) return true;
  if (props.modelValue === targetStatus) return true;
  return ticketStore.isValidTransition(props.modelValue, targetStatus);
}

function toggle() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function select(status: TicketStatus) {
  if (!isTransitionAllowed(status)) return;
  emit('update:modelValue', status);
  emit('change', status);
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="containerRef" class="relative inline-block text-left select-none">
    <!-- Trigger Button -->
    <button
      type="button"
      @click.stop="toggle"
      :disabled="disabled"
      class="inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
      :class="[
        currentConfig.badgeStyle,
        size === 'xs' ? 'px-2 py-0.5 text-[11px]' : '',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : '',
        size === 'md' ? 'px-3 py-1.5 text-sm' : '',
      ]"
    >
      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="currentConfig.dotColor"></span>
      <span class="truncate">{{ currentConfig.label }}</span>
      <ChevronDown
        class="w-3 h-3 opacity-60 transition-transform duration-200 shrink-0"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 min-w-[150px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 py-1 focus:outline-none"
        :class="placement === 'right' ? 'right-0' : 'left-0'"
      >
        <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
          Change Status
        </div>

        <div class="p-1 space-y-0.5">
          <div
            v-for="s in statuses"
            :key="s.value"
            @click.stop="select(s.value)"
            class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            :class="[
              !isTransitionAllowed(s.value)
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : s.value === modelValue
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold cursor-default'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer'
            ]"
            :title="!isTransitionAllowed(s.value) ? `Transition from ${modelValue} to ${s.value} is not allowed` : undefined"
          >
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0" :class="s.dotColor"></span>
              <span>{{ s.label }}</span>
            </div>

            <Check
              v-if="s.value === modelValue"
              class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2"
            />
            <AlertCircle
              v-else-if="!isTransitionAllowed(s.value)"
              class="w-3 h-3 text-slate-400 shrink-0 ml-2"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
