<template>
  <div
    class="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800/90 shadow-[0_1px_3px_rgba(0,0,0,0.03)] animate-pulse select-none pointer-events-none"
  >
    <!-- Top Row: Key + Priority (Left), Type + Kebab (Right) -->
    <div class="flex items-center justify-between gap-2 mb-2.5">
      <div class="flex items-center gap-2">
        <!-- Ticket Key Skeleton -->
        <div class="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <!-- Priority Badge Skeleton -->
        <div class="h-3.5 w-12 bg-slate-200/90 dark:bg-slate-800 rounded-full"></div>
      </div>

      <!-- Right: Type Badge & Kebab Skeleton -->
      <div class="flex items-center gap-1.5">
        <div class="h-4 w-14 bg-slate-100 dark:bg-slate-800/80 rounded-md"></div>
        <div class="w-3.5 h-3.5 bg-slate-100 dark:bg-slate-800 rounded"></div>
      </div>
    </div>

    <!-- Title Skeleton (2 lines) -->
    <div class="space-y-1.5 mb-2.5">
      <div class="h-4 w-11/12 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div class="h-4 w-3/5 bg-slate-200/70 dark:bg-slate-800/70 rounded"></div>
    </div>

    <!-- Description Preview Skeleton (2 lines) -->
    <div class="space-y-1 mb-3.5">
      <div class="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded"></div>
      <div class="h-3 w-4/5 bg-slate-100/80 dark:bg-slate-800/50 rounded"></div>
    </div>

    <!-- Bottom Meta Row: Reporter Name (Left) & Datetime (Right) -->
    <div
      class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80"
    >
      <!-- Reporter Skeleton -->
      <div class="flex items-center gap-1.5">
        <div class="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-800"></div>
        <div class="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>

      <!-- Datetime Skeleton -->
      <div class="flex items-center gap-1.5">
        <div class="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800/60"></div>
        <div class="h-3 w-24 bg-slate-100 dark:bg-slate-800/60 rounded"></div>
      </div>
    </div>
  </div>
</template>
