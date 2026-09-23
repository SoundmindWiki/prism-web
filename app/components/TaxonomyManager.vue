<script setup lang="ts">
import type { Category, TaxonomyFields } from '~/types'

/**
 * 트리 분류(카테고리, 도메인)를 고치는 백오피스 표.
 * 둘은 색이 있느냐, 문서가 남았을 때 지울 수 있느냐만 다르다.
 */
type Row = Pick<Category, 'id' | 'name' | 'slug' | 'path'> & TaxonomyFields & { color?: string }

const props = defineProps<{
  /** '/admin/categories' 처럼 */
  endpoint: string
  /** 서버가 받는 이름. 'category' | 'domain' */
  resourceKey: string
  collectionKey: string
  /** 화면에 쓰는 이름. '카테고리' | '도메인' */
  noun: string
  intro: string
  withColor?: boolean
  /** 문서가 바로 달려 있으면 지울 수 없는지 (카테고리) */
  keepWhileUsed?: boolean
}>()

// 서버의 Treeable::MAX_DEPTH 와 맞춘다.
const MAX_DEPTH = 3

const COLORS = [
  { value: 'indigo', label: '남색' },
  { value: 'violet', label: '보라' },
  { value: 'sky', label: '하늘' },
  { value: 'cyan', label: '청록' },
  { value: 'teal', label: '초록빛 청록' },
  { value: 'emerald', label: '초록' },
  { value: 'amber', label: '노랑' },
  { value: 'rose', label: '분홍' },
  { value: 'fuchsia', label: '자홍' },
  { value: 'orange', label: '주황' },
  { value: 'slate', label: '회색' },
]

const { request } = useApi()
const { invalidate } = usePromptCache()
const { ask } = useConfirm()
const toast = useToast()

const { data, refresh } = await useAsyncData(
  `admin-${props.collectionKey}`,
  () => request<Record<string, Row[]>>(props.endpoint),
  { getCachedData: () => undefined },
)

const rows = computed<Row[]>(() => data.value?.[props.collectionKey] ?? [])

// 조사를 이름 끝 받침에 맞춘다. 카테고리를·카테고리가 / 도메인을·도메인이
const hasBatchim = computed(() => {
  const last = props.noun.charCodeAt(props.noun.length - 1)
  return last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0
})
const nounObject = computed(() => `${props.noun}${hasBatchim.value ? '을' : '를'}`)
const nounSubject = computed(() => `${props.noun}${hasBatchim.value ? '이' : '가'}`)

// ---- 접고 펴기 ----
const collapsed = ref(new Set<number>())

const visibleRows = computed(() => {
  const hidden = new Set<number>()
  return rows.value.filter((row) => {
    if (row.parent_id != null && (hidden.has(row.parent_id) || collapsed.value.has(row.parent_id))) {
      hidden.add(row.id)
      return false
    }
    return true
  })
})

function toggle(row: Row) {
  const next = new Set(collapsed.value)
  if (next.has(row.id)) next.delete(row.id)
  else next.add(row.id)
  collapsed.value = next
}

// ---- 순서: 같은 상위 아래 형제끼리만 ----
function siblingsOf(row: Row) {
  return rows.value.filter((other) => other.parent_id === row.parent_id)
}

async function move(row: Row, direction: -1 | 1) {
  const siblings = siblingsOf(row)
  const index = siblings.findIndex((other) => other.id === row.id)
  const target = index + direction
  if (target < 0 || target >= siblings.length) return

  const [moved] = siblings.splice(index, 1)
  siblings.splice(target, 0, moved!)

  try {
    await request(`${props.endpoint}/reorder`, { method: 'POST', body: { slugs: siblings.map((other) => other.slug) } })
    await Promise.all([refresh(), invalidate()])
  } catch (caught) {
    toast.error(describeApiError(caught))
  }
}

// ---- 추가·수정 ----
const dialog = ref<'create' | 'edit' | null>(null)
const editing = ref<Row | null>(null)
const form = reactive({ name: '', description: '', color: 'slate', parent_slug: '' })
const saving = ref(false)
const formError = ref('')

// 내 아래로 몇 단계가 딸려 있는지. 통째로 옮길 때 새 자리에서 넘치지 않는지 보려고 쓴다.
function heightBelow(row: Row | null) {
  if (!row) return 0
  const inside = subtreeSlugs(rows.value, row.slug)
  const deepest = Math.max(...rows.value.filter((other) => inside.has(other.slug)).map((other) => other.depth))
  return deepest - row.depth
}

// 상위로 고를 수 있는 것: 자기와 자기 아래는 빼고, 옮겼을 때 3단계를 넘지 않는 자리만.
const parentOptions = computed(() => {
  const self = editing.value
  const own = self ? subtreeSlugs(rows.value, self.slug) : new Set<string>()
  const height = heightBelow(self)
  return rows.value.filter((row) => !own.has(row.slug) && row.depth + 1 + height < MAX_DEPTH)
})

