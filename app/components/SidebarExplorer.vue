<script setup lang="ts">
import type { CategoryBranch } from '~/composables/useWikiNav'

/**
 * 팀별 카테고리를 VSCode 탐색기처럼 보여 준다. 카테고리는 폴더, 문서는 파일.
 *
 * 트리를 중첩된 목록으로 그리지 않고 "지금 보이는 줄" 만 한 줄로 펴서 그린다.
 * 그래야 선택 줄이 들여쓰기와 상관없이 끝까지 칠해지고, 화살표 키로 위아래를 오가기 쉽다.
 * 들여쓰기 안내선은 줄마다 단계 수만큼 세로선을 겹쳐 그린다.
 */
interface Row {
  key: string
  kind: 'folder' | 'file' | 'empty' | 'input'
  depth: number
  parentKey: string | null
  label: string
  slug: string
  color?: string
  count?: number
  open?: boolean
}

const INDENT = 12 // 한 단계 들여쓰기(px)
const GUTTER = 4 // 맨 왼쪽 여백(px)
const STORAGE_KEY = 'prism.sidebar.open-folders'

const { tree, data } = useWikiNav()
const { createFolder, movePrompt, importMarkdown } = useExplorerActions()
const route = useRoute()
const router = useRouter()

// ---- 열린 폴더: 새로 고쳐도 그대로 두려고 브라우저에 적어 둔다 ----
// 저장소를 못 쓰는 환경(사생활 보호 창 등)에서는 조용히 기억만 못 할 뿐이다.
const openSlugs = useState<string[]>('explorer-open', () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((slug): slug is string => typeof slug === 'string') : []
  } catch {
    return []
  }
})

watch(openSlugs, (slugs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    // 기억하지 못해도 동작에는 지장이 없다
  }
})

const openSet = computed(() => new Set(openSlugs.value))

function setOpen(slug: string, open: boolean) {
  if (openSet.value.has(slug) === open) return
  openSlugs.value = open ? [...openSlugs.value, slug] : openSlugs.value.filter((other) => other !== slug)
}

function collapseAll() {
  openSlugs.value = []
}

// ---- 보이는 줄 ----
const rows = computed<Row[]>(() => {
  const list: Row[] = []

  const walk = (branches: CategoryBranch[], depth: number, parentKey: string | null) => {
    for (const branch of branches) {
      const { slug, name, color, total_count } = branch.category
      const key = `c:${slug}`
      const open = openSet.value.has(slug)
      list.push({ key, kind: 'folder', depth, parentKey, label: name, slug, color, count: total_count, open })
      if (!open) continue

      // 새 폴더 이름을 적는 줄은 그 폴더 안 맨 위에 둔다
      if (creatingIn.value === slug) {
        list.push({ key: `${key}:input`, kind: 'input', depth: depth + 1, parentKey: key, label: '', slug: '' })
      }

      // VSCode 처럼 폴더를 먼저, 그다음 파일
      walk(branch.children, depth + 1, key)
      for (const prompt of branch.prompts) {
        list.push({ key: `p:${prompt.slug}`, kind: 'file', depth: depth + 1, parentKey: key, label: prompt.title, slug: prompt.slug })
      }
      if (!branch.children.length && !branch.prompts.length && creatingIn.value !== slug) {
        list.push({ key: `${key}:empty`, kind: 'empty', depth: depth + 1, parentKey: key, label: '문서 없음', slug: '' })
      }
    }
  }

  walk(tree.value, 0, null)
  return list
})

// ---- 새 폴더 ----
// VSCode 처럼 트리 안에서 바로 이름을 적는다. Enter 로 만들고 Esc 로 그만둔다.
const creatingIn = ref<string | null>(null)
const newFolderName = ref('')
const creatingFolder = ref(false)
const newFolderInput = ref<HTMLInputElement | null>(null)

