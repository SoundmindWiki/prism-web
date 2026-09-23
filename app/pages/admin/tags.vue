<script setup lang="ts">
import type { Tag } from '~/types'

const { request } = useApi()
const { invalidate } = usePromptCache()
const { ask } = useConfirm()
const toast = useToast()

useHead({ title: '백오피스 · 태그' })

const onlyOrphans = ref(false)

const { data, refresh } = await useAsyncData(
  'admin-tags',
  () => request<{ tags: Tag[] }>('/admin/tags'),
  { getCachedData: () => undefined },
)

const visible = computed(() => {
  const tags = data.value?.tags ?? []
  return onlyOrphans.value ? tags.filter((tag) => (tag.prompts_count ?? 0) === 0) : tags
})
const orphanCount = computed(() => (data.value?.tags ?? []).filter((tag) => (tag.prompts_count ?? 0) === 0).length)

const renaming = ref<Tag | null>(null)
const merging = ref<Tag | null>(null)
const newName = ref('')
const mergeInto = ref('')
const saving = ref(false)
const formError = ref('')

const mergeTargets = computed(() => (data.value?.tags ?? []).filter((tag) => tag.slug !== merging.value?.slug))
const mergeDescription = computed(() => {
  const tag = merging.value
  if (!tag) return ''

  const count = tag.prompts_count ?? 0
  return count > 0
    ? `문서 ${count}개가 "${tag.name}" 에서 고른 태그로 옮겨 가고, "${tag.name}" 은 사라집니다. 되돌릴 수 없습니다.`
    : `"${tag.name}" 을 단 문서는 없습니다. 태그만 사라집니다.`
})

function openRename(tag: Tag) {
  renaming.value = tag
  newName.value = tag.name
  formError.value = ''
}

function openMerge(tag: Tag) {
  merging.value = tag
  mergeInto.value = ''
  formError.value = ''
}

async function rename() {
  if (!renaming.value || saving.value) return

  saving.value = true
  formError.value = ''

  try {
    await request(`/admin/tags/${encodeURIComponent(renaming.value.slug)}`, {
      method: 'PATCH',
      body: { tag: { name: newName.value.trim() } },
    })
    const renamed = newName.value.trim()
    renaming.value = null
    await Promise.all([refresh(), invalidate()])
    toast.success(`태그 이름을 "${renamed}" 으로 바꿨습니다`)
  } catch (caught) {
    formError.value = describeApiError(caught)
  } finally {
    saving.value = false
  }
}

async function merge() {
  if (!merging.value || !mergeInto.value || saving.value) return

  saving.value = true
  formError.value = ''

  try {
    const response = await request<{ tag: Tag; moved: number }>(
      `/admin/tags/${encodeURIComponent(merging.value.slug)}/merge`,
      { method: 'POST', body: { into: mergeInto.value } },
    )
    const from = merging.value.name
    merging.value = null
    await Promise.all([refresh(), invalidate()])
    toast.success(`"${from}" 을 "${response.tag.name}" 에 합쳤습니다 · 문서 ${response.moved}개 이동`)
  } catch (caught) {
    formError.value = describeApiError(caught)
  } finally {
    saving.value = false
  }
}

async function destroy(tag: Tag) {
  const count = tag.prompts_count ?? 0

  const confirmed = await ask({
    title: '이 태그를 지울까요?',
    description: `#${tag.name}`,
    impacts: count > 0
      ? [
          `문서 ${count}개에서 이 태그가 떨어집니다`,
          '문서 자체와 히스토리는 그대로 남습니다',
          '다른 태그로 옮기려면 지우는 대신 "합치기" 를 쓰세요',
        ]
      : ['이 태그를 단 문서는 없습니다'],
    confirmLabel: '지우기',
    tone: 'danger',
  })
  if (!confirmed) return

  try {
    await request(`/admin/tags/${encodeURIComponent(tag.slug)}`, { method: 'DELETE' })
    await Promise.all([refresh(), invalidate()])
    toast.success(`"${tag.name}" 태그를 지웠습니다`)
  } catch (caught) {
    toast.error(describeApiError(caught))
  }
}

const COLUMNS = [
  { key: 'name', label: '태그' },
  { key: 'count', label: '쓰는 문서', align: 'right' as const },
  { key: 'actions', label: '', align: 'right' as const },
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <p class="text-[13px] text-slate-500 dark:text-slate-400">
        태그는 아무나 만들 수 있어서 금방 비슷한 게 쌓입니다. 여기서 합치고 정리하세요.
      </p>
      <label class="ml-auto flex shrink-0 items-center gap-1.5 text-[13px]">
        <input v-model="onlyOrphans" type="checkbox" class="rounded border-slate-300 dark:border-slate-600">
        안 쓰는 태그만
        <span v-if="orphanCount" class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
          {{ orphanCount }}
        </span>
      </label>
    </div>

    <AdminTable :columns="COLUMNS">
      <tr v-for="tag in visible" :key="tag.slug">
        <td class="px-3.5 py-2.5">
          <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            #{{ tag.name }}
          </span>
        </td>
        <td class="px-3.5 py-2.5 text-right tabular-nums">
          <span :class="(tag.prompts_count ?? 0) === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'">
            {{ tag.prompts_count }}
          </span>
        </td>
        <td class="px-3.5 py-2.5">
          <div class="flex justify-end gap-1">
            <button type="button" class="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" @click="openRename(tag)">
              이름 변경
            </button>
            <button type="button" class="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" @click="openMerge(tag)">
              합치기
            </button>
            <button type="button" class="rounded-md px-2 py-1 text-[12px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" @click="destroy(tag)">
              삭제
            </button>
          </div>
        </td>
      </tr>

      <tr v-if="!visible.length">
        <td :colspan="COLUMNS.length" class="px-3.5 py-10 text-center text-slate-400">
          {{ onlyOrphans ? '안 쓰는 태그가 없습니다. 깨끗하네요.' : '태그가 없습니다.' }}
        </td>
      </tr>
    </AdminTable>

    <AdminDialog v-if="renaming" title="태그 이름 변경" description="이 태그를 단 문서에 모두 반영됩니다." @close="renaming = null">
      <form class="space-y-3.5" @submit.prevent="rename">
        <div>
          <label for="tag-name" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">새 이름</label>
          <input id="tag-name" v-model="newName" required maxlength="30" class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
        </div>
        <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ formError }}</p>
        <div class="flex gap-2">
          <button type="submit" :disabled="saving" class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
            {{ saving ? '저장 중...' : '바꾸기' }}
          </button>
          <button type="button" class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700" @click="renaming = null">취소</button>
        </div>
      </form>
    </AdminDialog>

    <AdminDialog
      v-if="merging"
      title="태그 합치기"
      :description="mergeDescription"
      @close="merging = null"
    >
      <form class="space-y-3.5" @submit.prevent="merge">
        <div>
          <label for="merge-into" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">어느 태그로 합칠까요?</label>
          <select id="merge-into" v-model="mergeInto" required class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
            <option value="" disabled>선택하세요</option>
            <option v-for="tag in mergeTargets" :key="tag.slug" :value="tag.slug">
              #{{ tag.name }} ({{ tag.prompts_count }}개)
            </option>
          </select>
        </div>
        <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ formError }}</p>
        <div class="flex gap-2">
          <button type="submit" :disabled="saving || !mergeInto" class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
            {{ saving ? '합치는 중...' : '합치기' }}
          </button>
          <button type="button" class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700" @click="merging = null">취소</button>
        </div>
      </form>
    </AdminDialog>
  </div>
</template>
