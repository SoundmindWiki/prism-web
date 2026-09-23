<script setup lang="ts">
import type { Domain } from '~/types'

// 누르면 그 도메인 문서만 모아 본다. 카드 안에서는 카드 링크 위로 띄워야 눌린다(relative z-10).
// plain 이면 링크 없이 글자만. (불리언 prop 은 안 넘기면 false 라서 "끄는" 쪽으로 이름을 지었다)
const props = defineProps<{ domain: Domain; fullPath?: boolean; plain?: boolean }>()

const label = computed(() => (props.fullPath ? props.domain.path.join(' › ') : props.domain.name))
</script>

<template>
  <NuxtLink
    v-if="!plain"
    :to="{ path: '/prompts', query: { domain: domain.slug } }"
    class="relative z-10 inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/15 transition-colors hover:bg-sky-100 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20 dark:hover:bg-sky-400/20"
    :title="domain.path.join(' › ')"
  >
    <svg class="size-2.5 opacity-70" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" />
      <path d="M1.5 6h9M6 1.5c1.3 1.3 1.9 2.8 1.9 4.5S7.3 9.2 6 10.5C4.7 9.2 4.1 7.7 4.1 6S4.7 2.8 6 1.5Z" />
    </svg>
    {{ label }}
  </NuxtLink>
  <span
    v-else
    class="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/15 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/20"
  >{{ label }}</span>
</template>
