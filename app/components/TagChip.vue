<script setup lang="ts">
import type { Tag } from '~/types'

defineProps<{ tag: Tag; active?: boolean }>()
</script>

<template>
  <NuxtLink
    :to="{ path: '/prompts', query: { tag: tag.slug } }"
    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-colors"
    :class="active
      ? 'bg-indigo-600 text-white'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
  >
    <span class="opacity-50">#</span>{{ tag.name }}
    <span v-if="tag.prompts_count !== undefined" class="tabular-nums opacity-60">{{ tag.prompts_count }}</span>
  </NuxtLink>
</template>
