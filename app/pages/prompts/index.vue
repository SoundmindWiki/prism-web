<script setup lang="ts">
import type { CategoryRow, DomainRow, ListMeta, PromptCard, Tag } from '~/types'

const { request } = useApi()
const route = useRoute()
const router = useRouter()

const SORTS = [
  { value: 'recent', label: '최근 수정순' },
  { value: 'popular', label: '많이 쓴 순' },
  { value: 'created', label: '최신 등록순' },
  { value: 'title', label: '이름순' },
]

const query = computed(() => ({
  q: String(route.query.q ?? ''),
  category: String(route.query.category ?? ''),
  domain: String(route.query.domain ?? ''),
  tag: String(route.query.tag ?? ''),
  sort: String(route.query.sort ?? 'recent'),
  page: Number(route.query.page ?? 1),
}))

const { data: categories } = await useAsyncData('categories', () => request<{ categories: CategoryRow[] }>('/categories'))
const { data: domains } = await useAsyncData('domains', () => request<{ domains: DomainRow[] }>('/domains'))
const { data: tags } = await useAsyncData('tags', () => request<{ tags: Tag[] }>('/tags', { params: { used: true } }))

const { data, pending } = useAsyncData(
  'prompts',
  () =>
    request<{ prompts: PromptCard[]; meta: ListMeta }>('/prompts', {
      params: {
        q: query.value.q || undefined,
        category: query.value.category || undefined,
        domain: query.value.domain || undefined,
        tag: query.value.tag || undefined,
        sort: query.value.sort,
        page: query.value.page,
        per_page: 12,
      },
    }),
  // 화면을 막고 기다리는 대신 스켈레톤을 먼저 보여 준다.
  { watch: [query], lazy: true },
)

useHead({ title: '전체 문서' })

const activeTag = computed(() => tags.value?.tags.find((tag) => tag.slug === query.value.tag))
const activeCategory = computed(() => categories.value?.categories.find((category) => category.slug === query.value.category))
const activeDomain = computed(() => domains.value?.domains.find((domain) => domain.slug === query.value.domain))
const hasFilter = computed(() => Boolean(query.value.q || query.value.category || query.value.domain || query.value.tag))

// 제목 자리는 하나라서 검색어 > 태그 > 카테고리 > 도메인 순으로 하나만 올린다.
const heading = computed(() => {
  if (query.value.q) return { title: `"${query.value.q}" 검색 결과`, trail: [] as string[] }
  if (activeTag.value) return { title: `#${activeTag.value.name}`, trail: [] }
  if (activeCategory.value) return { title: activeCategory.value.name, trail: activeCategory.value.path.slice(0, -1) }
  if (activeDomain.value) return { title: activeDomain.value.name, trail: ['도메인', ...activeDomain.value.path.slice(0, -1)] }
  return { title: '전체 문서', trail: [] }
})

// 제목에 못 올린 나머지 조건은 개수 옆에 적어 둔다. 무엇으로 걸러졌는지 한눈에 보이게.
const otherFilters = computed(() => {
  const shown = heading.value.title
  const list: string[] = []
  if (activeCategory.value && activeCategory.value.name !== shown) list.push(`카테고리 ${activeCategory.value.path.join(' › ')}`)
  if (activeDomain.value && activeDomain.value.name !== shown) list.push(`도메인 ${activeDomain.value.path.join(' › ')}`)
  if (activeTag.value && `#${activeTag.value.name}` !== shown) list.push(`#${activeTag.value.name}`)
  return list
})

