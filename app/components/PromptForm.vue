<script setup lang="ts">
import type { CategoryRow, DomainRow, Prompt } from '~/types'
import type { ImportedPrompt } from '~/composables/useMarkdownFile'
import type { PromptDraft } from '~/composables/usePromptDraft'

const props = defineProps<{
  categories: CategoryRow[]
  domains?: DomainRow[]
  prompt?: Prompt
  /** 새 문서를 사이드바의 폴더에서 시작했을 때 미리 골라 둘 카테고리 */
  initialCategory?: string
  /** 폴더에 넣다가 확인이 필요해 넘어온 파일 초안 */
  draft?: PromptDraft | null
  submitLabel: string
  pending?: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [payload: Record<string, unknown>]
}>()

const MODEL_HINTS = ['Claude Opus 5', 'Claude Sonnet 5', 'Claude Haiku 4.5', 'Fable 5.1']

// 템플릿 안에 중괄호 두 개를 직접 쓰면 Vue 가 보간식으로 읽고 파싱에 실패한다.
const VARIABLE_EXAMPLE = '{{변수명}}'

const title = ref(props.prompt?.title ?? '')
const categorySlug = ref(
  props.prompt?.category.slug
    ?? props.categories.find((category) => category.slug === props.initialCategory)?.slug
    ?? props.categories[0]?.slug
    ?? '',
)
const summary = ref(props.prompt?.summary ?? '')
const body = ref(props.prompt?.body ?? '')
const usageNotes = ref(props.prompt?.usage_notes ?? '')
const modelHint = ref(props.prompt?.model_hint ?? '')
const status = ref(props.prompt?.status ?? 'published')
const tagInput = ref(props.prompt?.tags.map((tag) => tag.name).join(', ') ?? '')
const domainSlugs = ref<string[]>(props.prompt?.domains.map((domain) => domain.slug) ?? [])
const changeNote = ref('')

// 설명은 사용자가 적은 것을 지키고, 목록은 항상 본문에서 새로 읽는다.
const descriptions = ref<Record<string, string>>(
  Object.fromEntries((props.prompt?.variables ?? []).map((variable) => [variable.name, variable.description])),
)
const examples = ref<Record<string, string>>(
  Object.fromEntries((props.prompt?.variables ?? []).map((variable) => [variable.name, variable.example])),
)

const detectedVariables = computed(() => extractVariables(body.value))

// ---- .md · .sh 파일에서 불러오기 ----
// 서버가 파일을 읽어 폼에 채울 값만 돌려준다. 저장은 사용자가 확인하고 직접 누른다.
const { parse: parseMarkdown } = useMarkdownFile()
const { ask } = useConfirm()
const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importNotice = ref('')
const importWarnings = ref<string[]>([])
const importError = ref('')

function pickFile() {
  fileInput.value?.click()
}

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 같은 파일을 다시 골라도 change 가 일어나게 비워 둔다
  if (!file) return

  const hasContent = Boolean(title.value.trim() || body.value.trim())
  if (hasContent) {
    const confirmed = await ask({
      title: '파일 내용으로 바꿀까요?',
      description: `지금 폼에 적힌 내용을 "${file.name}" 내용으로 덮어씁니다.`,
      impacts: [
        '제목·본문·태그·사용 팁이 파일 내용으로 바뀝니다',
        '저장을 누르기 전까지는 아무것도 반영되지 않습니다',
      ],
      confirmLabel: '파일 내용으로 바꾸기',
    })
    if (!confirmed) return
  }

  importing.value = true
  importNotice.value = ''
  importError.value = ''
  importWarnings.value = []

  try {
    const { prompt: fields, warnings } = await parseMarkdown(file)
    applyImported(fields, warnings, file.name)
  } catch (caught) {
    importError.value = describeApiError(caught)
  } finally {
    importing.value = false
  }
}

// 고른 도메인을 트리 순서대로. 체크 상자를 누른 순서가 아니라 목록 순서로 보여야 덜 헷갈린다.
const chosenDomains = computed(() => (props.domains ?? []).filter((domain) => domainSlugs.value.includes(domain.slug)))

