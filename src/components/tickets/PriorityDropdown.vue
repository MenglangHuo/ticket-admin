<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { TicketPriority } from '@/types/ticket';
import { ChevronDown, Check } from 'lucide-vue-next';

interface PriorityConfig {
  value: TicketPriority;
  label: string;
  dotColor: string;
  badgeStyle: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: TicketPriority;
    disabled?: boolean;
    size?: 'xs' | 'sm' | 'md';
    placement?: 'left' | 'right';
  }>(),
  {
    disabled: false,
    size: 'sm',
    placement: 'left',
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: TicketPriority): void;
  (e: 'change', value: TicketPriority): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const priorities: PriorityConfig[] = [
  {
    value: 'critical',
    label: 'Critical',
    dotColor: 'bg-rose-500',
    badgeStyle: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30',
  },
  {
    value: 'high',
    label: 'High',
    dotColor: 'bg-amber-500',
    badgeStyle: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30',
  },
  {
    value: 'medium',
    label: 'Medium',
    dotColor: 'bg-sky-500',
    badgeStyle: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30',
  },
  {
    value: 'low',
    label: 'Low',
    dotColor: 'bg-slate-400',
    badgeStyle: 'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700/40',
  },
];

const currentConfig = computed(() => {
  return priorities.find((p) => p.value === props.modelValue) || priorities[2]!;
});

function toggle() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function select(priority: TicketPriority) {
  emit('update:modelValue', priority);
  emit('change', priority);
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
        class="absolute z-50 mt-1 min-w-[140px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 py-1 focus:outline-none"
        :class="placement === 'right' ? 'right-0' : 'left-0'"
      >
        <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
          Change Priority
        </div>

        <div class="p-1 space-y-0.5">
          <div
            v-for="p in priorities"
            :key="p.value"
            @click.stop="select(p.value)"
            class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
            :class="[
              p.value === modelValue
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
            ]"
          >
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0" :class="p.dotColor"></span>
              <span>{{ p.label }}</span>
            </div>

            <Check
              v-if="p.value === modelValue"
              class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
