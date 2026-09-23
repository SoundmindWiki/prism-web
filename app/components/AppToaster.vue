<script setup lang="ts">
/** 화면 아래에 잠깐 떴다 사라지는 알림. app.vue 에 한 번만 걸린다. */
const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex flex-col items-center gap-2 px-4"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      leave-active-class="absolute transition-all duration-200 ease-in"
      leave-to-class="translate-y-1 opacity-0"
      move-class="transition-transform duration-200"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl bg-slate-900 py-3 pl-4 pr-3 text-[13px] font-medium text-white shadow-lg dark:bg-slate-800"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
      >
        <svg
          v-if="toast.tone === 'success'"
          class="size-4 shrink-0 text-emerald-400"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          aria-hidden="true"
        >
          <path d="m4 10 4 4 8-8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg
          v-else-if="toast.tone === 'error'"
          class="size-4 shrink-0 text-rose-400"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7.5" />
          <path d="M10 6.2v4.2M10 13.6v.01" stroke-linecap="round" />
        </svg>

        <span class="min-w-0 leading-snug">{{ toast.message }}</span>

        <button
          type="button"
          class="-my-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="알림 닫기"
          @click="dismiss(toast.id)"
        >
          <svg class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m5 5 10 10M15 5 5 15" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
