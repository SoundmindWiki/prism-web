<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
// v-if 로 붙였다 떼는 컴포넌트라, 떠 있는 동안은 늘 가둔 상태다.
const open = ref(true)

useFocusTrap(panel, open, () => emit('close'))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:p-8">
    <div class="absolute inset-0" @click="emit('close')" />

    <div
      ref="panel"
      class="relative my-auto w-full max-w-md animate-rise rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex items-start gap-3">
        <div class="min-w-0">
          <h2 class="text-base font-bold">{{ title }}</h2>
          <p v-if="description" class="mt-1 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
            {{ description }}
          </p>
        </div>
        <button
          type="button"
          class="ml-auto shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="닫기"
          @click="emit('close')"
        >
          <svg class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m5 5 10 10M15 5 5 15" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="mt-4">
        <slot />
      </div>
    </div>
  </div>
</template>
