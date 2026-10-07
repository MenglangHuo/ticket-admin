<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useReportStore } from '@/stores/reportStore'
import MetricCard from '@/components/dashboard/MetricCard.vue'
import StatusDonut from '@/components/dashboard/StatusDonut.vue'
import DateRangePicker, { type DateRangeResult } from '@/components/common/DateRangePicker.vue'
import {
  Layers,
  Inbox,
  Clock,
  AlertTriangle,
  Bug,
  Sparkles,
  HelpCircle,
  CheckSquare,
  BarChart2,
  RefreshCw,
  AlertCircle,
} from 'lucide-vue-next'

const reportStore = useReportStore()

onMounted(() => {
  // Automatically uses default this_month date_from & date_to
  reportStore.fetchReports()
})

function handleDateRangeChange(range: DateRangeResult) {
  reportStore.fetchReports({
    date_from: range.date_from,
    date_to: range.date_to,
    preset: range.preset,
  })
}

function handleRefresh() {
  reportStore.refreshReports()
}

const totalTypeCount = computed(() => {
  const bt = reportStore.reportData.by_type
  return (bt.bug || 0) + (bt.enhancement || 0) + (bt.question || 0) + (bt.task || 0) || 1
})

const lastUpdatedLabel = computed(() => {
  if (!reportStore.lastUpdated) return 'Just now'
  const diffSec = Math.floor((Date.now() - reportStore.lastUpdated.getTime()) / 1000)
  if (diffSec < 10) return 'Just now'
  if (diffSec < 60) return `${diffSec}s ago`
  return `${Math.floor(diffSec / 60)}m ago`
})
</script>

