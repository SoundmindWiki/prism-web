<script setup lang="ts">
/** useConfirm() 이 띄우는 창. app.vue 에 한 번만 걸어 두고 전 화면이 나눠 쓴다. */
const { request, accept, reject } = useConfirm()

const panel = ref<HTMLElement | null>(null)
const open = computed(() => request.value !== null)
const danger = computed(() => request.value?.tone === 'danger')

useFocusTrap(panel, open, reject)
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-150"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-150"
    leave-to-class="opacity-0"
  >
    <div
      v-if="request"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    >
      <div class="absolute inset-0" @click="reject" />

      <div
        ref="panel"
        class="relative w-full max-w-sm animate-rise rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title" class="text-base font-bold">{{ request.title }}</h2>

        <p v-if="request.description" class="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {{ request.description }}
        </p>

        <!-- 무엇이 몇 건 바뀌는지. 여기를 읽고 취소할 수 있어야 한다. -->
        <ul
          v-if="request.impacts?.length"
          class="mt-4 space-y-1.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed"
          :class="danger
            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
        >
          <li v-for="impact in request.impacts" :key="impact" class="flex gap-2">
            <span aria-hidden="true" class="mt-[0.45em] size-1 shrink-0 rounded-full bg-current opacity-60" />
            <span>{{ impact }}</span>
          </li>
        </ul>

        <div class="mt-5 flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            @click="reject"
          >
            {{ request.cancelLabel ?? '취소' }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl py-2.5 text-sm font-bold text-white"
            :class="danger ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'"
            @click="accept"
          >
            {{ request.confirmLabel ?? '확인' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