function updateQuery(patch: Record<string, string | number | undefined>) {
  const next: Record<string, string> = {}

  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    const text = String(value ?? '')
    // 조건이 바뀌면 1페이지부터 다시 본다.
    if (text && !(key === 'page' && patch.page === undefined)) next[key] = text
  }

  router.push({ path: '/prompts', query: next })
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p v-if="heading.trail.length" class="mb-0.5 text-xs text-slate-400 dark:text-slate-500">
          {{ heading.trail.join(' › ') }} ›
        </p>
        <h1 class="text-xl font-bold tracking-tight">{{ heading.title }}</h1>
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {{ data?.meta.total ?? 0 }}개
          <template v-if="data && data.meta.total_pages > 1"> · {{ data.meta.page }}/{{ data.meta.total_pages }} 페이지</template>
          <template v-for="filter in otherFilters" :key="filter"> · {{ filter }}</template>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          v-if="hasFilter"
          to="/prompts"
          class="rounded-lg px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          조건 지우기
        </NuxtLink>

        <label v-if="domains?.domains.length" class="sr-only" for="domain-filter">도메인</label>
        <select
          v-if="domains?.domains.length"
          id="domain-filter"
          :value="query.domain"
          class="max-w-44 rounded-xl bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          @change="updateQuery({ domain: ($event.target as HTMLSelectElement).value || undefined, page: undefined })"
        >
          <option value="">모든 도메인</option>
          <option v-for="domain in domains.domains" :key="domain.slug" :value="domain.slug">
            {{ indentedName(domain) }} ({{ domain.total_count }})
          </option>
        </select>

        <label class="sr-only" for="sort">정렬</label>
        <select
          id="sort"
          :value="query.sort"
          class="rounded-xl bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          @change="updateQuery({ sort: ($event.target as HTMLSelectElement).value, page: undefined })"
        >
          <option v-for="sort in SORTS" :key="sort.value" :value="sort.value">{{ sort.label }}</option>
        </select>
      </div>
    </div>

    <!-- 넓은 화면에서는 왼쪽 사이드바가 같은 일을 하므로 겹치지 않게 감춘다 -->
    <div class="flex flex-wrap gap-1.5 lg:hidden">
      <button
        type="button"
        class="rounded-md px-2.5 py-1 text-xs transition-colors"
        :class="!query.category
          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
        @click="updateQuery({ category: undefined, page: undefined })"
      >
        전체
      </button>
      <button
        v-for="category in categories?.categories"
        :key="category.slug"
        type="button"
        class="rounded-md px-2.5 py-1 text-xs transition-colors"
        :class="query.category === category.slug
          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
        @click="updateQuery({ category: category.slug, page: undefined })"
      >
        {{ category.path.join(' › ') }}
        <span class="ml-1 tabular-nums opacity-60">{{ category.total_count }}</span>
      </button>
    </div>

    <div v-if="pending && !data" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonCard v-for="index in 6" :key="index" />
    </div>

    <template v-else-if="data?.prompts.length">
      <!-- 조건만 바꾼 경우에는 있던 목록을 지우지 않고 흐리게 둔다. 자리가 튀지 않는다. -->
      <div
        class="grid gap-3 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3"
        :class="pending ? 'pointer-events-none opacity-50' : ''"
      >
        <PromptCard v-for="prompt in data.prompts" :key="prompt.id" :prompt="prompt" />
      </div>

      <nav v-if="data.meta.total_pages > 1" class="flex items-center justify-center gap-2 pt-2">
        <button
          type="button"
          :disabled="data.meta.page <= 1"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
          @click="updateQuery({ page: data.meta.page - 1 })"
        >
          이전
        </button>
        <span class="text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {{ data.meta.page }} / {{ data.meta.total_pages }}
        </span>
        <button
          type="button"
          :disabled="data.meta.page >= data.meta.total_pages"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
          @click="updateQuery({ page: data.meta.page + 1 })"
        >
          다음
        </button>
      </nav>
    </template>

    <EmptyState
      v-else
      title="조건에 맞는 프롬프트가 없습니다"
      description="검색어를 줄여 보거나, 이 상황에 쓰는 프롬프트를 직접 올려 주세요."
    >
      <NuxtLink to="/prompts/new" class="inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-all duration-100 hover:bg-indigo-700 active:scale-[0.97]">
        새 문서 쓰기
      </NuxtLink>
    </EmptyState>
  </div>
</template>
