<script setup lang="ts">
const route = useRoute()

const LINKS = [
  { to: '/admin', label: '현황', exact: true },
  { to: '/admin/users', label: '구성원' },
  { to: '/admin/prompts', label: '문서' },
  { to: '/admin/categories', label: '카테고리' },
  { to: '/admin/domains', label: '도메인' },
  { to: '/admin/tags', label: '태그' },
  { to: '/admin/logs', label: '활동 기록' },
]

function isActive(link: { to: string; exact?: boolean }) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to)
}
</script>

<template>
  <div class="border-b border-slate-200 dark:border-slate-800">
    <div class="flex items-center gap-2">
      <h1 class="text-lg font-bold tracking-tight">백오피스</h1>
      <span class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
        관리자 전용
      </span>
    </div>

    <nav class="-mb-px mt-4 flex gap-1 overflow-x-auto">
      <NuxtLink
        v-for="link in LINKS"
        :key="link.to"
        :to="link.to"
        class="shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors"
        :class="isActive(link)
          ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
      >
        {{ link.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
