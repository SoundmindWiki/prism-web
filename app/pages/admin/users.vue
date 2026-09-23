<script setup lang="ts">
import type { ListMeta } from '~/types'

interface AdminUser {
  id: number
  name: string
  email: string
  department: string | null
  job_rank: string | null
  job_title: string | null
  initials: string
  role: 'member' | 'admin'
  active: boolean
  last_signed_in_at: string | null
  created_at: string
  prompts_count: number
  has_password: boolean
}

const { request } = useApi()
const { user: me } = useAuth()
const { ask } = useConfirm()
const toast = useToast()

useHead({ title: '백오피스 · 구성원' })

const query = ref('')
const roleFilter = ref('')
const page = ref(1)

const { data, refresh, pending } = await useAsyncData(
  'admin-users',
  () =>
    request<{ users: AdminUser[]; meta: ListMeta }>('/admin/users', {
      params: { q: query.value || undefined, role: roleFilter.value || undefined, page: page.value, per_page: 20 },
    }),
  { watch: [page, roleFilter], getCachedData: () => undefined },
)

// 검색은 타자를 멈춘 뒤에 보낸다
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(query, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refresh()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

const dialog = ref<'create' | 'edit' | null>(null)
const editing = ref<AdminUser | null>(null)
const form = reactive({ name: '', email: '', department: '', job_rank: '', job_title: '', role: 'member' as 'member' | 'admin' })
const saving = ref(false)
const formError = ref('')
const issuedPassword = ref<{ name: string; password: string } | null>(null)

function openCreate() {
  Object.assign(form, { name: '', email: '', department: '', job_rank: '', job_title: '', role: 'member' })
  formError.value = ''
  editing.value = null
  dialog.value = 'create'
}

function openEdit(user: AdminUser) {
  Object.assign(form, {
    name: user.name,
    email: user.email,
    department: user.department ?? '',
    job_rank: user.job_rank ?? '',
    job_title: user.job_title ?? '',
    role: user.role,
  })
  formError.value = ''
  editing.value = user
  dialog.value = 'edit'
}

async function save() {
  if (saving.value) return

  saving.value = true
  formError.value = ''

  try {
    if (dialog.value === 'create') {
      const response = await request<{ user: AdminUser; initial_password?: string }>('/admin/users', {
        method: 'POST',
        body: { user: form },
      })
      if (response.initial_password) {
        issuedPassword.value = { name: response.user.name, password: response.initial_password }
      }
      dialog.value = null
      await refresh()
      toast.success(`${response.user.name} 님을 추가했습니다`)
      return
    }

    if (editing.value) {
      await request(`/admin/users/${editing.value.id}`, { method: 'PATCH', body: { user: form } })
      dialog.value = null
      await refresh()
      toast.success(`${form.name} 님의 정보를 수정했습니다`)
    }
  } catch (caught) {
    formError.value = describeApiError(caught)
  } finally {
    saving.value = false
  }
}

type UserAction = 'deactivate' | 'reactivate' | 'reset_password'

/** 무엇이 몇 건 바뀌는지를 동작마다 따로 적는다. 중지·재발급은 남의 세션을 끊는 일이라서. */
function askFor(user: AdminUser, action: UserAction) {
  const docs = user.prompts_count
    ? `작성한 문서 ${user.prompts_count}개와 히스토리는 그대로 남습니다`
    : '작성한 문서는 없습니다'

  if (action === 'deactivate') {
    return ask({
      title: '이 계정을 중지할까요?',
      description: `${user.name} · ${user.email}`,
      impacts: [
        '지금 로그인한 기기가 모두 로그아웃됩니다',
        '다시 로그인할 수 없게 됩니다',
        docs,
        '필요하면 언제든 다시 열 수 있습니다',
      ],
      confirmLabel: '중지하기',
      tone: 'danger',
    })
  }

  if (action === 'reactivate') {
    return ask({
      title: '이 계정을 다시 열까요?',
      description: `${user.name} · ${user.email}`,
      impacts: ['다시 로그인할 수 있게 됩니다', '비밀번호는 중지 전 그대로입니다'],
      confirmLabel: '다시 열기',
    })
  }

  return ask({
    title: '비밀번호를 새로 발급할까요?',
    description: `${user.name} · ${user.email}`,
    impacts: [
      '지금 로그인한 기기가 모두 로그아웃됩니다',
      '지금 쓰던 비밀번호는 즉시 못 쓰게 됩니다',
      '새 비밀번호는 이 화면에 한 번만 보여 주니 바로 전달해 주세요',
    ],
    confirmLabel: '재발급',
    tone: 'danger',
  })
}

async function act(user: AdminUser, action: UserAction) {
  if (!(await askFor(user, action))) return

  try {
    if (action === 'deactivate') {
      await request(`/admin/users/${user.id}`, { method: 'DELETE' })
      await refresh()
      toast.success(`${user.name} 님의 계정을 중지했습니다`)
      return
    }

    if (action === 'reactivate') {
      await request(`/admin/users/${user.id}/reactivate`, { method: 'POST' })
      await refresh()
      toast.success(`${user.name} 님의 계정을 다시 열었습니다`)
      return
    }

    const response = await request<{ initial_password?: string }>(`/admin/users/${user.id}/reset_password`, {
      method: 'POST',
    })
    if (response.initial_password) {
      issuedPassword.value = { name: user.name, password: response.initial_password }
    }
    await refresh()
  } catch (caught) {
    toast.error(describeApiError(caught))
  }
}

const COLUMNS = [
  { key: 'name', label: '이름' },
  { key: 'department', label: '부서 · 직급 · 직함' },
  { key: 'role', label: '권한' },
  { key: 'prompts', label: '작성 문서', align: 'right' as const },
  { key: 'last', label: '마지막 접속' },
  { key: 'actions', label: '', align: 'right' as const },
]
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="query"
        type="search"
        placeholder="이름, 이메일, 부서로 검색"
        class="w-full rounded-xl bg-slate-100 px-3 py-2 text-[13px] sm:w-64 dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
      >
      <select
        v-model="roleFilter"
        class="rounded-xl bg-slate-100 px-3 py-2 text-[13px] dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950"
      >
        <option value="">권한 전체</option>
        <option value="admin">관리자</option>
        <option value="member">일반</option>
      </select>

      <span class="text-xs text-slate-400">{{ data?.meta.total ?? 0 }}명</span>

      <button
        type="button"
        class="ml-auto rounded-xl bg-indigo-600 px-3 py-2 text-[13px] font-bold text-white hover:bg-indigo-700"
        @click="openCreate"
      >
        구성원 추가
      </button>
    </div>

    <AdminTable :columns="COLUMNS">
      <tr v-for="user in data?.users ?? []" :key="user.id" :class="user.active ? '' : 'opacity-60'">
        <td class="px-3.5 py-2.5">
          <div class="flex items-center gap-2.5">
            <span class="grid size-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {{ user.initials }}
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-1.5">
                <span class="truncate font-medium">{{ user.name }}</span>
                <span v-if="user.id === me?.id" class="shrink-0 text-[10px] text-slate-400">(나)</span>
                <span
                  v-if="!user.active"
                  class="shrink-0 rounded bg-slate-200 px-1 py-px text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                >중지됨</span>
              </span>
              <span class="block truncate text-[11px] text-slate-400">{{ user.email }}</span>
            </span>
          </div>
        </td>
        <td class="px-3.5 py-2.5 text-slate-500 dark:text-slate-400">
          {{ [user.department, user.job_rank, user.job_title].filter(Boolean).join(' · ') || '—' }}
        </td>
        <td class="px-3.5 py-2.5">
          <span
            class="rounded px-1.5 py-0.5 text-[11px] font-medium"
            :class="user.role === 'admin'
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
          >
            {{ user.role === 'admin' ? '관리자' : '일반' }}
          </span>
        </td>
        <td class="px-3.5 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{{ user.prompts_count }}</td>
        <td class="px-3.5 py-2.5 text-slate-500 dark:text-slate-400">
          <span v-if="user.last_signed_in_at">{{ fromNow(user.last_signed_in_at) }}</span>
          <span v-else class="text-amber-600 dark:text-amber-400">한 번도 없음</span>
        </td>
        <td class="px-3.5 py-2.5">
          <div class="flex justify-end gap-1">
            <button
              type="button"
              class="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              @click="openEdit(user)"
            >
              수정
            </button>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              @click="act(user, 'reset_password')"
            >
              비밀번호
            </button>
            <button
              v-if="user.active"
              type="button"
              class="rounded-md px-2 py-1 text-[12px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
              @click="act(user, 'deactivate')"
            >
              중지
            </button>
            <button
              v-else
              type="button"
              class="rounded-md px-2 py-1 text-[12px] text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              @click="act(user, 'reactivate')"
            >
              재개
            </button>
          </div>
        </td>
      </tr>

      <tr v-if="!pending && !data?.users.length">
        <td :colspan="COLUMNS.length" class="px-3.5 py-10 text-center text-slate-400">
          조건에 맞는 구성원이 없습니다.
        </td>
      </tr>
    </AdminTable>

    <nav v-if="data && data.meta.total_pages > 1" class="flex items-center justify-center gap-2">
      <button
        type="button"
        :disabled="page <= 1"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
        @click="page -= 1"
      >
        이전
      </button>
      <span class="text-xs tabular-nums text-slate-500">{{ data.meta.page }} / {{ data.meta.total_pages }}</span>
      <button
        type="button"
        :disabled="page >= data.meta.total_pages"
        class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40 dark:border-slate-700"
        @click="page += 1"
      >
        다음
      </button>
    </nav>

    <!-- 구성원 추가 / 수정 -->
    <AdminDialog
      v-if="dialog"
      :title="dialog === 'create' ? '구성원 추가' : '구성원 정보 수정'"
      :description="dialog === 'create' ? '비밀번호는 자동으로 만들어 한 번만 보여 드립니다.' : undefined"
      @close="dialog = null"
    >
      <form class="space-y-3.5" @submit.prevent="save">
        <div>
          <label for="user-name" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">이름</label>
          <input id="user-name" v-model="form.name" required class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
        </div>
        <div>
          <label for="user-email" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">사내 이메일</label>
          <input id="user-email" v-model="form.email" type="email" required class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="user-department" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">부서</label>
            <input id="user-department" v-model="form.department" class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
          </div>
          <div>
            <label for="user-rank" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">직급</label>
            <input id="user-rank" v-model="form.job_rank" list="job-ranks" placeholder="예: 매니저" class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
            <datalist id="job-ranks">
              <option v-for="rank in JOB_RANKS" :key="rank" :value="rank" />
            </datalist>
          </div>
        </div>
        <div>
          <label for="user-job" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            직함 <span class="font-normal text-slate-400">하는 일 (예: 모바일 엔지니어)</span>
          </label>
          <input id="user-job" v-model="form.job_title" class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
        </div>
        <div>
          <label for="user-role" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">권한</label>
          <select id="user-role" v-model="form.role" class="w-full rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 transition-colors focus:bg-white dark:focus:bg-slate-950">
            <option value="member">일반 — 위키를 읽고 쓸 수 있습니다</option>
            <option value="admin">관리자 — 백오피스까지 들어올 수 있습니다</option>
          </select>
        </div>

        <p v-if="formError" class="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {{ formError }}
        </p>

        <div class="flex gap-2 pt-1">
          <button
            type="submit"
            :disabled="saving"
            class="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {{ saving ? '저장 중...' : dialog === 'create' ? '추가' : '저장' }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm dark:border-slate-700"
            @click="dialog = null"
          >
            취소
          </button>
        </div>
      </form>
    </AdminDialog>

    <!-- 발급된 비밀번호는 이 화면을 닫으면 다시 볼 수 없다 -->
    <AdminDialog
      v-if="issuedPassword"
      title="비밀번호가 발급되었습니다"
      description="이 창을 닫으면 다시 볼 수 없습니다. 지금 본인에게 전달해 주세요."
      @close="issuedPassword = null"
    >
      <div class="space-y-3">
        <div class="rounded-lg border border-slate-200 px-3 py-2.5 dark:border-slate-700">
          <p class="text-[11px] text-slate-400">{{ issuedPassword.name }}</p>
          <p class="mt-1 select-all font-mono text-base font-semibold tracking-wide">{{ issuedPassword.password }}</p>
        </div>
        <button
          type="button"
          class="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          @click="issuedPassword = null"
        >
          확인했습니다
        </button>
      </div>
    </AdminDialog>
  </div>
</template>
