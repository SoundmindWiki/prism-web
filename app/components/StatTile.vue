<script setup lang="ts">
defineProps<{ label: string; value: number | string; hint?: string; tone?: 'default' | 'warn' }>()
</script>

<template>
  <div class="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
    <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ label }}</p>
    <p
      class="mt-1.5 text-2xl font-bold tracking-tight tabular-nums"
      :class="tone === 'warn' && Number(value) > 0 ? 'text-amber-600 dark:text-amber-400' : ''"
    >
      {{ typeof value === 'number' ? value.toLocaleString('ko-KR') : value }}
    </p>
    <p v-if="hint" class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{{ hint }}</p>
  </div>
</template>