<
<template>
  <div class="space-y-3 sm:space-y-3.5">
    <!-- Header with Live Status, View Controls, Refresh, and Date Range Picker -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
      <div>
        <div class="flex items-center gap-2.5">
          <div
            class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/90 dark:border-indigo-500/30 shadow-xs shadow-indigo-500/10 shrink-0"
          >
            <BarChart2 class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Overview & Performance
              </h1>
              <!-- Live Indicator Pill -->
              <span
                class="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-500/20"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Metrics
              </span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Live ticket metrics, lifecycle distribution, and issue type breakdown
            </p>
          </div>
        </div>
      </div>

      <!-- Controls Row: Refresh Button & Date Range Filter -->
      <div class="flex items-center gap-2">
        <!-- Refresh Button -->
        <button
          type="button"
          @click="handleRefresh"
          :disabled="reportStore.isLoading"
          title="Refresh metrics"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs ring-1 ring-slate-900/[0.03] dark:ring-white/[0.05] transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw
            class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform"
            :class="{ 'animate-spin text-indigo-600 dark:text-indigo-400': reportStore.isLoading }"
          />
          <span class="font-normal text-slate-500 dark:text-slate-400 text-[11px]">
            {{ lastUpdatedLabel }}
          </span>
        </button>

        <!-- Date Range Filter: Default Preset is this_month -->
        <DateRangePicker initialPreset="this_month" @change="handleDateRangeChange" />
      </div>
    </div>

    <!-- Error Banner (if any) -->
    <div
      v-if="reportStore.error"
      class="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 flex items-center justify-between text-xs animate-in fade-in duration-200"
    >
      <div class="flex items-center gap-2">
        <AlertCircle class="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        <span>{{ reportStore.error }}</span>
      </div>
      <button
        type="button"
        @click="handleRefresh"
        class="px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- 4 Clean KPI Summary Cards (Full Row Balanced) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
      <!-- Total Tickets -->
      <MetricCard
        title="Total Tickets"
        :value="reportStore.reportData.summary.total_tickets"
        subtitle="All incoming tickets"
        :progressPercent="reportStore.reportData.summary.resolution_rate || 40"
        :trend="{
          value: `${reportStore.reportData.summary.resolution_rate || 0}% resolved`,
          isPositive: true,
        }"
        :icon="Layers"
        variant="indigo"
        :loading="reportStore.isLoading"
      />

      <!-- Open Tickets -->
      <MetricCard
        title="Open Tickets"
        :value="reportStore.reportData.by_status.open || 0"
        subtitle="Awaiting triage"
        :progressPercent="
          Math.round(
            ((reportStore.reportData.by_status.open || 0) /
              (reportStore.reportData.summary.total_tickets || 1)) *
              100,
          )
        "
        :trend="{
          value: `${reportStore.reportData.by_status.open || 0} open`,
          isPositive: true,
        }"
        :icon="Inbox"
        variant="sky"
        :loading="reportStore.isLoading"
      />

      <!-- In Progress -->
      <MetricCard
        title="In Progress"
        :value="reportStore.reportData.by_status.in_progress || 0"
        subtitle="Actively worked on"
        :progressPercent="
          Math.round(
            ((reportStore.reportData.by_status.in_progress || 0) /
              (reportStore.reportData.summary.total_tickets || 1)) *
              100,
          )
        "
        :trend="{
          value: `${reportStore.reportData.by_status.in_progress || 0} active`,
          isPositive: true,
        }"
        :icon="Clock"
        variant="amber"
        :loading="reportStore.isLoading"
      />

      <!-- Critical Escalations -->
      <MetricCard
        title="Critical Priority"
        :value="reportStore.reportData.summary.critical_tickets"
        subtitle="Urgent client blockers"
        :progressPercent="
          Math.round(
            ((reportStore.reportData.summary.critical_tickets || 0) /
              (reportStore.reportData.summary.total_tickets || 1)) *
              100,
          )
        "
        :trend="{
          value: `${reportStore.reportData.summary.critical_tickets || 0} urgent`,
          isPositive: false,
        }"
        :icon="AlertTriangle"
        variant="rose"
        :loading="reportStore.isLoading"
      />
    </div>

    <!-- Side-by-Side Breakdown Cards (Status Donut & Tickets by Type) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-stretch">
      <!-- Left: Status Donut Chart (Matching Popular Categories from Reference) -->
      <StatusDonut
        :byStatus="reportStore.reportData.by_status"
        :loading="reportStore.isLoading"
        class="h-full"
      />

      <!-- Right: Tickets by Type Card (Matching Products List from Reference) -->
      <div
        class="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-100/90 dark:border-slate-800/60 shadow-[0_4px_25px_-4px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full"
      >
        <div>
          <!-- Header with Title on Left, Total Volume on Right -->
          <div
            class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60 mb-2"
          >
            <h3
              class="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight"
            >
              Tickets by Type
            </h3>

            <div
              v-if="reportStore.isLoading"
              class="animate-pulse h-4 w-14 bg-slate-100 dark:bg-slate-800 rounded"
            ></div>
            <span
              v-else
              class="text-xs font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {{ totalTypeCount === 1 && !reportStore.reportData.by_type.bug ? 0 : totalTypeCount }}
              total
            </span>
          </div>

          <!-- Skeleton State when loading -->
          <div v-if="reportStore.isLoading" class="space-y-2 mb-2 animate-pulse">
            <div
              v-for="i in 4"
              :key="i"
              class="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"
            ></div>
          </div>

          <!-- Type List Items (Matching Products Rows from Screenshot) -->
          <div v-else class="space-y-1 mb-2">
            <!-- Bug -->
            <div
              class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0"
                >
                  <Bug class="w-4 h-4" />
                </div>
                <div class="truncate">
                  <p class="text-xs font-bold text-slate-900 dark:text-white truncate">Bug</p>
                  <p class="text-[10px] text-slate-400 font-medium">
                    {{
                      Math.round(
                        ((reportStore.reportData.by_type.bug || 0) / totalTypeCount) * 100,
                      )
                    }}% volume
                  </p>
                </div>
              </div>
              <span class="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {{ reportStore.reportData.by_type.bug || 0 }}
              </span>
            </div>

            <!-- Enhancement -->
            <div
              class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0"
                >
                  <Sparkles class="w-4 h-4" />
                </div>
                <div class="truncate">
                  <p class="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Enhancement
                  </p>
                  <p class="text-[10px] text-slate-400 font-medium">
                    {{
                      Math.round(
                        ((reportStore.reportData.by_type.enhancement || 0) / totalTypeCount) * 100,
                      )
                    }}% volume
                  </p>
                </div>
              </div>
              <span class="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {{ reportStore.reportData.by_type.enhancement || 0 }}
              </span>
            </div>

            <!-- Task -->
            <div
              class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                >
                  <CheckSquare class="w-4 h-4" />
                </div>
                <div class="truncate">
                  <p class="text-xs font-bold text-slate-900 dark:text-white truncate">Task</p>
                  <p class="text-[10px] text-slate-400 font-medium">
                    {{
                      Math.round(
                        ((reportStore.reportData.by_type.task || 0) / totalTypeCount) * 100,
                      )
                    }}% volume
                  </p>
                </div>
              </div>
              <span class="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {{ reportStore.reportData.by_type.task || 0 }}
              </span>
            </div>

            <!-- Question -->
            <div
              class="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0"
                >
                  <HelpCircle class="w-4 h-4" />
                </div>
                <div class="truncate">
                  <p class="text-xs font-bold text-slate-900 dark:text-white truncate">Question</p>
                  <p class="text-[10px] text-slate-400 font-medium">
                    {{
                      Math.round(
                        ((reportStore.reportData.by_type.question || 0) / totalTypeCount) * 100,
                      )
                    }}% volume
                  </p>
                </div>
              </div>
              <span class="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {{ reportStore.reportData.by_type.question || 0 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Proportional Progress Distribution Bar with Mini Legend -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div
            class="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-medium"
          >
            <span>Volume Share</span>
            <div class="flex items-center gap-2 text-[10px]">
              <span class="inline-flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Bug
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Enhance
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Task
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span> Q&A
              </span>
            </div>
          </div>
          <div
            class="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5 p-0.5"
          >
            <div
              :style="{
                width: `${((reportStore.reportData.by_type.bug || 0) / totalTypeCount) * 100}%`,
              }"
              class="h-full rounded-xs bg-rose-500 transition-all duration-300"
              title="Bug"
            ></div>
            <div
              :style="{
                width: `${((reportStore.reportData.by_type.enhancement || 0) / totalTypeCount) * 100}%`,
              }"
              class="h-full rounded-xs bg-purple-500 transition-all duration-300"
              title="Enhancement"
            ></div>
            <div
              :style="{
                width: `${((reportStore.reportData.by_type.task || 0) / totalTypeCount) * 100}%`,
              }"
              class="h-full rounded-xs bg-emerald-500 transition-all duration-300"
              title="Task"
            ></div>
            <div
              :style="{
                width: `${((reportStore.reportData.by_type.question || 0) / totalTypeCount) * 100}%`,
              }"
              class="h-full rounded-xs bg-sky-500 transition-all duration-300"
              title="Question"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
