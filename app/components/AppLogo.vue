<script setup lang="ts">
/**
 * Prism 로고. 프리즘을 통과한 빛이 세 갈래로 갈라져 나오는 모양이다.
 * 흩어져 있던 프롬프트가 한곳을 지나 정돈되어 나온다는 뜻으로 골랐다.
 *
 * 삼각형을 선이 아니라 면으로 그린 이유는, 16px 파비콘에서 선이 뭉개지기 때문이다.
 */
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const BOX = { sm: 'size-7 rounded-lg', md: 'size-8 rounded-lg', lg: 'size-9 rounded-xl' }
</script>

<template>
  <span class="grid shrink-0 place-items-center bg-indigo-600" :class="BOX[size]">
    <svg class="size-[82%]" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M11.5 7 19 24.5H4.5Z" fill="#fff" />
      <path d="M15.5 12h11.5" stroke="#FBBF24" stroke-width="2.6" stroke-linecap="round" />
      <path d="M17.5 17h9.5" stroke="#34D399" stroke-width="2.6" stroke-linecap="round" />
      <path d="M19.5 22h7.5" stroke="#38BDF8" stroke-width="2.6" stroke-linecap="round" />
    </svg>
  </span>
</template>
