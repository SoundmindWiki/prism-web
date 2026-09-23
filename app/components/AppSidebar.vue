<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { user, isAdmin, signOut } = useAuth()
const { theme, toggle } = useTheme()
const { domainTree, topTags, data } = useWikiNav()
const route = useRoute()
const router = useRouter()

const query = ref(String(route.query.q ?? ''))
// 도메인·카테고리 묶음 자체를 접어 둘 수 있다. 화면을 옮겨도 그대로 유지한다.
const sections = useState('sidebar-sections', () => ({ domains: true, categories: true }))

const drawer = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

// 서랍으로 접히는 폭인지. 데스크톱에서는 사이드바가 늘 떠 있어서 가둘 것도 없다.
const narrow = ref(false)
const trapped = computed(() => narrow.value && props.open)

onMounted(() => {
  const mq = window.matchMedia('(max-width: 1023.98px)')
  const sync = () => (narrow.value = mq.matches)
  sync()
  mq.addEventListener('change', sync)
  onBeforeUnmount(() => mq.removeEventListener('change', sync))
})

// 서랍이 열려 있는 동안 탭이 밖으로 새지 않게 묶고, Esc 로 닫는다.
// 열리면 바로 검색부터 칠 수 있게 커서를 검색창에 둔다.
useFocusTrap(drawer, trapped, () => emit('close'), () => searchInput.value)

watch(() => route.query.q, (value) => {
  query.value = String(value ?? '')
})

// 화면을 옮기면 모바일 서랍은 닫는다.
watch(() => route.fullPath, () => emit('close'))

// 타이핑을 따라가며 목록을 갱신한다. 글자마다 부르면 서버도 주소 기록도 시끄러워서 한 박자 쉰다.
let searchTimer: ReturnType<typeof setTimeout> | undefined

function go(next: string) {
  const to = { path: '/prompts', query: next ? { q: next } : {} }
  // 목록 밖에서 들어올 때만 기록을 남긴다. 검색어를 다듬는 동안에는
  // 기록이 쌓이면 뒤로 가기를 몇 번씩 눌러야 원래 보던 화면으로 돌아간다.
  if (route.path === '/prompts') router.replace(to)
  else router.push(to)
}

watch(query, (value) => {
  clearTimeout(searchTimer)
  const next = value.trim()
  if (next === String(route.query.q ?? '')) return
  searchTimer = setTimeout(() => go(next), 250)
})

onScopeDispose(() => clearTimeout(searchTimer))

// 엔터는 기다리지 않고 바로 보낸다.
function search() {
  clearTimeout(searchTimer)
  go(query.value.trim())
}

function toggleSection(key: 'domains') {
  sections.value = { ...sections.value, [key]: !sections.value[key] }
}
</script>

