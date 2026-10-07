<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: string | number
    type?: string
    placeholder?: string
    label?: string
    labelClass?: string
    error?: string
    icon?: any
    disabled?: boolean
    required?: boolean
    size?: 'sm' | 'md'
  }>(),
  {
    type: 'text',
    placeholder: '',
    disabled: false,
    required: false,
    size: 'sm',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="w-full text-left">
    <!-- Label -->
    <div
      v-if="label || $slots.label || $slots['label-right']"
      class="flex items-center justify-between mb-1.5"
    >
      <label
        v-if="label || $slots.label"
        class="block"
        :class="
          labelClass ||
          'text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300'
        "
      >
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="text-rose-500 ml-0.5">*</span>
      </label>
      <slot name="label-right" />
    </div>

    <!-- Input Wrapper -->
    <div class="relative w-full">
      <!-- Leading Icon -->
      <component
        v-if="icon"
        :is="icon"
        class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 shrink-0 pointer-events-none"
      />

      <input
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        @input="onInput"
        class="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl border transition-all focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
          icon ? 'pl-10' : 'pl-3.5',
          size === 'md' ? 'h-10 text-sm pr-4' : 'h-8 text-xs pr-3',
          error
            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-200 dark:border-slate-800',
        ]"
      />

      <!-- Suffix Slot -->
      <div v-if="$slots.suffix" class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        <slot name="suffix" />
      </div>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="text-[11px] text-rose-500 mt-1 font-medium">
      {{ error }}
    </p>
  </div>
</template>
