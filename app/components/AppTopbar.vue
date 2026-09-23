<script setup lang="ts">
defineEmits<{ toggle: [] }>()
</script>

<template>
  <!-- 사이드바가 서랍으로 숨는 좁은 화면에서만 나온다 -->
  <header class="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
    <button
      type="button"
      class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="메뉴 열기"
      @click="$emit('toggle')"
    >
      <svg class="size-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke-linecap="round" />
      </svg>
    </button>

    <NuxtLink to="/">
      <AppWordmark size="sm" />
    </NuxtLink>

    <NuxtLink
      to="/prompts/new"
      class="ml-auto rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-all duration-100 hover:bg-indigo-700 active:scale-[0.97]"
    >
      새 문서
    </NuxtLink>
  </header>
</template>