async function startNewFolder(parentSlug: string) {
  setOpen(parentSlug, true)
  creatingIn.value = parentSlug
  newFolderName.value = ''
  await nextTick()
  newFolderInput.value?.focus()
}

function cancelNewFolder() {
  creatingIn.value = null
  newFolderName.value = ''
}

async function submitNewFolder() {
  const parentSlug = creatingIn.value
  if (!parentSlug || creatingFolder.value) return
  if (!newFolderName.value.trim()) return cancelNewFolder()

  creatingFolder.value = true
  const created = await createFolder(parentSlug, newFolderName.value)
  creatingFolder.value = false
  cancelNewFolder()
  if (created) await focusRow(`c:${created.slug}`)
}

// ---- 지금 보고 있는 것 ----
const activeKey = computed(() => {
  const [, section, slug] = route.path.split('/')
  if (section === 'prompts' && slug && slug !== 'new') return `p:${decodeURIComponent(slug)}`
  if (route.path === '/prompts' && route.query.category) return `c:${String(route.query.category)}`
  return null
})

// 폴더 slug 와 그 위 폴더들. 문서를 열었을 때 어디 들어 있는지 펼쳐 보이려고 쓴다.
function folderChain(categoryId: number | undefined) {
  const categories = data.value?.categories ?? []
  const chain: string[] = []
  let cursor = categories.find((category) => category.id === categoryId)
  while (cursor) {
    chain.unshift(cursor.slug)
    const parentId = cursor.parent_id
    cursor = parentId == null ? undefined : categories.find((category) => category.id === parentId)
  }
  return chain
}

const treeEl = ref<HTMLElement | null>(null)