<template>
  <!-- 모바일에서 서랍을 열었을 때 뒤를 덮는 막 -->
  <div
    v-if="open"
    class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
    @click="emit('close')"
  />

  <!-- 서랍이 닫혀 있는 동안에는 화면 밖에 있어도 탭으로 닿는다. inert 로 통째로 빼 둔다. -->
  <aside
    ref="drawer"
    class="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900"
    :class="open ? 'translate-x-0' : '-translate-x-full'"
    :inert="narrow && !open"
  >
    <div class="flex items-center gap-2.5 px-4 py-4">
      <NuxtLink to="/" class="min-w-0">
        <AppWordmark />
      </NuxtLink>

      <button
        type="button"
        class="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
        aria-label="사이드바 닫기"
        @click="emit('close')"
      >
        <svg class="size-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="m5 5 10 10M15 5 5 15" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <form class="px-3 pb-3" @submit.prevent="search">
      <label class="relative block">
        <span class="sr-only">프롬프트 검색</span>
        <svg class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="9" r="6" />
          <path d="m14 14 4 4" stroke-linecap="round" />
        </svg>
        <input
          id="sidebar-search"
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="검색"
          aria-keyshortcuts="/"
          class="w-full rounded-xl bg-slate-100 py-2 pl-8 pr-2.5 text-[13px] transition-colors placeholder:text-slate-400 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
        >
      </label>
    </form>

    <nav class="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      <NuxtLink
        to="/"
        class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
        :class="route.path === '/'
          ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
      >
        <svg class="size-4 shrink-0 opacity-70" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M3 8.5 10 3l7 5.5V16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" stroke-linejoin="round" />
        </svg>
        홈
      </NuxtLink>

      <NuxtLink
        to="/prompts"
        class="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
        :class="route.path === '/prompts' && !route.query.category && !route.query.domain
          ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
      >
        <svg class="size-4 shrink-0 opacity-70" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M4 5h12M4 10h12M4 15h8" stroke-linecap="round" />
        </svg>
        전체 문서
        <span class="ml-auto text-[11px] tabular-nums text-slate-400">{{ data?.total ?? '' }}</span>
      </NuxtLink>

      <NuxtLink
        v-if="isAdmin"
        to="/admin"
        class="mt-0.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium"
        :class="route.path.startsWith('/admin')
          ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
      >
        <svg class="size-4 shrink-0 opacity-70" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M10 2.5 3.5 5.5v4c0 3.6 2.7 6.9 6.5 8 3.8-1.1 6.5-4.4 6.5-8v-4Z" stroke-linejoin="round" />
        </svg>
        백오피스
      </NuxtLink>

      <div v-if="domainTree.length" class="group/pane">
        <SidebarSectionHeader label="도메인" :open="sections.domains" @toggle="toggleSection('domains')" />
        <div v-show="sections.domains">
          <SidebarDomainBranch v-for="branch in domainTree" :key="branch.node.slug" :branch="branch" />
        </div>
      </div>

      <SidebarExplorer />

      <template v-if="topTags.length">
        <p class="mt-5 px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          태그
        </p>
        <div class="flex flex-wrap gap-1 px-2.5">
          <TagChip v-for="tag in topTags" :key="tag.id" :tag="tag" :active="route.query.tag === tag.slug" />
        </div>
      </template>
    </nav>

    <div class="border-t border-slate-200 p-3 dark:border-slate-800">
      <NuxtLink
        to="/prompts/new"
        class="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-[13px] font-bold text-white transition-all duration-100 hover:bg-indigo-700 active:scale-[0.97]"
      >
        <svg class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M10 4.5v11M4.5 10h11" stroke-linecap="round" />
        </svg>
        새 문서
      </NuxtLink>

      <div class="mt-2.5 flex items-center gap-2">
        <NuxtLink
          v-if="user"
          to="/me"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 transition-colors"
          :class="route.path === '/me'
            ? 'bg-indigo-50 dark:bg-indigo-500/10'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800'"
          title="마이페이지"
        >
          <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {{ user.initials }}
          </span>
          <span class="min-w-0">
            <span class="flex items-center gap-1">
              <span class="truncate text-[12px] font-medium leading-tight">{{ user.name }}</span>
              <span
                v-if="isAdmin"
                class="shrink-0 rounded bg-indigo-100 px-1 py-px text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
              >관리자</span>
            </span>
            <span class="block truncate text-[11px] leading-tight text-slate-400">{{ [user.department, user.job_rank].filter(Boolean).join(' · ') || user.email }}</span>
          </span>
        </NuxtLink>
        <div v-else class="flex-1" />

        <button
          type="button"
          class="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="로그아웃"
          title="로그아웃"
          @click="signOut"
        >
          <svg class="size-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M12.5 6.5V4.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2M9 10h8m0 0-2.5-2.5M17 10l-2.5 2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <button
          type="button"
          class="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          :aria-label="theme === 'dark' ? '밝은 테마로 전환' : '어두운 테마로 전환'"
          @click="toggle"
        >
          <svg v-if="theme === 'dark'" class="size-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4M15.9 15.9l-1.4-1.4M5.5 5.5 4.1 4.1" stroke-linecap="round" />
          </svg>
          <svg v-else class="size-4.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M17 12.5A7.5 7.5 0 0 1 7.5 3a7.5 7.5 0 1 0 9.5 9.5Z" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </aside>
</template>