function openCreate(parent?: Row) {
  editing.value = null
  Object.assign(form, { name: '', description: '', color: parent?.color ?? 'slate', parent_slug: parent?.slug ?? '' })
  formError.value = ''
  dialog.value = 'create'
}

function openEdit(row: Row) {
  editing.value = row
  Object.assign(form, {
    name: row.name,
    description: row.description ?? '',
    color: row.color ?? 'slate',
    parent_slug: row.parent_slug ?? '',
  })
  formError.value = ''
  dialog.value = 'edit'
}

function payload() {
  const body: Record<string, string> = { name: form.name, description: form.description, parent_slug: form.parent_slug }
  if (props.withColor) body.color = form.color
  return { [props.resourceKey]: body }
}

async function save() {
  if (saving.value) return

  saving.value = true
  formError.value = ''

  try {
    if (dialog.value === 'create') {
      await request(props.endpoint, { method: 'POST', body: payload() })
      toast.success(`"${form.name}" ${nounObject.value} 만들었습니다`)
    } else if (editing.value) {
      await request(`${props.endpoint}/${encodeURIComponent(editing.value.slug)}`, { method: 'PATCH', body: payload() })
      toast.success(`"${form.name}" ${nounObject.value} 수정했습니다`)
    }
    dialog.value = null
    await Promise.all([refresh(), invalidate()])
  } catch (caught) {
    formError.value = describeApiError(caught)
  } finally {
    saving.value = false
  }
}

// ---- 삭제 ----
function deleteBlocker(row: Row) {
  if (row.has_children) return '하위 항목을 먼저 옮기거나 지워 주세요'
  if (props.keepWhileUsed && row.prompts_count > 0) return '문서가 남아 있어 지울 수 없습니다'
  return undefined
}

async function destroy(row: Row) {
  const count = row.prompts_count
  const confirmed = await ask({
    title: `이 ${nounObject.value} 지울까요?`,
    description: `"${row.path.join(' › ')}"`,
    impacts: count > 0
      ? [
          `문서 ${count}개에서 이 ${nounSubject.value} 빠집니다`,
          '문서 자체와 히스토리는 그대로 남습니다',
          `되돌리려면 ${nounObject.value} 다시 만들고 문서마다 다시 달아야 합니다`,
        ]
      : [`지금 이 ${props.noun}에 달린 문서는 없습니다`],
    confirmLabel: '지우기',
    tone: 'danger',
  })
  if (!confirmed) return

  try {
    await request(`${props.endpoint}/${encodeURIComponent(row.slug)}`, { method: 'DELETE' })
    await Promise.all([refresh(), invalidate()])
    toast.success(`"${row.name}" ${nounObject.value} 지웠습니다`)
  } catch (caught) {
    toast.error(describeApiError(caught))
  }
}

