<script setup lang="ts">
/** 로고 + 이름. 사이드바·상단바·로그인 화면이 같은 모양을 쓰도록 묶어 뒀다. */
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg'; suffix?: boolean }>(), {
  size: 'md',
  suffix: false,
})

const TEXT = { sm: 'text-sm', md: 'text-[15px]', lg: 'text-base' }
</script>

<template>
  <span class="flex min-w-0 items-center gap-2.5">
    <AppLogo :size="size" />
    <span class="min-w-0 truncate font-semibold tracking-tight" :class="TEXT[size]">
      Prism<span v-if="suffix" class="ml-1.5 font-normal text-slate-400 dark:text-slate-500">사내 프롬프트 위키</span>
    </span>
  </span>
</template>