function applyImported(fields: ImportedPrompt, warnings: string[], source: string) {
  title.value = fields.title
  summary.value = fields.summary
  body.value = fields.body
  usageNotes.value = fields.usage_notes
  modelHint.value = fields.model_hint
  tagInput.value = fields.tag_names.join(', ')
  domainSlugs.value = fields.domain_slugs.filter((slug) => props.domains?.some((domain) => domain.slug === slug))
  if (fields.category_slug && props.categories.some((category) => category.slug === fields.category_slug)) {
    categorySlug.value = fields.category_slug
  }
  descriptions.value = Object.fromEntries(fields.variables.map((variable) => [variable.name, variable.description]))
  examples.value = Object.fromEntries(fields.variables.map((variable) => [variable.name, variable.example]))

  importWarnings.value = warnings
  importNotice.value = `"${source}" 에서 불러왔습니다. 확인하고 저장해 주세요.`
}

// 폴더에 넣다가 확인이 필요해 넘어온 파일도 같은 자리에 채워 둔다.
if (props.draft) applyImported(props.draft.fields, props.draft.warnings, props.draft.source)

const tagNames = computed(() =>
  tagInput.value
    .split(/[,\n]/)
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean),
)

function submit() {
  emit('submit', {
    title: title.value.trim(),
    category_slug: categorySlug.value,
    summary: summary.value.trim(),
    body: body.value,
    usage_notes: usageNotes.value.trim(),
    model_hint: modelHint.value.trim(),
    status: status.value,
    tag_names: tagNames.value,
    domain_slugs: domainSlugs.value,
    change_note: changeNote.value.trim(),
    variables: detectedVariables.value.map((name) => ({
      name,
      description: descriptions.value[name] ?? '',
      example: examples.value[name] ?? '',
    })),
  })
}
</script>

