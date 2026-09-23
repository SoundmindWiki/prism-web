<script setup lang="ts">
import type { Prompt, PromptVersion } from '~/types'

const { request } = useApi()
const { user } = useAuth()
const { invalidate } = usePromptCache()
const { ask } = useConfirm()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const slug = computed(() => String(route.params.slug))

const { data, refresh } = await useAsyncData(
  () => `versions:${slug.value}`,
  () => request<{ prompt: { slug: string; title: string }; versions: PromptVersion[] }>(
    `/prompts/${encodeURIComponent(slug.value)}/versions`,
  ),
)

const selectedNumber = ref<number | null>(null)
const selected = ref<PromptVersion | null>(null)
const loadingVersion = ref(false)
const restoring = ref(false)
const actionError = ref('')

watch(data, (value) => {
  if (value?.versions.length && selectedNumber.value === null) {
    open(value.versions[0]!.version_number)
  }
}, { immediate: true })

async function open(number: number) {
  selectedNumber.value = number
  loadingVersion.value = true
  actionError.value = ''

  try {
    const response = await request<{ version: PromptVersion }>(
      `/prompts/${encodeURIComponent(slug.value)}/versions/${number}`,
    )
    selected.value = response.version
  } catch (caught) {
    actionError.value = describeApiError(caught)
  } finally {
    loadingVersion.value = false
  }
}

async function restore(number: number) {
  if (restoring.value) return

  const confirmed = await ask({
    title: `v${number} 내용으로 되돌릴까요?`,
    description: '지금 내용을 덮어씁니다.',
    impacts: [
      `제목·본문·변수가 v${number} 시점으로 돌아갑니다`,
      '지금 내용도 새 버전으로 히스토리에 남습니다',
      '되돌린 뒤에도 언제든 다시 돌아올 수 있습니다',
    ],
    confirmLabel: '되돌리기',
  })
  if (!confirmed) return

  restoring.value = true
  actionError.value = ''

  try {
    await request<{ prompt: Prompt }>(`/prompts/${encodeURIComponent(slug.value)}/versions/${number}/restore`, {
      method: 'POST',
    })
    await invalidate(slug.value)
    await router.push(`/prompts/${encodeURIComponent(slug.value)}`)
    toast.success(`v${number} 내용으로 되돌렸습니다`)
  } catch (caught) {
    toast.error(describeApiError(caught))
    restoring.value = false
  }
}
</script>

<template>
  <div v-if="data" class="mx-auto max-w-5xl space-y-6">
    <nav class="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
      <NuxtLink :to="`/prompts/${encodeURIComponent(slug)}`" class="hover:text-slate-600 dark:hover:text-slate-300">
        {{ data.prompt.title }}
      </NuxtLink>
      <span>/</span>
      <span>히스토리</span>
    </nav>

    <div>
      <h1 class="text-xl font-bold tracking-tight">히스토리</h1>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        저장할 때마다 한 벌씩 남습니다. 되돌리기도 지우지 않고 새 버전으로 쌓입니다.
      </p>
    </div>

    <p v-if="actionError" class="rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
      {{ actionError }}
    </p>

    <div class="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <ol class="space-y-1.5">
        <li v-for="version in data.versions" :key="version.version_number">
          <button
            type="button"
            class="w-full rounded-xl border px-3.5 py-3 text-left transition-colors"
            :class="selectedNumber === version.version_number
              ? 'border-indigo-400 bg-indigo-50/70 dark:border-indigo-500/60 dark:bg-indigo-500/10'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'"
            @click="open(version.version_number)"
          >
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs font-semibold">v{{ version.version_number }}</span>
              <span
                v-if="version.version_number === data.versions[0]?.version_number"
                class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
              >현재</span>
              <span class="ml-auto text-[11px] text-slate-400 dark:text-slate-500">{{ fromNow(version.created_at) }}</span>
            </div>

            <p class="mt-1.5 text-[13px] leading-snug">
              {{ version.change_note || '변경 메모 없음' }}
            </p>

            <div class="mt-2 flex flex-wrap items-center gap-1">
              <span
                v-for="field in version.changed_fields"
                :key="field"
                class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >{{ fieldLabel(field) }} 수정</span>
              <span class="ml-auto text-[11px] text-slate-400 dark:text-slate-500">{{ version.editor?.name ?? '알 수 없음' }}</span>
            </div>
          </button>
        </li>
      </ol>

      <section v-if="selected" class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 class="text-sm font-semibold">v{{ selected.version_number }} · {{ selected.title }}</h2>
            <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              {{ formatDate(selected.created_at) }} · {{ selected.editor?.name ?? '알 수 없음' }}
            </p>
          </div>

          <button
            v-if="user && selected.version_number !== data.versions[0]?.version_number"
            type="button"
            :disabled="restoring"
            class="ml-auto rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            @click="restore(selected.version_number)"
          >
            {{ restoring ? '되돌리는 중...' : '이 버전으로 되돌리기' }}
          </button>
        </header>

        <div class="max-h-[36rem] overflow-auto px-4 py-4">
          <p v-if="loadingVersion" class="text-xs text-slate-400">불러오는 중...</p>
          <PromptBody v-else-if="selected.body" :body="selected.body" />
        </div>
      </section>
    </div>
  </div>
</template>
