<script setup lang="ts">
defineProps<{ columns: Array<{ key: string; label: string; align?: 'left' | 'right' | 'center' }> }>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
    <table class="w-full min-w-[40rem] text-left text-[13px]">
      <thead class="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="px-3.5 py-2.5 font-medium"
            :class="{ 'text-right': column.align === 'right', 'text-center': column.align === 'center' }"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
        <slot />
      </tbody>
    </table>
  </div>
</template>
