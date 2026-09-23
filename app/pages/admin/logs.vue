<script setup lang="ts">
import type { ListMeta, WikiUser } from '~/types'

interface AdminLog {
  id: number
  action: string
  label: string
  group: 'auth' | 'content' | 'usage' | 'account' | 'admin' | null
  user_id: number | null
  actor_name: string
  target_type: string | null
  target_label: string | null
  slug: string | null
  details: Record<string, unknown>
  created_at: string
}

interface MemberActivity {
  user: WikiUser
  last_activity_at: string | null
  last_signed_in_at: string | null
  counts: { signed_in: number; failed: number; created: number; updated: number; copied: number; downloaded: number }
}

interface ActivitySummary {
  since: string
  totals: {
    members: number
    active_members: number
    signed_in: number
    failed: number
    created: number
    updated: number
    copied: number
  }
  members: MemberActivity[]
}

type Option = { value: string; label: string }

const { request } = useApi()

useHead({ title: '백오피스 · 활동 기록' })

const PERIODS: Option[] = [
  { value: '1', label: '최근 24시간' },
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
]

const period = ref('7')
const groupFilter = ref('')
const actionFilter = ref('')
const userFilter = ref('')
const page = ref(1)

// ---- 구성원별 현황 ----
const { data: summary } = await useAsyncData(
  'admin-activity-summary',
  () => request<ActivitySummary>('/admin/audit_logs/summary', { params: { days: period.value } }),
  { watch: [period], getCachedData: () => undefined },
)

// ---- 활동 기록 ----
const { data, pending } = await useAsyncData(
  'admin-logs',
  () =>
    request<{ logs: AdminLog[]; groups: Option[]; actions: Option[]; meta: ListMeta }>('/admin/audit_logs', {
      params: {
        days: period.value,
        group: groupFilter.value || undefined,
        action_type: actionFilter.value || undefined,
        user_id: userFilter.value || undefined,
        page: page.value,
        per_page: 30,
      },
    }),
  { watch: [page, period, groupFilter, actionFilter, userFilter], getCachedData: () => undefined },
)

// 조건이 바뀌면 첫 쪽부터 다시 본다. 갈래를 바꾸면 그 안의 종류 선택은 비운다.
watch([period, actionFilter, userFilter], () => { page.value = 1 })
watch(groupFilter, () => {
  actionFilter.value = ''
  page.value = 1
})

const selectedMember = computed(() =>
  summary.value?.members.find((member) => String(member.user.id) === userFilter.value)?.user ?? null,
)

