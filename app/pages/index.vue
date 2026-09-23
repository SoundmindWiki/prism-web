<script setup lang="ts">
import type { PromptCard, WikiStats } from '~/types'

const { request } = useApi()
const { user } = useAuth()

const { data: stats } = await useAsyncData('stats', () =>
  request<{ stats: WikiStats; recently_updated: PromptCard[]; most_copied: PromptCard[] }>('/stats'),
)

const summaryNumbers = computed(() => [
  { label: '문서', value: stats.value?.stats.prompts ?? 0 },
  { label: '복사된 횟수', value: stats.value?.stats.copies ?? 0 },
  { label: '기여한 사람', value: stats.value?.stats.contributors ?? 0 },
  { label: '이번 주 수정', value: stats.value?.stats.updated_this_week ?? 0 },
])

const HOW_TO_USE = [
  {
    title: '왼쪽에서 찾으세요',
    body: '카테고리를 펼치면 문서가 전부 보입니다. 뭘 찾는지 알고 있다면 검색이 더 빠릅니다.',
  },
  {
    title: '변수를 채워 복사하세요',
    body: '문서를 열면 {{…}} 자리마다 입력칸이 생깁니다. 채운 뒤 복사하면 바로 붙여 넣을 수 있습니다.',
  },
  {
    title: '고칠 게 보이면 고치세요',
    body: '허락을 구할 필요 없습니다. 이전 내용은 히스토리에 남고 언제든 되돌릴 수 있습니다.',
  },
]
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-10">
    <section>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
        <template v-if="user">{{ user.name }}님, 어서 오세요</template>
        <template v-else>팀이 함께 쌓는 프롬프트</template>
      </h1>
      <p class="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        잘 통한 프롬프트를 각자 메모장에 두지 말고 여기 올려 주세요.
        변수를 채워 바로 복사할 수 있고, 누가 언제 무엇을 고쳤는지 전부 남습니다.
      </p>

      <dl class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="item in summaryNumbers"
          :key="item.label"
          class="rounded-xl border border-slate-200 px-4 py-3.5 dark:border-slate-800"
        >
          <dt class="text-xs text-slate-500 dark:text-slate-400">{{ item.label }}</dt>
          <dd class="mt-1 text-xl font-semibold tabular-nums">{{ item.value.toLocaleString('ko-KR') }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="stats?.most_copied.length">
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-semibold">많이 쓰는 문서</h2>
        <NuxtLink :to="{ path: '/prompts', query: { sort: 'popular' } }" class="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
          전체 보기
        </NuxtLink>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PromptCard v-for="prompt in stats.most_copied" :key="prompt.id" :prompt="prompt" />
      </div>
    </section>

    <section v-if="stats?.recently_updated.length">
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-semibold">최근에 손본 문서</h2>
        <NuxtLink to="/prompts" class="text-xs text-indigo-600 hover:underline dark:text-indigo-400">전체 보기</NuxtLink>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PromptCard v-for="prompt in stats.recently_updated" :key="prompt.id" :prompt="prompt" />
      </div>
    </section>

    <section class="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
      <h2 class="text-sm font-semibold">쓰는 법</h2>
      <div class="mt-3 grid gap-4 sm:grid-cols-3">
        <div v-for="(step, index) in HOW_TO_USE" :key="step.title">
          <p class="flex items-center gap-1.5 text-[13px] font-medium">
            <span class="grid size-4.5 place-items-center rounded-full bg-slate-200 text-[10px] tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {{ index + 1 }}
            </span>
            {{ step.title }}
          </p>
          <p class="mt-1.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{{ step.body }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
