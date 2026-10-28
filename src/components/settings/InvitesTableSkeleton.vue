<script setup lang="ts">
export type InviteColumnKey =
  | 'link'
  | 'token'
  | 'status'
  | 'expires_at'
  | 'created_at'
  | 'actions'

withDefaults(
  defineProps<{
    columnWidths?: Record<InviteColumnKey, number>
    visibleColumns?: Record<InviteColumnKey, boolean>
    totalWidth?: number
    rowCount?: number
  }>(),
  {
    columnWidths: () => ({
      link: 300,
      token: 220,
      status: 140,
      expires_at: 180,
      created_at: 180,
      actions: 140,
    }),
    visibleColumns: () => ({
      link: true,
      token: true,
      status: true,
      expires_at: true,
      created_at: true,
      actions: true,
    }),
    totalWidth: 1160,
    rowCount: 5,
  },
)
</script>

<template>
  <div class="w-full select-none pointer-events-none">
    <table
      class="text-left text-xs table-fixed border-collapse"
      :style="{ minWidth: '100%', width: `${totalWidth}px` }"
    >
      <colgroup>
        <col v-if="visibleColumns.link" :style="{ width: `${columnWidths.link}px` }" />
        <col v-if="visibleColumns.token" :style="{ width: `${columnWidths.token}px` }" />
        <col v-if="visibleColumns.status" :style="{ width: `${columnWidths.status}px` }" />
        <col v-if="visibleColumns.expires_at" :style="{ width: `${columnWidths.expires_at}px` }" />
        <col v-if="visibleColumns.created_at" :style="{ width: `${columnWidths.created_at}px` }" />
        <col v-if="visibleColumns.actions" :style="{ width: `${columnWidths.actions}px` }" />
      </colgroup>

      <thead
        class="bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-20"
      >
        <tr>
          <!-- Invite URL / Deep Link -->
          <th
            v-if="visibleColumns.link"
            class="py-3.5 px-4 sm:px-5"
            :style="{ width: `${columnWidths.link}px` }"
          >
            <div class="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Token -->
          <th
            v-if="visibleColumns.token"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.token}px` }"
          >
            <div class="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Status -->
          <th
            v-if="visibleColumns.status"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.status}px` }"
          >
            <div class="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Expires At -->
          <th
            v-if="visibleColumns.expires_at"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.expires_at}px` }"
          >
            <div class="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Created At -->
          <th
            v-if="visibleColumns.created_at"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.created_at}px` }"
          >
            <div class="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
          </th>

          <!-- Actions -->
          <th
            v-if="visibleColumns.actions"
            class="sticky right-0 z-20 py-3.5 px-4 sm:px-5 text-right bg-slate-50 dark:bg-slate-950 backdrop-blur-md"
            :style="{ width: `${columnWidths.actions}px` }"
          >
            <div
              class="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto animate-pulse"
            ></div>
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
        <tr v-for="i in rowCount" :key="i" class="transition-colors animate-pulse">
          <!-- Invite URL -->
          <td
            v-if="visibleColumns.link"
            class="py-3.5 px-4 sm:px-5"
            :style="{ width: `${columnWidths.link}px` }"
          >
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0"></div>
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="h-3.5 w-44 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div class="h-2.5 w-24 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
              </div>
            </div>
          </td>

          <!-- Token -->
          <td
            v-if="visibleColumns.token"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.token}px` }"
          >
            <div
              class="h-6 w-32 bg-slate-100 dark:bg-slate-800/80 rounded-md border border-slate-200/60 dark:border-slate-800"
            ></div>
          </td>

          <!-- Status -->
          <td
            v-if="visibleColumns.status"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.status}px` }"
          >
            <div class="flex items-center gap-2">
              <div class="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800"></div>
              <div class="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-800"></div>
            </div>
          </td>

          <!-- Expires At -->
          <td
            v-if="visibleColumns.expires_at"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.expires_at}px` }"
          >
            <div class="space-y-1">
              <div class="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div class="h-2.5 w-16 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
            </div>
          </td>

          <!-- Created At -->
          <td
            v-if="visibleColumns.created_at"
            class="py-3.5 px-4"
            :style="{ width: `${columnWidths.created_at}px` }"
          >
            <div class="space-y-1">
              <div class="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div class="h-2.5 w-14 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
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
              <div class="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