const COLUMNS = computed(() => [
  { key: 'order', label: '순서' },
  { key: 'name', label: props.noun },
  { key: 'description', label: '설명' },
  { key: 'count', label: '문서', align: 'right' as const },
  { key: 'actions', label: '', align: 'right' as const },
])
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-[13px] text-slate-500 dark:text-slate-400">{{ intro }}</p>
      <button
        type="button"
        class="ml-auto rounded-xl bg-indigo-600 px-3 py-2 text-[13px] font-bold text-white hover:bg-indigo-700"
        @click="openCreate()"
      >
        {{ noun }} 추가
      </button>
    </div>

    <AdminTable :columns="COLUMNS">
      <tr v-for="row in visibleRows" :key="row.slug" :data-slug="row.slug">
        <td class="px-3.5 py-2.5">
          <div class="flex gap-0.5">
            <button
              type="button"
              :disabled="siblingsOf(row)[0]?.id === row.id"
              class="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              :aria-label="`${row.name} 위로`"
              @click="move(row, -1)"
            >
              <svg class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m5 12 5-5 5 5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              :disabled="siblingsOf(row).at(-1)?.id === row.id"
              class="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
              :aria-label="`${row.name} 아래로`"
              @click="move(row, 1)"
            >
              <svg class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m5 8 5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </td>

        <td class="px-3.5 py-2.5">
          <div class="flex items-start gap-1.5" :style="{ paddingLeft: `${row.depth * 1.5}rem` }">
            <button
              v-if="row.has_children"
              type="button"
              class="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              :aria-label="collapsed.has(row.id) ? `${row.name} 펼치기` : `${row.name} 접기`"
              :aria-expanded="!collapsed.has(row.id)"
              @click="toggle(row)"
            >
              <svg class="size-3 transition-transform" :class="{ 'rotate-90': !collapsed.has(row.id) }" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4 2.5 8 6l-4 3.5Z" />
              </svg>
            </button>
            <span v-else-if="row.depth" class="mt-0.5 w-4 shrink-0 text-center text-slate-300 dark:text-slate-600" aria-hidden="true">└</span>
            <span v-else class="w-4 shrink-0" aria-hidden="true" />

            <div class="min-w-0">
              <span
                v-if="withColor"
                class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                :class="categoryStyle(row.color)"
              >{{ row.name }}</span>
              <span v-else class="font-medium" :class="row.depth ? '' : 'font-semibold'">{{ row.name }}</span>
              <p class="mt-1 font-mono text-[11px] text-slate-400">/{{ row.slug }}</p>
            </div>
          </div>
        </td>

        <td class="max-w-md px-3.5 py-2.5 text-slate-500 dark:text-slate-400">{{ row.description || '—' }}</td>

        <td class="px-3.5 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
          {{ row.total_count }}
          <span
            v-if="row.has_children && row.total_count !== row.prompts_count"
            class="block text-[11px] text-slate-400"
            title="하위 항목 없이 여기에 바로 달린 문서"
          >바로 {{ row.prompts_count }}</span>
        </td>

        <td class="px-3.5 py-2.5">
          <div class="flex justify-end gap-1">
            <button
              type="button"
              class="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
              :disabled="row.depth >= MAX_DEPTH - 1"
              :title="row.depth >= MAX_DEPTH - 1 ? `${MAX_DEPTH}단계까지만 둘 수 있습니다` : undefined"
              @click="openCreate(row)"
            >
              하위 추가
            </button>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              @click="openEdit(row)"
            >
              수정
            </button>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-[12px] text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-500/10"
              :disabled="Boolean(deleteBlocker(row))"
              :title="deleteBlocker(row)"
              @click="destroy(row)"
            >
              삭제
            </button>
          </div>
        </td>
      </tr>

      <tr v-if="!rows.length">
        <td :colspan="COLUMNS.length" class="px-3.5 py-10 text-center text-[13px] text-slate-400">
          아직 {{ nounSubject }} 없습니다. 오른쪽 위 "{{ noun }} 추가" 로 시작하세요.
        </td>
      </tr>
    </AdminTable>

    <AdminDialog
      v-if="dialog"
      :title="dialog === 'create' ? `${noun} 추가` : `${noun} 수정`"
      description="주소(슬러그)는 처음 만들 때 정해지고 이후에는 바뀌지 않습니다. 공유된 링크가 깨지지 않게 하기 위해서입니다."
      @close="dialog = null"
    >
      <form class="space-y-3.5" @submit.prevent="save">
        <div>
          <label :for="`${resourceKey}-name`" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">이름</label>
          <input
            :id="`${resourceKey}-name`"
            v-model="form.name"
            required
            maxlength="40"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
        </div>

        <div>
          <label :for="`${resourceKey}-parent`" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            상위 {{ noun }}
            <span class="font-normal text-slate-400">{{ MAX_DEPTH }}단계까지</span>
          </label>
          <select
            :id="`${resourceKey}-parent`"
            v-model="form.parent_slug"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
            <option value="">없음 — 맨 위에 둡니다</option>
            <option v-for="option in parentOptions" :key="option.slug" :value="option.slug">{{ indentedName(option) }}</option>
          </select>
          <p v-if="dialog === 'edit' && editing && form.parent_slug !== (editing.parent_slug ?? '')" class="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            옮기면 새 자리의 맨 뒤로 갑니다<template v-if="editing.has_children">. 하위 항목도 함께 옮겨집니다</template>.
          </p>
        </div>

        <div>
          <label :for="`${resourceKey}-description`" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">설명</label>
          <textarea
            :id="`${resourceKey}-description`"
            v-model="form.description"
            rows="2"
            class="w-full resize-y rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          />
        </div>

        <div v-if="withColor">
          <label :for="`${resourceKey}-color`" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">색</label>
          <select
            :id="`${resourceKey}-color`"
            v-model="form.color"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
            <option v-for="color in COLORS" :key="color.value" :value="color.value">{{ color.label }}</option>
          </select>
          <span class="mt-2 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="categoryStyle(form.color)">
            {{ form.name || '미리보기' }}
          </span>
        </div>

        <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {{ formError }}
        </p>

        <div class="flex gap-2 pt-1">
          <button type="submit" :disabled="saving" class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
            {{ saving ? '저장 중...' : '저장' }}
          </button>
          <button type="button" class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700" @click="dialog = null">
            취소
          </button>
        </div>
      </form>
    </AdminDialog>
  </div>
</template>
