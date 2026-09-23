<script setup lang="ts">
// VSCode 패널 머리처럼 왼쪽에 접기 화살표, 오른쪽에 도구 버튼.
// 도구 버튼은 넓은 화면에서는 패널에 마우스를 올렸을 때만 보인다(부모에 group/pane 을 둔다).
defineProps<{ label: string; open: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <div class="mt-5 flex items-center pb-1">
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      :aria-expanded="open"
      @click="$emit('toggle')"
    >
      <svg class="size-3 shrink-0 transition-transform" :class="{ '-rotate-90': !open }" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        <path d="M2.5 4 6 8l3.5-4Z" />
      </svg>
      {{ label }}
    </button>
    <div
      v-if="$slots.default"
      class="flex shrink-0 items-center gap-0.5 transition-opacity lg:opacity-0 lg:group-hover/pane:opacity-100 lg:focus-within:opacity-100"
    >
      <slot />
    </div>
  </div>
</template>