<template>
  <form class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" @submit.prevent="submit">
    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 dark:border-slate-700">
        <button
          type="button"
          :disabled="importing"
          class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          @click="pickFile"
        >
          <svg class="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M10 13V3m0 0L6 7m4-4 4 4M4 13v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ importing ? '읽는 중...' : '파일에서 불러오기' }}
        </button>
        <span class="text-[11px] text-slate-400 dark:text-slate-500">
          .md · .sh — md 는 앞부분에 적어 둔 제목·카테고리·도메인·태그까지 함께 채워집니다
        </span>
        <input
          ref="fileInput"
          type="file"
          accept=".md,.markdown,.txt,.sh,text/markdown,text/plain,application/x-sh,text/x-shellscript"
          class="hidden"
          data-testid="markdown-file"
          @change="onFileChosen"
        >

        <div v-if="importNotice || importError" class="w-full">
          <p v-if="importError" class="text-xs text-rose-600 dark:text-rose-400">{{ importError }}</p>
          <p v-else class="text-xs text-emerald-700 dark:text-emerald-400">{{ importNotice }}</p>
          <ul v-if="importWarnings.length" class="mt-1.5 space-y-0.5">
            <li
              v-for="warning in importWarnings"
              :key="warning"
              class="text-[11px] text-amber-700 dark:text-amber-400"
            >
              · {{ warning }}
            </li>
          </ul>
        </div>
      </div>

      <div>
        <label for="form-title" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">제목</label>
        <input
          id="form-title"
          v-model="title"
          required
          maxlength="120"
          placeholder="예: 회의록 정리와 액션 아이템 추출"
          class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
        >
      </div>

      <div>
        <label for="form-summary" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
          한 줄 설명
          <span class="font-normal text-slate-400">목록에서 이 문장만 보입니다</span>
        </label>
        <input
          id="form-summary"
          v-model="summary"
          maxlength="300"
          placeholder="어떤 상황에서 쓰는 프롬프트인지 한 문장으로"
          class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
        >
      </div>

      <div>
        <label for="form-body" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
          본문
          <span class="font-normal text-slate-400">바꿔 넣을 부분은 <code class="font-mono">{{ VARIABLE_EXAMPLE }}</code> 으로 적으세요</span>
        </label>
        <textarea
          id="form-body"
          v-model="body"
          required
          rows="20"
          placeholder="아래 회의 기록을 정리해 주세요.&#10;&#10;## 기록&#10;{{녹취록}}"
          class="w-full resize-y rounded-xl bg-slate-100 px-3 py-2.5 font-mono text-[13px] leading-relaxed dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
        />
      </div>

      <div v-if="detectedVariables.length" class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <h2 class="text-xs font-semibold">본문에서 찾은 변수 {{ detectedVariables.length }}개</h2>
        <p class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          설명과 예시를 적어 두면 쓰는 사람이 무엇을 넣어야 할지 바로 압니다.
        </p>

        <div class="mt-3 space-y-2.5">
          <div v-for="name in detectedVariables" :key="name" class="grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
            <span class="rounded bg-amber-100 px-1.5 py-1 text-center font-mono text-[11px] text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
              {{ name }}
            </span>
            <input
              v-model="descriptions[name]"
              placeholder="설명"
              class="w-full rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
            >
            <input
              v-model="examples[name]"
              placeholder="예시"
              class="w-full rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
            >
          </div>
        </div>
      </div>

      <div>
        <label for="form-usage" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
          사용 팁 <span class="font-normal text-slate-400">(선택)</span>
        </label>
        <textarea
          id="form-usage"
          v-model="usageNotes"
          rows="3"
          placeholder="써 보니 이런 점을 주의해야 하더라 — 같은 실전 메모"
          class="w-full resize-y rounded-xl bg-slate-100 px-3 py-2.5 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
        />
      </div>
    </div>

    <aside class="space-y-5 lg:sticky lg:top-20 lg:self-start">
      <div class="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <div>
          <label for="form-category" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">카테고리</label>
          <select
            id="form-category"
            v-model="categorySlug"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
            <option v-for="category in categories" :key="category.slug" :value="category.slug">{{ indentedName(category) }}</option>
          </select>
        </div>

        <fieldset v-if="domains?.length">
          <legend class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            도메인 <span class="font-normal text-slate-400">여러 개 골라도 됩니다</span>
          </legend>
          <div class="max-h-56 overflow-y-auto rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800">
            <label
              v-for="domain in domains"
              :key="domain.slug"
              class="flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 text-[13px] hover:bg-white dark:hover:bg-slate-900"
              :style="{ paddingLeft: `${0.5 + domain.depth * 1.1}rem` }"
            >
              <input
                v-model="domainSlugs"
                type="checkbox"
                :value="domain.slug"
                class="size-3.5 shrink-0 rounded accent-indigo-600"
              >
              <span class="truncate" :class="domain.depth ? 'text-slate-600 dark:text-slate-300' : 'font-medium'">{{ domain.name }}</span>
            </label>
          </div>
          <p class="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <template v-if="chosenDomains.length">{{ chosenDomains.map((domain) => domain.path.join(' › ')).join(', ') }}</template>
            <template v-else>고르지 않으면 업계를 가리지 않는 범용 문서로 둡니다.</template>
          </p>
        </fieldset>

        <div>
          <label for="form-tags" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            태그 <span class="font-normal text-slate-400">쉼표로 구분</span>
          </label>
          <input
            id="form-tags"
            v-model="tagInput"
            placeholder="회의, 요약"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
          <div v-if="tagNames.length" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="tag in tagNames"
              :key="tag"
              class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >#{{ tag }}</span>
          </div>
        </div>

        <div>
          <label for="form-model" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">권장 모델</label>
          <input
            id="form-model"
            v-model="modelHint"
            list="model-hints"
            placeholder="Claude Sonnet 5"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
          <datalist id="model-hints">
            <option v-for="hint in MODEL_HINTS" :key="hint" :value="hint" />
          </datalist>
        </div>

        <div>
          <label for="form-status" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">상태</label>
          <select
            id="form-status"
            v-model="status"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
            <option value="published">공개 — 목록에 보입니다</option>
            <option value="draft">초안 — 다듬는 중</option>
          </select>
        </div>

        <div>
          <label for="form-change-note" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            변경 메모 <span class="font-normal text-slate-400">(선택)</span>
          </label>
          <input
            id="form-change-note"
            v-model="changeNote"
            placeholder="무엇을 왜 바꿨는지"
            class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
          >
          <p class="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">히스토리에 그대로 남습니다.</p>
        </div>
      </div>

      <p v-if="error" class="rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
        {{ error }}
      </p>

      <div class="flex gap-2">
        <button
          type="submit"
          :disabled="pending"
          class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {{ pending ? '저장 중...' : submitLabel }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          @click="$router.back()"
        >
          취소
        </button>
      </div>
    </aside>
  </form>
</template>
