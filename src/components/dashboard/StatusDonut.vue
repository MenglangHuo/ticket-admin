<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TicketStatus } from '@/types/ticket'
import { MoreHorizontal } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    byStatus: Record<TicketStatus, number>
    loading?: boolean
  }>(),
  {
    loading: false,
  }
)

const activeHoverKey = ref<string | null>(null)
const pinnedKey = ref<string | null>(null)
const showTotalToggle = ref(false)

const total = computed(() => {
  return (
    (props.byStatus?.open || 0) +
    (props.byStatus?.in_progress || 0) +
    (props.byStatus?.resolved || 0) +
    (props.byStatus?.closed || 0)
  )
})

// Visual sequence and palette directly matching media_1791360377810.png:
// 1. Vibrant Purple (#6c49e4) -> Open
// 2. Vibrant Warm Orange (#fe9f2c) -> In Progress
// 3. Vibrant Royal Blue (#5976e4) -> Closed
// 4. Vibrant Aqua/Cyan (#10e2f6) -> Resolved
const statusMeta = [
  { key: 'open' as TicketStatus, label: 'Open', color: '#6c49e4' },
  { key: 'in_progress' as TicketStatus, label: 'In Progress', color: '#fe9f2c' },
  { key: 'closed' as TicketStatus, label: 'Closed', color: '#5976e4' },
  { key: 'resolved' as TicketStatus, label: 'Resolved', color: '#10e2f6' },
]

const segments = computed(() => {
  const t = total.value || 1
  return statusMeta.map((meta) => {
    const count = props.byStatus?.[meta.key] || 0
    const rawPercent = (count / t) * 100
    return {
      ...meta,
      count,
      percent: Math.round(rawPercent),
      formattedPercent: rawPercent.toFixed(1) + '%',
      share: count / t,
    }
  })
})

// Dominant category with the highest volume share
const dominantSegment = computed(() => {
  if (total.value === 0) return null
  return [...segments.value].sort((a, b) => b.count - a.count)[0]
})

// Donut geometry:
// Radius = 38, Stroke Width = 13.5
// Circumference = 2 * PI * 38 ≈ 238.761
// Active circumference covers the full 100% of the circle (360°)
const RADIUS = 38
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const visibleArcs = computed(() => {
  const t = total.value
  if (t === 0) return []

  // Filter items with count > 0 to render clean rounded segments
  const nonZero = segments.value.filter((s) => s.count > 0)
  let cumulative = 0

  return nonZero.map((seg) => {
    const arcLength = Math.max(seg.share * CIRCUMFERENCE, 1)
    const dashArray = `${arcLength} ${CIRCUMFERENCE}`
    const dashOffset = -cumulative
    cumulative += arcLength

    return {
      ...seg,
      arcLength,
      dashArray,
      dashOffset,
    }
  })
})

const firstArc = computed(() => (visibleArcs.value.length > 0 ? visibleArcs.value[0] : null))

const activeKey = computed(() => activeHoverKey.value || pinnedKey.value)

const currentCenterDisplay = computed(() => {
  if (total.value === 0) {
    return {
      value: '0',
      label: 'Tickets',
    }
  }

  if (showTotalToggle.value && !activeKey.value) {
    return {
      value: `${total.value}`,
      label: 'Tickets',
    }
  }

  if (activeKey.value) {
    const match = segments.value.find((s) => s.key === activeKey.value)
    if (match) {
      return {
        value: match.formattedPercent,
        label: match.label,
      }
    }
  }

  // Default to dominant category (matching 52.3% Shopping from reference design)
  if (dominantSegment.value) {
    return {
      value: dominantSegment.value.formattedPercent,
      label: dominantSegment.value.label,
    }
  }

  return {
    value: `${total.value}`,
    label: 'Tickets',
  }
})

function handleSegmentClick(key: string) {
  if (pinnedKey.value === key) {
    pinnedKey.value = null
  } else {
    pinnedKey.value = key
    showTotalToggle.value = false
  }
}

function handleCenterClick() {
  if (pinnedKey.value) {
    pinnedKey.value = null
  } else {
    showTotalToggle.value = !showTotalToggle.value
  }
}
</script>

