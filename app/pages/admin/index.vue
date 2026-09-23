<script setup lang="ts">
import type { PromptCard, WikiUser } from '~/types'

interface AdminLog {
  id: number
  label: string
  actor_name: string
  target_label: string | null
  created_at: string
}

interface Dashboard {
  members: { total: number; active: number; admins: number; never_signed_in: number; signed_in_this_week: number }
  content: {
    published: number
    draft: number
    archived: number
    categories: number
    tags: number
    orphan_tags: number
    edits: number
    copies: number
  }
  sessions: { live: number; devices: number }
  top_contributors: Array<{ user: WikiUser; edits: number }>
  stale_prompts: PromptCard[]
  recent_activity: AdminLog[]
}

const { request } = useApi()

useHead({ title: '백오피스 · 현황' })

const { data } = await useAsyncData('admin-dashboard', () => request<Dashboard>('/admin/dashboard'), {
  getCachedData: () => undefined,
})
</script>

<template>
  <div v-if="data" class="space-y-8">
    <section>
      <h2 class="text-sm font-semibold">구성원</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="전체" :value="data.members.total" />
        <StatTile label="사용 중" :value="data.members.active" :hint="`관리자 ${data.members.admins}명`" />
        <StatTile label="이번 주 접속" :value="data.members.signed_in_this_week" />
        <StatTile
          label="한 번도 로그인 안 함"
          :value="data.members.never_signed_in"
          tone="warn"
          hint="계정을 전달했는지 확인해 보세요"
        />
      </div>
    </section>

    <section>
      <h2 class="text-sm font-semibold">문서</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="공개" :value="data.content.published" />
        <StatTile label="초안" :value="data.content.draft" />
        <StatTile label="보관됨" :value="data.content.archived" />
        <StatTile label="총 복사 횟수" :value="data.content.copies" :hint="`수정 ${data.content.edits}회`" />
      </div>
    </section>

    <section>
      <h2 class="text-sm font-semibold">분류와 접속</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="카테고리" :value="data.content.categories" />
        <StatTile label="태그" :value="data.content.tags" />
        <StatTile
          label="아무도 안 쓰는 태그"
          :value="data.content.orphan_tags"
          tone="warn"
          hint="태그 화면에서 정리할 수 있습니다"
        />
        <StatTile label="로그인 중인 세션" :value="data.sessions.live" :hint="`${data.sessions.devices}명`" />
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-2">
      <section>
        <h2 class="text-sm font-semibold">많이 고친 사람</h2>
        <p class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          위키를 굴리는 건 새로 쓰는 쪽보다 고치는 쪽입니다.
        </p>
        <div v-if="data.top_contributors.length" class="mt-3 space-y-1.5">
          <div
            v-for="row in data.top_contributors"
            :key="row.user.id"
            class="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
          >
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {{ row.user.initials }}
            </span>
            <span class="min-w-0">
              <span class="block truncate text-[13px] font-medium">{{ row.user.name }}</span>
              <span class="block truncate text-[11px] text-slate-400">{{ [row.user.department, row.user.job_rank].filter(Boolean).join(' · ') || row.user.email }}</span>
            </span>
            <span class="ml-auto shrink-0 text-[13px] tabular-nums text-slate-500 dark:text-slate-400">
              {{ row.edits }}회
            </span>
          </div>
        </div>
        <p v-else class="mt-3 text-[13px] text-slate-400">아직 수정 기록이 없습니다.</p>
      </section>

      <section>
        <h2 class="text-sm font-semibold">오래 손대지 않은 문서</h2>
        <p class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          3개월 넘게 그대로입니다. 아직 쓸 만한지 확인해 주세요.
        </p>
        <div v-if="data.stale_prompts.length" class="mt-3 space-y-1.5">
          <NuxtLink
            v-for="prompt in data.stale_prompts"
            :key="prompt.id"
            :to="`/prompts/${encodeURIComponent(prompt.slug)}`"
            class="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2 hover:border-indigo-300 dark:border-slate-800 dark:hover:border-indigo-600/60"
          >
            <span class="min-w-0">
              <span class="block truncate text-[13px] font-medium">{{ prompt.title }}</span>
              <span class="block truncate text-[11px] text-slate-400">
                {{ prompt.category.name }} · {{ prompt.author?.name }}
              </span>
            </span>
            <span class="ml-auto shrink-0 text-[11px] text-slate-400">{{ fromNow(prompt.updated_at) }}</span>
          </NuxtLink>
        </div>
        <p v-else class="mt-3 text-[13px] text-slate-400">전부 최근에 손봤습니다.</p>
      </section>
    </div>

    <section>
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-semibold">최근 관리 활동</h2>
        <NuxtLink to="/admin/logs" class="text-xs text-indigo-600 hover:underline dark:text-indigo-400">전체 보기</NuxtLink>
      </div>
      <ol v-if="data.recent_activity.length" class="mt-3 space-y-1">
        <li
          v-for="log in data.recent_activity"
          :key="log.id"
          class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-[13px] odd:bg-slate-50 dark:odd:bg-slate-900/60"
        >
          <span class="font-medium">{{ log.label }}</span>
          <span v-if="log.target_label" class="text-slate-500 dark:text-slate-400">{{ log.target_label }}</span>
          <span class="ml-auto text-[11px] text-slate-400">{{ log.actor_name }} · {{ fromNow(log.created_at) }}</span>
        </li>
      </ol>
      <p v-else class="mt-3 text-[13px] text-slate-400">아직 기록이 없습니다.</p>
    </section>
  </div>
</template>