function rowElement(key: string) {
  return treeEl.value?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`) ?? null
}

// 다른 문서로 옮기면 그 문서가 든 폴더를 펼치고 보이는 곳까지 굴린다 (VSCode 의 "활성 파일 표시").
// 같은 문서를 보는 동안 사용자가 접은 폴더는 다시 펼치지 않는다.
let revealedFor: string | null = null

watch([activeKey, () => data.value], async ([key]) => {
  if (!key || key === revealedFor || !data.value) return
  revealedFor = key

  if (key.startsWith('p:')) {
    const prompt = data.value.prompts.find((candidate) => candidate.slug === key.slice(2))
    folderChain(prompt?.category.id).forEach((slug) => setOpen(slug, true))
  } else {
    // 팀 목록을 열었으면 그 폴더도 펼쳐 안에 든 문서가 보이게 한다.
    const category = data.value.categories.find((candidate) => candidate.slug === key.slice(2))
    folderChain(category?.id).forEach((slug) => setOpen(slug, true))
  }

  await nextTick()
  rowElement(key)?.scrollIntoView({ block: 'nearest' })
}, { immediate: true })

// ---- 키보드: VSCode 탐색기와 같은 손버릇 ----
// 트리 안에서는 한 줄만 Tab 으로 닿고(roving tabindex), 나머지는 화살표로 오간다.
const focusKey = ref<string | null>(null)
const focusable = computed(() => rows.value.filter((row) => row.kind === 'folder' || row.kind === 'file'))

const tabKey = computed(() => {
  const keys = focusable.value.map((row) => row.key)
  if (focusKey.value && keys.includes(focusKey.value)) return focusKey.value
  if (activeKey.value && keys.includes(activeKey.value)) return activeKey.value
  return keys[0] ?? null
})

async function focusRow(key: string | undefined) {
  if (!key) return
  focusKey.value = key
  await nextTick()
  rowElement(key)?.focus()
}

function onFocusIn(event: FocusEvent) {
  const key = (event.target as HTMLElement).closest<HTMLElement>('[data-key]')?.dataset.key
  if (key) focusKey.value = key
}

function openCategoryList(slug: string) {
  router.push({ path: '/prompts', query: { category: slug } })
}

function onKeydown(event: KeyboardEvent) {
  const list = focusable.value
  const index = list.findIndex((row) => row.key === focusKey.value)
  const row = list[index]
  if (!row) return

  switch (event.key) {
    case 'ArrowDown':
      focusRow(list[index + 1]?.key)
      break
    case 'ArrowUp':
      focusRow(list[index - 1]?.key)
      break
    case 'Home':
      focusRow(list[0]?.key)
      break
    case 'End':
      focusRow(list.at(-1)?.key)
      break
    case 'ArrowRight':
      if (row.kind !== 'folder') return
      if (!row.open) setOpen(row.slug, true)
      else if (list[index + 1]?.parentKey === row.key) focusRow(list[index + 1]!.key)
      break
    case 'ArrowLeft':
      if (row.kind === 'folder' && row.open) setOpen(row.slug, false)
      else if (row.parentKey) focusRow(row.parentKey)
      break
    case ' ':
      if (row.kind === 'folder') setOpen(row.slug, !row.open)
      else router.push(`/prompts/${encodeURIComponent(row.slug)}`)
      break
    case 'Enter':
      // 파일은 링크라 Enter 가 알아서 연다. 폴더는 그 팀 문서 목록을 연다.
      if (row.kind !== 'folder') return
      openCategoryList(row.slug)
      break
    default:
      return
  }
  event.preventDefault()
}

// ---- 파일 넣기 (.md · .sh) ----
const fileInput = ref<HTMLInputElement | null>(null)
const dropTarget = ref<{ slug: string, name: string } | null>(null)

function pickFiles(row: Row) {
  dropTarget.value = { slug: row.slug, name: row.label }
  fileInput.value?.click()
}

async function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = '' // 같은 파일을 다시 골라도 change 가 일어나게 비워 둔다
  const target = dropTarget.value
  if (!files.length || !target) return

  setOpen(target.slug, true)
  await importMarkdown(files, target.slug, target.name)
}

// ---- 끌어다 놓기 ----
// 트리 안의 문서를 끌면 폴더 옮기기, 바탕화면의 .md·.sh 를 끌어오면 그 폴더에 넣기.
const PROMPT_TYPE = 'text/prism-prompt'
const dragOverKey = ref<string | null>(null)
let expandTimer: ReturnType<typeof setTimeout> | undefined

function importableFilesIn(transfer: DataTransfer | null) {
  return [...(transfer?.files ?? [])].filter((file) => /\.(md|markdown|txt|sh)$/i.test(file.name))
}

function onDragStart(event: DragEvent, row: Row) {
  event.dataTransfer?.setData(PROMPT_TYPE, row.slug)
  event.dataTransfer?.setData('text/plain', row.label)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event: DragEvent, row: Row) {
  const types = event.dataTransfer?.types ?? []
  const movingPrompt = types.includes(PROMPT_TYPE)
  if (!movingPrompt && !types.includes('Files')) return

  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = movingPrompt ? 'move' : 'copy'
  if (dragOverKey.value === row.key) return

  // 폴더 위에 잠깐 물고 있으면 펼쳐 준다. 안쪽 폴더에도 놓을 수 있게.
  dragOverKey.value = row.key
  clearTimeout(expandTimer)
  if (!row.open) expandTimer = setTimeout(() => setOpen(row.slug, true), 700)
}

function onDragLeave(row: Row) {
  if (dragOverKey.value !== row.key) return
  dragOverKey.value = null
  clearTimeout(expandTimer)
}

async function onDrop(event: DragEvent, row: Row) {
  event.preventDefault()
  clearTimeout(expandTimer)
  dragOverKey.value = null

  const slug = event.dataTransfer?.getData(PROMPT_TYPE)
  const files = importableFilesIn(event.dataTransfer)

  if (slug) {
    // 원래 있던 폴더에 도로 놓은 것이면 아무 일도 하지 않는다
    const current = data.value?.prompts.find((prompt) => prompt.slug === slug)
    if (current?.category.slug === row.slug) return
    await movePrompt(slug, row.slug, row.label)
  }
  else if (files.length) {
    setOpen(row.slug, true)
    await importMarkdown(files, row.slug, row.label)
  }
}

// 트리 밖에 떨어뜨린 파일을 브라우저가 열어 버리면 보던 화면이 날아간다. 그것만 막는다.
function swallowDrop(event: DragEvent) {
  if ((event.target as HTMLElement | null)?.closest('[data-drop-zone]')) return
  event.preventDefault()
}

onMounted(() => {
  window.addEventListener('dragover', swallowDrop)
  window.addEventListener('drop', swallowDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragover', swallowDrop)
  window.removeEventListener('drop', swallowDrop)
  clearTimeout(expandTimer)
})

// ---- 도구 버튼 ----
const sections = useState('sidebar-sections', () => ({ domains: true, categories: true }))

// "새 문서" 는 지금 보고 있는 폴더에 만든다. 문서를 보고 있으면 그 문서가 든 폴더에.
const newDocumentTarget = computed(() => {
  const key = activeKey.value
  if (key?.startsWith('c:')) return key.slice(2)
  if (key?.startsWith('p:')) return data.value?.prompts.find((prompt) => prompt.slug === key.slice(2))?.category.slug
  return undefined
})

function indent(depth: number) {
  return `${GUTTER + depth * INDENT}px`
}

// 안내선은 윗단계 폴더의 화살표 한가운데를 지난다.
function guideLeft(level: number) {
  return `${GUTTER + level * INDENT + 8}px`
}
</script>

<template>
  <div class="group/pane">
    <SidebarSectionHeader
      label="카테고리"
      :open="sections.categories"
      @toggle="sections = { ...sections, categories: !sections.categories }"
    >
      <NuxtLink
        :to="{ path: '/prompts/new', query: newDocumentTarget ? { category: newDocumentTarget } : {} }"
        class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        :title="newDocumentTarget ? '이 폴더에 새 문서' : '새 문서'"
        :aria-label="newDocumentTarget ? '이 폴더에 새 문서' : '새 문서'"
      >
        <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
          <path d="M9.5 1.75H4a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h4.5M9.5 1.75 13 5.25M9.5 1.75v3.5H13m0 0v2.5" stroke-linejoin="round" />
          <path d="M12.25 10v4.5M10 12.25h4.5" stroke-linecap="round" />
        </svg>
      </NuxtLink>
      <button
        type="button"
        class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        title="모두 접기"
        aria-label="폴더 모두 접기"
        @click="collapseAll"
      >
        <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
          <rect x="4.5" y="4.5" width="9" height="9" rx="1" />
          <path d="M2.5 11V3.5a1 1 0 0 1 1-1H11M7 9h4" stroke-linecap="round" />
        </svg>
      </button>
    </SidebarSectionHeader>

    <ul
      v-show="sections.categories"
      ref="treeEl"
      role="tree"
      aria-label="카테고리"
      class="select-none"
      @keydown="onKeydown"
      @focusin="onFocusIn"
    >
      <li v-for="row in rows" :key="row.key" role="none" class="relative">
        <!-- 들여쓰기 안내선 -->
        <span
          v-for="level in row.depth"
          :key="level"
          class="pointer-events-none absolute inset-y-0 w-px bg-slate-200 dark:bg-slate-800"
          :style="{ left: guideLeft(level - 1) }"
          aria-hidden="true"
        />

        <!-- 폴더: 누르면 펼치고 접는다. 오른쪽 목록 아이콘으로 그 팀 문서 목록을 연다. -->
        <div
          v-if="row.kind === 'folder'"
          role="treeitem"
          :data-key="row.key"
          :aria-level="row.depth + 1"
          :aria-expanded="row.open"
          :aria-selected="activeKey === row.key"
          :tabindex="tabKey === row.key ? 0 : -1"
          data-drop-zone
          class="group/row flex h-8 cursor-pointer items-center gap-1 rounded-md pr-1.5 text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-indigo-500 lg:h-[26px]"
          :class="[
            activeKey === row.key
              ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
            dragOverKey === row.key ? 'ring-1 ring-inset ring-indigo-400 bg-indigo-50/70 dark:bg-indigo-500/10' : '',
          ]"
          :style="{ paddingLeft: indent(row.depth) }"
          :title="row.label"
          @click="setOpen(row.slug, !row.open)"
          @dragover="onDragOver($event, row)"
          @dragleave="onDragLeave(row)"
          @drop="onDrop($event, row)"
        >
          <svg class="size-4 shrink-0 text-slate-400 transition-transform duration-100" :class="{ 'rotate-90': row.open }" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6 4.5 10 8l-4 3.5Z" />
          </svg>
          <svg v-if="row.open" class="size-4 shrink-0" :class="categoryIconColor(row.color)" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 4A1.5 1.5 0 0 1 3 2.5h3.1l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5.5v1H5a1.5 1.5 0 0 0-1.4 1L1.5 12.8Z" fill="currentColor" fill-opacity=".5" />
            <path d="M3.9 7.4a1 1 0 0 1 .95-.7h10.3a.7.7 0 0 1 .66.93l-1.6 4.8a1.5 1.5 0 0 1-1.42 1.02H2.1a.6.6 0 0 1-.57-.79Z" fill="currentColor" />
          </svg>
          <svg v-else class="size-4 shrink-0" :class="categoryIconColor(row.color)" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 4A1.5 1.5 0 0 1 3 2.5h3.1l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5.5v6A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5Z" fill="currentColor" />
          </svg>
          <span class="min-w-0 flex-1 truncate">{{ row.label }}</span>

          <!-- 넓은 화면에서는 마우스를 올린 줄에만 도구가 나오고, 그 자리에 있던 문서 수는 잠깐 숨는다 -->
          <span class="shrink-0 text-[11px] tabular-nums text-slate-400 lg:group-hover/row:hidden lg:group-focus-within/row:hidden">
            {{ row.count }}
          </span>
          <span class="hidden shrink-0 items-center gap-0.5 lg:group-hover/row:flex lg:group-focus-within/row:flex">
            <button
              type="button"
              tabindex="-1"
              class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              :title="`${row.label} 안에 새 문서`"
              :aria-label="`${row.label} 안에 새 문서 쓰기`"
              @click.stop="router.push({ path: '/prompts/new', query: { category: row.slug } })"
            >
              <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
                <path d="M9.5 1.75H4a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h4.5M9.5 1.75 13 5.25M9.5 1.75v3.5H13m0 0v2.5" stroke-linejoin="round" />
                <path d="M12.25 10v4.5M10 12.25h4.5" stroke-linecap="round" />
              </svg>
            </button>
            <button
              type="button"
              tabindex="-1"
              class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              :title="`${row.label} 에 파일 넣기 (.md · .sh)`"
              :aria-label="`${row.label} 에 파일 넣기`"
              @click.stop="pickFiles(row)"
            >
              <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
                <path d="M8 10.5V2.5m0 0L5 5.5M8 2.5l3 3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              tabindex="-1"
              class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              :disabled="row.depth >= 2"
              :title="row.depth >= 2 ? '3단계까지만 만들 수 있습니다' : `${row.label} 안에 새 폴더`"
              :aria-label="`${row.label} 안에 새 폴더 만들기`"
              @click.stop="startNewFolder(row.slug)"
            >
              <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">
                <path d="M1.75 12.25V3.75a1 1 0 0 1 1-1h3l1.5 1.5h5a1 1 0 0 1 1 1v1.5M1.75 12.25a1 1 0 0 0 1 1h5.5" stroke-linejoin="round" />
                <path d="M12.25 9v4.5M10 11.25h4.5" stroke-linecap="round" />
              </svg>
            </button>
            <NuxtLink
              :to="{ path: '/prompts', query: { category: row.slug } }"
              tabindex="-1"
              class="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              :title="`${row.label} 문서 목록`"
              :aria-label="`${row.label} 문서 목록 보기`"
              @click.stop
            >
              <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
                <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" stroke-linecap="round" />
              </svg>
            </NuxtLink>
          </span>

          <!-- 마우스가 없는 화면에서는 목록 버튼만 늘 보인다 -->
          <NuxtLink
            :to="{ path: '/prompts', query: { category: row.slug } }"
            tabindex="-1"
            class="shrink-0 rounded p-0.5 text-slate-400 lg:hidden"
            :aria-label="`${row.label} 문서 목록 보기`"
            @click.stop
          >
            <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
              <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" stroke-linecap="round" />
            </svg>
          </NuxtLink>
        </div>

        <!-- 파일: 링크 그대로라 새 탭으로 열기(⌘·Ctrl+클릭)도 된다 -->
        <NuxtLink
          v-else-if="row.kind === 'file'"
          role="treeitem"
          :to="`/prompts/${encodeURIComponent(row.slug)}`"
          :data-key="row.key"
          :aria-level="row.depth + 1"
          :aria-selected="activeKey === row.key"
          :tabindex="tabKey === row.key ? 0 : -1"
          class="flex h-8 items-center gap-1 rounded-md pr-1.5 text-[13px] outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-indigo-500 lg:h-[26px]"
          :class="activeKey === row.key
            ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'"
          :style="{ paddingLeft: indent(row.depth) }"
          :title="row.label"
          draggable="true"
          @dragstart="onDragStart($event, row)"
        >
          <!-- 파일도 화살표 자리를 비워 두어 옆 폴더와 아이콘 줄을 맞춘다 -->
          <span class="size-4 shrink-0" aria-hidden="true" />
          <svg class="size-4 shrink-0" :class="activeKey === row.key ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
            <path d="M9.25 1.75H4.25a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1v-8Z" stroke-linejoin="round" />
            <path d="M9.25 1.75v3.5h3.5M5.5 8.25h5M5.5 10.75h3.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="min-w-0 flex-1 truncate">{{ row.label }}</span>
        </NuxtLink>

        <!-- 새 폴더 이름 적는 줄 -->
        <div
          v-else-if="row.kind === 'input'"
          class="flex h-8 items-center gap-1 lg:h-[26px]"
          :style="{ paddingLeft: indent(row.depth) }"
        >
          <span class="size-4 shrink-0" aria-hidden="true" />
          <svg class="size-4 shrink-0 text-slate-400" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1.5 4A1.5 1.5 0 0 1 3 2.5h3.1l1.5 1.5H13A1.5 1.5 0 0 1 14.5 5.5v6A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5Z" fill="currentColor" />
          </svg>
          <input
            ref="newFolderInput"
            v-model="newFolderName"
            :disabled="creatingFolder"
            maxlength="40"
            placeholder="폴더 이름"
            aria-label="새 폴더 이름"
            class="min-w-0 flex-1 rounded border border-indigo-400 bg-white px-1.5 py-0.5 text-[13px] outline-none disabled:opacity-60 dark:bg-slate-950"
            @keydown.enter.prevent="submitNewFolder"
            @keydown.esc.prevent="cancelNewFolder"
            @keydown.stop
            @blur="submitNewFolder"
          >
        </div>

        <!-- 빈 폴더 -->
        <div
          v-else
          class="flex h-8 items-center gap-1 text-[12px] italic text-slate-400 lg:h-[26px] dark:text-slate-500"
          :style="{ paddingLeft: indent(row.depth) }"
        >
          <span class="size-4 shrink-0" aria-hidden="true" />
          {{ row.label }}
        </div>
      </li>
    </ul>

    <input
      ref="fileInput"
      type="file"
      multiple
      accept=".md,.markdown,.txt,.sh,text/markdown,text/plain,application/x-sh,text/x-shellscript"
      class="hidden"
      data-testid="folder-import"
      @change="onFilesChosen"
    >
  </div>
</template>