function focusMember(member: MemberActivity) {
  userFilter.value = userFilter.value === String(member.user.id) ? '' : String(member.user.id)
  // 표를 누르면 아래 기록으로 내려가 바로 보이게 한다
  nextTick(() => document.getElementById('activity-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// ---- 보여 주는 방식 ----
const GROUP_STYLES: Record<string, string> = {
  auth: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  content: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  usage: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  account: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  admin: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
}

const groupLabel = (group: string | null) => data.value?.groups.find((item) => item.value === group)?.label ?? '기타'

const FAILURE_REASONS: Record<string, string> = {
  wrong_password: '비밀번호 틀림',
  unknown_email: '없는 이메일',
  deactivated: '중지된 계정',
}

const FIELD_NAMES: Record<string, string> = {
  name: '이름',
  department: '소속',
  job_rank: '직급',
  job_title: '직함',
}

/** 기록에 딸린 세부 내용을 사람이 읽을 한 줄로 바꾼다. 모르는 항목은 그대로 보여 준다. */
function describeDetails(log: AdminLog): string {
  const d = log.details
  const parts: string[] = []
  const known = new Set<string>()
  const take = (key: string) => {
    known.add(key)
    return d[key]
  }

  if (d.reason) parts.push(FAILURE_REASONS[String(take('reason'))] ?? String(d.reason))
  // 누군지 아는 사람이면 "한 사람" 칸에 이미 이름이 있다. 이메일은 모르는 주소로 두드렸을 때만 보여 준다.
  if (d.email && log.action === 'session.failed') {
    const email = String(take('email'))
    if (!log.user_id) parts.push(email)
  }
  if (d.device) parts.push(String(take('device')))
  if (d.ip) parts.push(String(take('ip')))
  if (d.from_version) parts.push(`v${take('from_version')} → v${take('version')}`)
  else if (d.version) parts.push(`v${take('version')}`)
  if (d.note) parts.push(`"${take('note')}"`)
  if (d.category && log.action === 'prompt.created') parts.push(String(take('category')))
  if (Array.isArray(d.changed)) {
    const fields = (take('changed') as string[]).map((field) => FIELD_NAMES[field] ?? field)
    parts.push(`${fields.join('·')} 변경`)
  }
  if (d.signed_out_devices !== undefined) parts.push(`다른 기기 ${take('signed_out_devices')}대 로그아웃`)
  if (d.count !== undefined) parts.push(`기기 ${take('count')}대`)
  if (d.from !== undefined && d.to !== undefined) parts.push(`${take('from')} → ${take('to')}`)
  if (d.parent) parts.push(`${take('parent')} 안에`)
  if (Array.isArray(d.moved)) parts.push((take('moved') as string[]).join(' → '))
  if (d.detached !== undefined) parts.push(`문서 ${take('detached')}개에서 빠짐`)
  if (Array.isArray(d.order)) parts.push((take('order') as string[]).join(' → '))

  // 위에서 다루지 않은 항목은 원래 모양 그대로 덧붙인다
  for (const [key, value] of Object.entries(d)) {
    if (known.has(key) || value === null || value === '') continue
    parts.push(`${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
  }

  return parts.join(' · ')
}

// 현황 표에서 숫자로 보여 줄 칸. 템플릿 안에 타입 단언을 두지 않으려고 여기 둔다.
const COUNT_KEYS = ['signed_in', 'created', 'updated', 'copied', 'downloaded'] as const

const MEMBER_COLUMNS = [
  { key: 'name', label: '구성원' },
  { key: 'last', label: '마지막 활동' },
  { key: 'signed_in', label: '로그인', align: 'right' as const },
  { key: 'created', label: '작성', align: 'right' as const },
  { key: 'updated', label: '수정', align: 'right' as const },
  { key: 'copied', label: '복사', align: 'right' as const },
  { key: 'downloaded', label: '내려받기', align: 'right' as const },
]

const LOG_COLUMNS = [
  { key: 'action', label: '한 일' },
  { key: 'actor', label: '한 사람' },
  { key: 'target', label: '대상' },
  { key: 'details', label: '내용' },
  { key: 'time', label: '시각' },
]
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-[13px] text-slate-500 dark:text-slate-400">
        로그인부터 문서 작성·복사까지 구성원이 한 일이 전부 남습니다. 문서 내용이 어떻게 바뀌었는지는 각 문서의 히스토리에 있습니다.
      </p>
      <select
        v-model="period"
        aria-label="기간"
        class="ml-auto rounded-xl bg-slate-100 px-3 py-2 text-[13px] transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
      >
        <option v-for="option in PERIODS" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </div>

    <!-- ---- 구성원별 현황 ---- -->
    <section v-if="summary" class="space-y-3">
      <h2 class="text-sm font-semibold">구성원별 현황</h2>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="활동한 사람"
          :value="`${summary.totals.active_members} / ${summary.totals.members}`"
          hint="사용 중인 계정 기준"
        />
        <StatTile label="로그인" :value="summary.totals.signed_in" />
        <StatTile label="로그인 실패" :value="summary.totals.failed" tone="warn" hint="없는 이메일로 시도한 것 포함" />
        <StatTile label="문서 작성" :value="summary.totals.created" />
        <StatTile label="문서 수정" :value="summary.totals.updated" />
        <StatTile label="복사" :value="summary.totals.copied" />
      </div>

      <p class="text-[11px] text-slate-400 dark:text-slate-500">
        사람을 누르면 아래 활동 기록이 그 사람 것만 보입니다. 한 번 더 누르면 풀립니다.
      </p>

      <AdminTable :columns="MEMBER_COLUMNS">
        <tr
          v-for="member in summary.members"
          :key="member.user.id"
          class="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
          :class="[
            String(member.user.id) === userFilter ? 'bg-indigo-50/70 dark:bg-indigo-500/10' : '',
            member.user.active ? '' : 'opacity-50',
          ]"
          @click="focusMember(member)"
        >
          <td class="px-3.5 py-2.5">
            <div class="flex items-center gap-2.5">
              <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {{ member.user.initials }}
              </span>
              <span class="min-w-0">
                <span class="flex items-center gap-1.5">
                  <span class="truncate font-medium">{{ member.user.name }}</span>
                  <span
                    v-if="!member.user.active"
                    class="shrink-0 rounded bg-slate-200 px-1 py-px text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  >중지됨</span>
                  <span
                    v-if="member.counts.failed"
                    class="shrink-0 rounded bg-rose-100 px-1 py-px text-[10px] font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                    :title="`이 기간에 로그인 실패 ${member.counts.failed}회`"
                  >실패 {{ member.counts.failed }}</span>
                </span>
                <span class="block truncate text-[11px] text-slate-400">{{ [member.user.department, member.user.job_rank].filter(Boolean).join(' · ') || member.user.email }}</span>
              </span>
            </div>
          </td>
          <td class="px-3.5 py-2.5 text-slate-500 dark:text-slate-400">
            <span v-if="member.last_activity_at" :title="formatDate(member.last_activity_at)">
              {{ fromNow(member.last_activity_at) }}
            </span>
            <!-- 활동 기록은 이 기능을 넣은 뒤부터 쌓인다. 그 전에 들어온 적 있는 사람을
                 "한 번도 안 쓴 사람" 처럼 보이게 두지 않으려고 예전 로그인 시각이라도 보여 준다. -->
            <span
              v-else-if="member.last_signed_in_at"
              :title="`활동 기록이 쌓이기 전의 마지막 로그인 · ${formatDate(member.last_signed_in_at)}`"
            >
              {{ fromNow(member.last_signed_in_at) }}
              <span class="text-[10px] text-slate-400">로그인</span>
            </span>
            <span v-else class="text-amber-600 dark:text-amber-400">한 번도 안 들어옴</span>
          </td>
          <td
            v-for="key in COUNT_KEYS"
            :key="key"
            class="px-3.5 py-2.5 text-right tabular-nums"
            :class="member.counts[key] ? '' : 'text-slate-300 dark:text-slate-600'"
          >
            {{ member.counts[key] }}
          </td>
        </tr>
      </AdminTable>
    </section>

    <!-- ---- 활동 기록 ---- -->
    <section id="activity-log" class="scroll-mt-6 space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-sm font-semibold">
          활동 기록
          <span v-if="selectedMember" class="ml-1 font-normal text-slate-500 dark:text-slate-400">— {{ selectedMember.name }}</span>
        </h2>
        <span class="text-xs text-slate-400">{{ data?.meta.total ?? 0 }}건</span>

        <div class="ml-auto flex flex-wrap items-center gap-2">
          <select
            v-model="userFilter"
            aria-label="사람"
            class="rounded-xl bg-slate-100 px-3 py-2 text-[13px] transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
          >
            <option value="">모든 사람</option>
            <option v-for="member in summary?.members ?? []" :key="member.user.id" :value="String(member.user.id)">
              {{ member.user.name }}
            </option>
          </select>
          <select
            v-model="groupFilter"
            aria-label="갈래"
            class="rounded-xl bg-slate-100 px-3 py-2 text-[13px] transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
          >
            <option value="">모든 갈래</option>
            <option v-for="group in data?.groups ?? []" :key="group.value" :value="group.value">{{ group.label }}</option>
          </select>
          <select
            v-model="actionFilter"
            aria-label="종류"
            class="rounded-xl bg-slate-100 px-3 py-2 text-[13px] transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
          >
            <option value="">모든 종류</option>
            <option v-for="action in data?.actions ?? []" :key="action.value" :value="action.value">{{ action.label }}</option>
          </select>
        </div>
      </div>

      <AdminTable :columns="LOG_COLUMNS">
        <tr v-for="log in data?.logs ?? []" :key="log.id">
          <td class="px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <span
                class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                :class="GROUP_STYLES[log.group ?? ''] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
              >{{ groupLabel(log.group) }}</span>
              <span
                class="font-medium"
                :class="log.action === 'session.failed' ? 'text-rose-600 dark:text-rose-400' : ''"
              >{{ log.label }}</span>
            </div>
          </td>
          <td class="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
            <button
              v-if="log.user_id"
              type="button"
              class="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
              :title="`${log.actor_name} 님의 기록만 보기`"
              @click="userFilter = String(log.user_id)"
            >
              {{ log.actor_name }}
            </button>
            <span v-else class="text-slate-400">{{ log.actor_name }}</span>
          </td>
          <td class="max-w-[14rem] px-3.5 py-2.5 text-slate-500 dark:text-slate-400">
            <NuxtLink
              v-if="log.slug"
              :to="`/prompts/${encodeURIComponent(log.slug)}`"
              class="block truncate hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
            >
              {{ log.target_label }}
            </NuxtLink>
            <span v-else class="block truncate">{{ log.target_label || '—' }}</span>
          </td>
          <td class="max-w-sm px-3.5 py-2.5 text-[12px] text-slate-400">{{ describeDetails(log) || '—' }}</td>
          <td class="whitespace-nowrap px-3.5 py-2.5 text-slate-500 dark:text-slate-400" :title="formatDate(log.created_at)">
            {{ fromNow(log.created_at) }}
          </td>
        </tr>

        <tr v-if="!pending && !data?.logs.length">
          <td :colspan="LOG_COLUMNS.length" class="px-3.5 py-10 text-center text-slate-400">
            조건에 맞는 기록이 없습니다.
          </td>
        </tr>
      </AdminTable>

      <nav v-if="data && data.meta.total_pages > 1" class="flex items-center justify-center gap-2">
        <button type="button" :disabled="page <= 1" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700" @click="page -= 1">
          이전
        </button>
        <span class="text-xs tabular-nums text-slate-500">{{ data.meta.page }} / {{ data.meta.total_pages }}</span>
        <button type="button" :disabled="page >= data.meta.total_pages" class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700" @click="page += 1">
          다음
        </button>
      </nav>
    </section>
  </div>
</template>