<template>
  <div
    class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-100/90 dark:border-slate-800/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-md transition-all duration-200 flex flex-col justify-between"
  >
    <!-- Header: Title and Total Count on Left, Options Action on Right -->
    <div class="flex items-center justify-between pb-1">
      <div class="flex items-center gap-2">
        <h3 class="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
          Tickets by Status
        </h3>
        <span
          class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono"
        >
          {{ total }} Total
        </span>
      </div>

      <button
        type="button"
        title="More options"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <MoreHorizontal class="w-4 h-4" />
      </button>
    </div>

    <!-- Skeleton Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-6 space-y-3 animate-pulse">
      <div class="w-32 h-32 rounded-full border-8 border-slate-100 dark:border-slate-800"></div>
      <div class="grid grid-cols-2 gap-3 w-full pt-2">
        <div v-for="i in 4" :key="i" class="h-4 bg-slate-100 dark:bg-slate-800 rounded"></div>
      </div>
    </div>

    <!-- Centered Donut & Bottom Legend Grid -->
    <div v-else class="flex flex-col items-center justify-center pt-1 sm:pt-2">
      <!-- Centered SVG Donut matching reference design (media_1791360377810.png) -->
      <div class="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center my-0.5">
        <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90 transform overflow-visible">
          <!-- Background track circle with soft modern light gray/blue color -->
          <circle
            cx="50"
            cy="50"
            :r="RADIUS"
            fill="transparent"
            stroke="#e1e6f3"
            class="stroke-[#e1e6f3] dark:stroke-slate-800/80 transition-colors"
            stroke-width="13.5"
            stroke-linecap="round"
          />

          <!-- Colored overlapping rounded arc segments -->
          <circle
            v-for="seg in visibleArcs"
            :key="seg.key"
            cx="50"
            cy="50"
            :r="RADIUS"
            fill="transparent"
            :stroke="seg.color"
            :stroke-width="activeKey === seg.key ? 15 : 13.5"
            stroke-linecap="round"
            :stroke-dasharray="seg.dashArray"
            :stroke-dashoffset="seg.dashOffset"
            class="transition-all duration-300 ease-out cursor-pointer"
            :class="{
              'opacity-30': activeKey && activeKey !== seg.key,
              'opacity-100': !activeKey || activeKey === seg.key,
            }"
            @mouseenter="activeHoverKey = seg.key"
            @mouseleave="activeHoverKey = null"
            @click="handleSegmentClick(seg.key)"
          />

          <!-- Re-cap the start of the first segment so it smoothly overlaps the end of the last segment -->
          <circle
            v-if="visibleArcs.length > 1 && firstArc"
            cx="50"
            cy="50"
            :r="RADIUS"
            fill="transparent"
            :stroke="firstArc.color"
            :stroke-width="activeKey === firstArc.key ? 15 : 13.5"
            stroke-linecap="round"
            :stroke-dasharray="`0.01 ${CIRCUMFERENCE}`"
            :stroke-dashoffset="0"
            class="transition-all duration-300 ease-out pointer-events-none"
            :class="{
              'opacity-30': activeKey && activeKey !== firstArc.key,
              'opacity-100': !activeKey || activeKey === firstArc.key,
            }"
          />
        </svg>

        <!-- Inner Circular Disc matching reference design (52.3% / Shopping style) -->
        <button
          type="button"
          @click="handleCenterClick"
          title="Click to toggle total count or reset focus"
          class="absolute inset-0 m-auto w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-full bg-white dark:bg-slate-900 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-none border border-slate-100/90 dark:border-slate-800 flex flex-col items-center justify-center text-center cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none"
        >
          <span
            class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight leading-none"
          >
            {{ currentCenterDisplay.value }}
          </span>
          <span
            class="text-[11px] sm:text-xs font-medium text-slate-400 dark:text-slate-500 mt-1 capitalize leading-none truncate max-w-[65px]"
          >
            {{ currentCenterDisplay.label }}
          </span>
        </button>
      </div>

      <!-- Bottom Multi-Column Legend with Colored Dots -->
      <div
        class="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60"
      >
        <div
          v-for="seg in segments"
          :key="seg.key"
          class="flex items-center gap-2 cursor-pointer transition-opacity select-none"
          :class="{
            'opacity-30': activeKey && activeKey !== seg.key,
            'opacity-100': !activeKey || activeKey === seg.key,
          }"
          @mouseenter="activeHoverKey = seg.key"
          @mouseleave="activeHoverKey = null"
          @click="handleSegmentClick(seg.key)"
        >
          <span
            class="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200"
            :class="{ 'scale-125 ring-2 ring-offset-1 ring-slate-400': activeKey === seg.key }"
            :style="{ backgroundColor: seg.color }"
          ></span>
          <span class="text-[11px] font-bold text-slate-900 dark:text-white font-mono">
            {{ seg.percent }}%
          </span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {{ seg.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

