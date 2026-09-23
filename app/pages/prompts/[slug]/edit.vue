<script setup lang="ts">
import type { CategoryRow, DomainRow, Prompt } from '~/types'

const { request } = useApi()
const { user } = useAuth()
const { invalidate } = usePromptCache()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const slug = computed(() => String(route.params.slug))

const { data: categories } = await useAsyncData('categories', () => request<{ categories: CategoryRow[] }>('/categories'))
const { data: domains } = await useAsyncData('domains', () => request<{ domains: DomainRow[] }>('/domains'))
const { data } = await useAsyncData(
  () => `prompt:${slug.value}`,
  () => request<{ prompt: Prompt }>(`/prompts/${encodeURIComponent(slug.value)}`),
  // 남이 먼저 고쳐 둔 내용을 덮어쓰지 않도록, 폼도 항상 현재 내용에서 시작한다.
  { getCachedData: () => undefined },
)

const pending = ref(false)
const error = ref('')

async function save(payload: Record<string, unknown>) {
  if (pending.value) return
  if (!user.value) {
    error.value = '로그인이 필요합니다.'
    return
  }

  pending.value = true
  error.value = ''

  try {
    await request<{ prompt: Prompt }>(`/prompts/${encodeURIComponent(slug.value)}`, {
      method: 'PATCH',
      body: { prompt: payload },
    })
    await invalidate(slug.value)
    await router.push(`/prompts/${encodeURIComponent(slug.value)}`)
    toast.success('저장했습니다')
  } catch (caught) {
    error.value = describeApiError(caught)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div v-if="data?.prompt && categories?.categories.length" class="mx-auto max-w-5xl space-y-6">
    <div>
      <h1 class="text-xl font-bold tracking-tight">고치기 — {{ data.prompt.title }}</h1>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        저장하면 이전 내용은 히스토리에 그대로 남습니다. 마음 편히 고치세요.
      </p>
    </div>

    <PromptForm
      :categories="categories.categories"
      :domains="domains?.domains ?? []"
      :prompt="data.prompt"
      submit-label="저장"
      :pending="pending"
      :error="error"
      @submit="save"
    />
  </div>
</template>
