<script setup lang="ts">
import type { Prompt } from '~/types'

const { request } = useApi()
const { user } = useAuth()
const { invalidate } = usePromptCache()
const { ask } = useConfirm()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const slug = computed(() => String(route.params.slug))

const { data, pending, error: loadError } = useAsyncData(
  () => `prompt:${slug.value}`,
  () => request<{ prompt: Prompt }>(`/prompts/${encodeURIComponent(slug.value)}`),
  {
    // 위키는 남이 방금 고쳤을 수 있다. 캐시를 쓰지 않고 열 때마다 현재 내용을 읽는다.
    getCachedData: () => undefined,
    // 빈 화면으로 기다리게 두지 않고 뼈대부터 그린다.
    lazy: true,
  },
)

const prompt = computed(() => data.value?.prompt)

// 경로 이동줄에 상위 카테고리까지 링크로 걸려고 사이드바가 이미 받아 둔 목록을 빌려 쓴다.
// 문서에는 경로 이름만 실려 오기 때문이다. 목록이 아직 없으면 이름만 보인다.
const { data: nav } = useWikiNav()
const categoryTrail = computed(() => {
  const category = prompt.value?.category
  if (!category) return []

  const rows = nav.value?.categories ?? []
  const trail: { name: string; slug?: string }[] = []
  let cursor = rows.find((row) => row.id === category.id)
  while (cursor) {
    trail.unshift({ name: cursor.name, slug: cursor.slug })
    const parentId = cursor.parent_id
    cursor = parentId == null ? undefined : rows.find((row) => row.id === parentId)
  }
  if (trail.length) return trail

  return category.path.map((name, index) =>
    index === category.path.length - 1 ? { name, slug: category.slug } : { name },
  )
})

useHead({ title: () => prompt.value?.title ?? '문서' })
const archiving = ref(false)

// ---- .md 로 내려받기 ----
const { download } = useMarkdownFile()
const downloading = ref(false)

async function downloadMarkdown() {
  if (!prompt.value || downloading.value) return

  downloading.value = true
  try {
    await download(prompt.value.slug)
    toast.success(`${prompt.value.slug}.md 로 내려받았습니다`)
  } catch (caught) {
    toast.error(describeApiError(caught))
  } finally {
    downloading.value = false
  }
}

async function archive() {
  if (!prompt.value || archiving.value) return

  const confirmed = await ask({
    title: '이 문서를 보관할까요?',
    description: `"${prompt.value.title}" 을 목록에서 내립니다.`,
    impacts: [
      '전체 문서 목록과 왼쪽 사이드바에서 사라집니다',
      `주소와 히스토리 v${prompt.value.version_count} 은 그대로 남습니다`,
      '다시 고쳐서 언제든 되살릴 수 있습니다',
    ],
    confirmLabel: '보관하기',
  })
  if (!confirmed) return

  archiving.value = true

  try {
    const response = await request<{ prompt: Prompt }>(`/prompts/${encodeURIComponent(slug.value)}/archive`, { method: 'POST' })
    data.value = response
    await invalidate()
    toast.success('보관했습니다')
  } catch (caught) {
    toast.error(describeApiError(caught))
  } finally {
    archiving.value = false
  }
}
</script>

