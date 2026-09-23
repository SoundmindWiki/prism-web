<script setup lang="ts">
import type { PromptCard } from '~/types'

const props = defineProps<{ prompt: PromptCard }>()

const { pending, copied, copyPrompt } = useQuickCopy()

// 복사하면 서버 왕복을 기다리지 않고 숫자부터 올린다. 목록을 다시 받을 일이 아니라서.
const extraCopies = ref(0)
const copyCount = computed(() => props.prompt.copy_count + extraCopies.value)

async function copy() {
  if (await copyPrompt(props.prompt)) extraCopies.value += 1
}
</script>

<template>
  <!-- a 안에 button 을 넣을 수 없어서, 제목 링크를 카드 전체로 늘리고(after:inset-0)
       복사 버튼만 그 위로 띄운다. 카드 아무 데나 눌러도 문서로 가는 건 그대로다. -->
  <article
    class="group relative flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300/70 active:translate-y-0 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-center gap-1">
        <CategoryBadge :category="prompt.category" />
        <!-- 도메인이 많으면 카드가 지저분해진다. 둘까지만 보이고 나머지는 숫자로. -->
        <DomainChip v-for="domain in prompt.domains.slice(0, 2)" :key="domain.id" :domain="domain" />
        <span
          v-if="prompt.domains.length > 2"
          class="text-[11px] text-slate-400"
          :title="prompt.domains.slice(2).map((domain) => domain.name).join(', ')"
        >+{{ prompt.domains.length - 2 }}</span>
      </div>
      <span
        v-if="prompt.status === 'draft'"
        class="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
      >초안</span>
      <span
        v-else-if="prompt.status === 'archived'"
        class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      >보관됨</span>
    </div>

    <h3 class="mt-3 text-[15px] font-bold leading-snug">
      <NuxtLink
        :to="`/prompts/${encodeURIComponent(prompt.slug)}`"
        class="after:absolute after:inset-0 after:rounded-2xl group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
      >
        {{ prompt.title }}
      </NuxtLink>
    </h3>

    <p class="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
      {{ prompt.summary || prompt.excerpt }}
    </p>

    <div v-if="prompt.tags.length" class="mt-3 flex flex-wrap gap-1">
      <span
        v-for="tag in prompt.tags.slice(0, 3)"
        :key="tag.id"
        class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      >#{{ tag.name }}</span>
    </div>

    <div class="mt-auto flex items-center gap-2 pt-3.5 text-[11px] text-slate-400 dark:text-slate-500">
      <span class="min-w-0 flex-1 truncate">
        {{ prompt.last_editor?.name || prompt.author?.name }} · {{ fromNow(prompt.updated_at) }}
      </span>

      <span v-if="prompt.variable_count" class="shrink-0 tabular-nums" :title="`변수 ${prompt.variable_count}개`">
        변수 {{ prompt.variable_count }}
      </span>

      <!-- 이 위키에서 가장 잦은 동작이라 목록에서 바로 누를 수 있게 뒀다. -->
      <button
        type="button"
        :disabled="pending"
        class="relative z-10 -my-1 -mr-1.5 flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 font-medium transition-colors disabled:opacity-60"
        :class="copied
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400'"
        :aria-label="`${prompt.title} 복사`"
        :title="`복사 ${copyCount}회`"
        @click="copy"
      >
        <svg v-if="pending" class="size-3.5 animate-spin" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="2.5" class="opacity-25" />
          <path d="M17.5 10A7.5 7.5 0 0 0 10 2.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        </svg>
        <svg v-else-if="copied" class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <path d="m4 10 4 4 8-8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <svg v-else class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
          <rect x="7" y="7" width="9" height="9" rx="2" />
          <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" stroke-linecap="round" />
        </svg>
        <span class="tabular-nums">{{ copied ? '복사됨' : copyCount }}</span>
      </button>
    </div>
  </article>
</template>
