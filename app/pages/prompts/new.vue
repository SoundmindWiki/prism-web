<script setup lang="ts">
import type { CategoryRow, DomainRow, Prompt } from '~/types'

const { request } = useApi()
const { user } = useAuth()
const { invalidate } = usePromptCache()
const toast = useToast()

useHead({ title: '새 문서' })
const router = useRouter()
const route = useRoute()

const { data: categories } = await useAsyncData('categories', () => request<{ categories: CategoryRow[] }>('/categories'))
const { data: domains } = await useAsyncData('domains', () => request<{ domains: DomainRow[] }>('/domains'))

// 폴더에 .md 를 넣다가 확인이 필요해 넘어온 초안. 한 번만 쓰고 비운다.
const draft = usePromptDraft().take()

const pending = ref(false)
const error = ref('')

async function create(payload: Record<string, unknown>) {
  if (pending.value) return
  if (!user.value) {
    error.value = '로그인이 필요합니다.'
    return
  }

  pending.value = true
  error.value = ''

  try {
    const response = await request<{ prompt: Prompt }>('/prompts', { method: 'POST', body: { prompt: payload } })
    await invalidate(response.prompt.slug)
    await router.push(`/prompts/${encodeURIComponent(response.prompt.slug)}`)
    // 화면이 통째로 바뀌어서 저장됐다는 신호가 사라진다. 알림으로 한 번 짚어 준다.
    toast.success('올렸습니다')
  } catch (caught) {
    error.value = describeApiError(caught)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <h1 class="text-xl font-bold tracking-tight">새 문서</h1>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        완벽하지 않아도 괜찮습니다. 올려 두면 다른 사람이 다듬어 줍니다.
      </p>
    </div>

    <PromptForm
      v-if="categories?.categories.length"
      :categories="categories.categories"
      :domains="domains?.domains ?? []"
      :initial-category="String(route.query.category ?? '')"
      :draft="draft"
      submit-label="올리기"
      :pending="pending"
      :error="error"
      @submit="create"
    />
  </div>
</template>