<template>
  <div v-if="prompt" class="mx-auto max-w-5xl">
    <nav class="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
      <NuxtLink to="/prompts" class="hover:text-slate-600 dark:hover:text-slate-300">전체 문서</NuxtLink>
      <span>/</span>
      <template v-for="step in categoryTrail" :key="step.name">
        <NuxtLink
          v-if="step.slug"
          :to="{ path: '/prompts', query: { category: step.slug } }"
          class="shrink-0 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {{ step.name }}
        </NuxtLink>
        <span v-else class="shrink-0">{{ step.name }}</span>
        <span>/</span>
      </template>
      <span class="truncate text-slate-500 dark:text-slate-400">{{ prompt.title }}</span>
    </nav>

    <div class="mt-4 grid gap-8 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
      <article class="min-w-0 space-y-5">
        <header class="space-y-2.5">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-bold tracking-tight">{{ prompt.title }}</h1>
            <span
              v-if="prompt.status === 'draft'"
              class="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
            >초안</span>
            <span
              v-else-if="prompt.status === 'archived'"
              class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            >보관됨</span>
          </div>

          <p v-if="prompt.summary" class="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {{ prompt.summary }}
          </p>
        </header>

        <PromptComposer :prompt="prompt" />

        <section v-if="prompt.usage_notes" class="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/25 dark:bg-amber-400/5">
          <h2 class="flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <svg class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M10 2.5a5 5 0 0 0-3 9v2h6v-2a5 5 0 0 0-3-9ZM8 16.5h4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            써 본 사람의 팁
          </h2>
          <p class="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-amber-900/85 dark:text-amber-100/85">
            {{ prompt.usage_notes }}
          </p>
        </section>
      </article>

      <!-- 문서 정보 레일 — 위키에서 "이 문서 누가 언제" 를 보는 자리 -->
      <aside class="space-y-4 xl:sticky xl:top-6">
        <div class="flex flex-wrap gap-1.5">
          <NuxtLink
            :to="`/prompts/${encodeURIComponent(prompt.slug)}/edit`"
            class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-center text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            고치기
          </NuxtLink>
          <NuxtLink
            :to="`/prompts/${encodeURIComponent(prompt.slug)}/history`"
            class="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-center text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            히스토리 <span class="tabular-nums opacity-60">v{{ prompt.version_count }}</span>
          </NuxtLink>
          <button
            type="button"
            :disabled="downloading"
            class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            @click="downloadMarkdown"
          >
            <svg class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M10 3v10m0 0 4-4m-4 4-4-4M4 13v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ downloading ? '준비 중...' : 'MD로 내려받기' }}
          </button>
        </div>

        <dl class="divide-y divide-slate-200 rounded-xl border border-slate-200 px-3.5 text-xs dark:divide-slate-800 dark:border-slate-800">
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="shrink-0 text-slate-400 dark:text-slate-500">카테고리</dt>
            <dd><CategoryBadge :category="prompt.category" /></dd>
          </div>
          <div class="py-2.5">
            <dt class="mb-1.5 text-slate-400 dark:text-slate-500">도메인</dt>
            <dd v-if="prompt.domains.length" class="flex flex-wrap gap-1">
              <DomainChip v-for="domain in prompt.domains" :key="domain.id" :domain="domain" full-path />
            </dd>
            <dd v-else class="text-slate-500 dark:text-slate-400">범용 — 업계를 가리지 않음</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="shrink-0 text-slate-400 dark:text-slate-500">만든 사람</dt>
            <dd class="truncate">{{ prompt.author?.name ?? '알 수 없음' }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="shrink-0 text-slate-400 dark:text-slate-500">최근 수정</dt>
            <dd class="truncate text-right">
              {{ prompt.last_editor?.name ?? '—' }}
              <span class="text-slate-400 dark:text-slate-500">· {{ fromNow(prompt.updated_at) }}</span>
            </dd>
          </div>
          <div v-if="prompt.model_hint" class="flex items-center justify-between gap-3 py-2.5">
            <dt class="shrink-0 text-slate-400 dark:text-slate-500">권장 모델</dt>
            <dd class="truncate">{{ prompt.model_hint }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="shrink-0 text-slate-400 dark:text-slate-500">복사</dt>
            <dd class="tabular-nums">{{ prompt.copy_count }}회</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2.5">
            <dt class="shrink-0 text-slate-400 dark:text-slate-500">조회</dt>
            <dd class="tabular-nums">{{ prompt.view_count }}회</dd>
          </div>
          <div v-if="prompt.variables.length" class="py-2.5">
            <dt class="mb-1.5 text-slate-400 dark:text-slate-500">변수 {{ prompt.variables.length }}개</dt>
            <dd class="flex flex-wrap gap-1">
              <span
                v-for="variable in prompt.variables"
                :key="variable.name"
                class="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
              >{{ variable.name }}</span>
            </dd>
          </div>
          <div v-if="prompt.tags.length" class="py-2.5">
            <dt class="mb-1.5 text-slate-400 dark:text-slate-500">태그</dt>
            <dd class="flex flex-wrap gap-1">
              <TagChip v-for="tag in prompt.tags" :key="tag.id" :tag="tag" />
            </dd>
          </div>
        </dl>

        <button
          v-if="user && prompt.status !== 'archived'"
          type="button"
          :disabled="archiving"
          class="w-full rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          @click="archive"
        >
          이 문서 보관하기
        </button>
      </aside>
    </div>
  </div>

  <!-- 문서를 받아 오는 동안. 실제 화면과 같은 골격이라 도착해도 자리가 안 튄다. -->
  <div v-else-if="pending" class="mx-auto max-w-5xl" aria-hidden="true">
    <div class="skeleton h-3 w-52" />
    <div class="mt-4 grid gap-8 xl:grid-cols-[minmax(0,1fr)_15rem] xl:items-start">
      <div class="min-w-0 space-y-5">
        <div class="space-y-2.5">
          <div class="skeleton h-7 w-2/3" />
          <div class="skeleton h-4 w-full max-w-lg" />
        </div>
        <div class="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
          <div class="flex items-center gap-3">
            <div class="skeleton h-4 w-16" />
            <div class="skeleton ml-auto h-7 w-16 rounded-xl" />
          </div>
          <div class="mt-4 space-y-2">
            <div v-for="line in 8" :key="line" class="skeleton h-3" :class="line % 3 === 0 ? 'w-2/3' : 'w-full'" />
          </div>
        </div>
      </div>
      <div class="space-y-4">
        <div class="flex gap-1.5">
          <div class="skeleton h-7 flex-1 rounded-xl" />
          <div class="skeleton h-7 flex-1 rounded-xl" />
        </div>
        <div class="skeleton h-64 rounded-2xl" />
      </div>
    </div>
  </div>

  <EmptyState
    v-else-if="loadError"
    title="이 문서를 찾을 수 없습니다"
    description="주소가 바뀌었거나 삭제됐을 수 있습니다."
  >
    <button type="button" class="text-sm text-indigo-600 hover:underline dark:text-indigo-400" @click="router.push('/prompts')">
      전체 목록으로
    </button>
  </EmptyState>
</template>
