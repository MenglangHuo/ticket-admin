<script setup lang="ts">
export type SubscriberColumnKey =
  | 'user'
  | 'chat_id'
  | 'status'
  | 'subscribed_at'
  | 'actions';

withDefaults(
  defineProps<{
    columnWidths?: Record<SubscriberColumnKey, number>;
    visibleColumns?: Record<SubscriberColumnKey, boolean>;
    totalWidth?: number;
    rowCount?: number;
  }>(),
  {
    columnWidths: () => ({
      user: 240,
      chat_id: 180,
      status: 190,
      subscribed_at: 180,
      actions: 130,
    }),
    visibleColumns: () => ({
      user: true,
      chat_id: true,
      status: true,
      subscribed_at: true,
      actions: true,
    }),
    totalWidth: 920,
    rowCount: 5,
  }
);
</script>

<template>
  <div class="w-full select-none pointer-events-none">
    <table
      class="text-left text-xs table-fixed border-collapse"
      :style="{ minWidth: '100%', width: `${totalWidth}px` }"
    >
      <colgroup>
        <col v-if="visibleColumns.user" :style="{ width: `${columnWidths.user}px` }" />
        <col v-if="visibleColumns.chat_id" :style="{ width: `${columnWidths.chat_id}px` }" />
        <col v-if="visibleColumns.status" :style="{ width: `${columnWidths.status}px` }" />
        <col v-if="visibleColumns.subscribed_at" :style="{ width: `${columnWidths.subscribed_at}px` }" />
        <col v-if="visibleColumns.actions" :style="{ width: `${columnWidths.actions}px` }" />
      </colgroup>

      <thead
        class="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-20"
      >
        <tr>
          <!-- User -->
          <th
            v-if="visibleColumns.user"
            class="py-3.5 px-4 sm:px-5"
            :style="{ width: `${columnWidths.user}px` }"
          >
            <div class="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Chat ID -->
          <th
            v-if="visibleColumns.chat_id"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.chat_id}px` }"
          >
            <div class="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Status -->
          <th
            v-if="visibleColumns.status"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.status}px` }"
          >
            <div class="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Subscribed Date -->
          <th
            v-if="visibleColumns.subscribed_at"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.subscribed_at}px` }"
          >
            <div class="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Actions -->
          <th
            v-if="visibleColumns.actions"
            class="sticky right-0 z-20 py-3.5 px-4 sm:px-5 text-right bg-slate-50 dark:bg-slate-950 backdrop-blur-md"
            :style="{ width: `${columnWidths.actions}px` }"
          >
            <div class="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto animate-pulse"></div>
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
        <tr
          v-for="i in rowCount"
          :key="i"
          class="transition-colors animate-pulse"
        >
          <!-- User -->
          <td
            v-if="visibleColumns.user"
            class="py-3.5 px-4 sm:px-5"
            :style="{ width: `${columnWidths.user}px` }"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div class="h-2.5 w-16 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              </div>
            </div>
          </td>

          <!-- Chat ID -->
          <td
            v-if="visibleColumns.chat_id"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.chat_id}px` }"
          >
            <div class="h-6 w-28 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/60 dark:border-slate-800"></div>
          </td>

          <!-- Status -->
          <td
            v-if="visibleColumns.status"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.status}px` }"
          >
            <div class="flex items-center gap-2.5">
              <div class="h-5 w-9 rounded-full bg-slate-200 dark:bg-slate-800"></div>
              <div class="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          </td>

          <!-- Subscribed Date -->
          <td
            v-if="visibleColumns.subscribed_at"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.subscribed_at}px` }"
          >
            <div class="flex items-center gap-1.5">
              <div class="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>
              <div class="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          </td>

          <!-- Actions -->
          <td
            v-if="visibleColumns.actions"
            class="sticky right-0 z-10 py-3.5 px-4 sm:px-5 text-right whitespace-nowrap bg-white dark:bg-slate-900"
            :style="{ width: `${columnWidths.actions}px` }"
          >
            <div class="flex items-center justify-end gap-1.5">
              <div class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
              <div class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
