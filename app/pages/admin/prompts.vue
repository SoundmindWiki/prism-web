<script setup lang="ts">
import type { CategoryRow, ListMeta, PromptCard } from '~/types'

type AdminPrompt = PromptCard & { version_count: number }

const { request } = useApi()
const { invalidate } = usePromptCache()
const { ask } = useConfirm()
const toast = useToast()

useHead({ title: '백오피스 · 문서' })

const query = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const page = ref(1)

const { data: categories } = await useAsyncData('categories', () => request<{ categories: CategoryRow[] }>('/categories'))

const { data, refresh, pending } = await useAsyncData(
  'admin-prompts',
  () =>
    request<{ prompts: AdminPrompt[]; meta: ListMeta }>('/admin/prompts', {
      params: {
        q: query.value || undefined,
        status: statusFilter.value || undefined,
        category: categoryFilter.value || undefined,
        page: page.value,
        per_page: 20,
      },
    }),
  { watch: [page, statusFilter, categoryFilter], getCachedData: () => undefined },
)

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(query, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refresh()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

const STATUS_LABELS: Record<string, string> = { published: '공개', draft: '초안', archived: '보관됨' }

async function changeStatus(prompt: AdminPrompt, status: string) {
  if (status === prompt.status) return

  try {
    await request(`/admin/prompts/${encodeURIComponent(prompt.slug)}`, {
      method: 'PATCH',
      body: { prompt: { status } },
    })
    await Promise.all([refresh(), invalidate()])
    toast.success(`"${prompt.title}" 을 ${STATUS_LABELS[status]} 상태로 바꿨습니다`)
  } catch (caught) {
    toast.error(describeApiError(caught))
  }
}

async function destroy(prompt: AdminPrompt) {
  const confirmed = await ask({
    title: '이 문서를 완전히 지울까요?',
    description: `"${prompt.title}"`,
    impacts: [
      `버전 ${prompt.version_count}개가 함께 사라집니다`,
      `복사 ${prompt.copy_count.toLocaleString('ko-KR')}회 기록과 주소도 함께 사라집니다`,
      '되돌릴 수 없습니다 — 잠시 안 쓰는 것뿐이라면 "보관됨" 으로 바꾸세요',
    ],
    confirmLabel: '완전히 지우기',
    tone: 'danger',
  })
  if (!confirmed) return

  try {
    await request(`/admin/prompts/${encodeURIComponent(prompt.slug)}`, { method: 'DELETE' })
    await Promise.all([refresh(), invalidate()])
    toast.success(`"${prompt.title}" 을 지웠습니다`)
  } catch (caught) {
    toast.error(describeApiError(caught))
  }
}

const COLUMNS = [
  { key: 'title', label: '문서' },
  { key: 'category', label: '카테고리' },
  { key: 'status', label: '상태' },
  { key: 'stats', label: '복사 · 버전', align: 'right' as const },
  { key: 'updated', label: '최근 수정' },
  { key: 'actions', label: '', align: 'right' as const },
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="query"
        type="search"
        placeholder="제목, 본문, 태그로 검색"
        class="w-full rounded-xl bg-slate-100 px-3 py-2 text-[13px] sm:w-60 dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
      >
      <select
        v-model="statusFilter"
        class="rounded-xl bg-slate-100 px-3 py-2 text-[13px] dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
      >
        <option value="">상태 전체</option>
        <option value="published">공개</option>
        <option value="draft">초안</option>
        <option value="archived">보관됨</option>
      </select>
      <select
        v-model="categoryFilter"
        class="rounded-xl bg-slate-100 px-3 py-2 text-[13px] dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
      >
        <option value="">카테고리 전체</option>
        <option v-for="category in categories?.categories ?? []" :key="category.slug" :value="category.slug">
          {{ indentedName(category) }}
        </option>
      </select>

      <span class="text-xs text-slate-400">{{ data?.meta.total ?? 0 }}개</span>
    </div>

    <AdminTable :columns="COLUMNS">
      <tr v-for="prompt in data?.prompts ?? []" :key="prompt.id">
        <td class="px-3.5 py-2.5">
          <NuxtLink
            :to="`/prompts/${encodeURIComponent(prompt.slug)}`"
            class="font-medium hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {{ prompt.title }}
          </NuxtLink>
          <p class="mt-0.5 text-[11px] text-slate-400">{{ prompt.author?.name }} 작성</p>
        </td>
        <td class="px-3.5 py-2.5">
          <CategoryBadge :category="prompt.category" />
        </td>
        <td class="px-3.5 py-2.5">
          <select
            :value="prompt.status"
            class="rounded-lg bg-slate-100 px-2 py-1 text-[12px] dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
            :aria-label="`${prompt.title} 상태`"
            @change="changeStatus(prompt, ($event.target as HTMLSelectElement).value)"
          >
            <option value="published">공개</option>
            <option value="draft">초안</option>
            <option value="archived">보관됨</option>
          </select>
        </td>
        <td class="px-3.5 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
          {{ prompt.copy_count }} · v{{ prompt.version_count }}
        </td>
        <td class="px-3.5 py-2.5 text-slate-500 dark:text-slate-400">
          {{ prompt.last_editor?.name ?? '—' }}
          <span class="text-[11px] text-slate-400">· {{ fromNow(prompt.updated_at) }}</span>
        </td>
        <td class="px-3.5 py-2.5 text-right">
          <button
            type="button"
            class="rounded-md px-2 py-1 text-[12px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            @click="destroy(prompt)"
          >
            완전 삭제
          </button>
        </td>
      </tr>

      <tr v-if="!pending && !data?.prompts.length">
        <td :colspan="COLUMNS.length" class="px-3.5 py-10 text-center text-slate-400">
          조건에 맞는 문서가 없습니다.
        </td>
      </tr>
    </AdminTable>

    <nav v-if="data && data.meta.total_pages > 1" class="flex items-center justify-center gap-2">
      <button
        type="button"
        :disabled="page <= 1"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
        @click="page -= 1"
      >
        이전
      </button>
      <span class="text-xs tabular-nums text-slate-500">{{ data.meta.page }} / {{ data.meta.total_pages }}</span>
      <button
        type="button"
        :disabled="page >= data.meta.total_pages"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
        @click="page += 1"
      >
        다음
      </button>
    </nav>
  </div>
</template>
