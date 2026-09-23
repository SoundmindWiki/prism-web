<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
    <p class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ title }}</p>
    <p v-if="description" class="mx-auto mt-1.5 max-w-sm text-[13px] text-slate-400 dark:text-slate-500">{{ description }}</p>
    <div class="mt-4">
      <slot />
    </div>
  </div>
</template>
