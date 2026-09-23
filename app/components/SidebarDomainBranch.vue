<script setup lang="ts">
import type { DomainRow, TreeBranch } from '~/types'

// 도메인 한 가지. 문서 목록은 달지 않는다. 한 문서가 여러 도메인에 걸쳐 같은 제목이 여러 번 나오면 어지럽다.
const props = defineProps<{ branch: TreeBranch<DomainRow> }>()

const route = useRoute()
// 도메인은 하위를 접어 두고 시작한다. 7개 남짓한 맨 위만 보여도 충분하다.
const opened = useState<Record<string, boolean>>('sidebar-domains-open', () => ({}))

const slug = computed(() => props.branch.node.slug)
const active = computed(() => route.query.domain === slug.value)

// 지금 고른 도메인이 이 가지 안쪽에 있으면 저절로 펼쳐 둔다. 어디를 보고 있는지 놓치지 않게.
const holdsActive = computed(() => {
  const target = String(route.query.domain ?? '')
  const search = (branch: TreeBranch<DomainRow>): boolean =>
    branch.children.some((child) => child.node.slug === target || search(child))
  return Boolean(target) && search(props.branch)
})

const isOpen = computed(() => opened.value[slug.value] ?? holdsActive.value)

function toggle() {
  opened.value = { ...opened.value, [slug.value]: !isOpen.value }
}
</script>

<template>
  <div class="mb-0.5">
    <div
      class="flex items-center rounded-lg"
      :class="active ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'"
    >
      <button
        v-if="branch.children.length"
        type="button"
        class="shrink-0 rounded p-1 pl-1.5 text-slate-400"
        :aria-label="isOpen ? `${branch.node.name} 접기` : `${branch.node.name} 펼치기`"
        :aria-expanded="isOpen"
        @click="toggle"
      >
        <svg class="size-3 transition-transform" :class="{ 'rotate-90': isOpen }" viewBox="0 0 12 12" fill="currentColor">
          <path d="M4 2.5 8 6l-4 3.5Z" />
        </svg>
      </button>
      <!-- 펼칠 게 없는 줄도 이름 시작점을 맞춘다 -->
      <span v-else class="w-[1.375rem] shrink-0" aria-hidden="true" />

      <NuxtLink
        :to="{ path: '/prompts', query: { domain: branch.node.slug } }"
        class="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2.5 text-[13px]"
        :class="active
          ? 'font-medium text-slate-900 dark:text-slate-100'
          : 'text-slate-600 dark:text-slate-300'"
      >
        <span class="truncate">{{ branch.node.name }}</span>
        <span class="ml-auto shrink-0 text-[11px] tabular-nums text-slate-400">{{ branch.node.total_count }}</span>
      </NuxtLink>
    </div>

    <ul v-if="branch.children.length" v-show="isOpen" class="ml-[1.1rem] border-l border-slate-200 pl-1 dark:border-slate-800">
      <li v-for="child in branch.children" :key="child.node.slug">
        <SidebarDomainBranch :branch="child" />
      </li>
    </ul>
  </div>
</template>
