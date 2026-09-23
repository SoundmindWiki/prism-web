<script setup lang="ts">
import type { PromptCard, WikiUser } from '~/types'

interface DeviceSession {
  id: number
  current: boolean
  device: string
  ip_address: string | null
  last_active_at: string
  expires_at: string
  created_at: string
}

interface Profile {
  user: WikiUser
  stats: { authored: number; edited: number; edits: number; copies: number }
  authored: PromptCard[]
  edited: PromptCard[]
  sessions: DeviceSession[]
}

useHead({ title: '마이페이지' })

const { request } = useApi()
const { user, signOut } = useAuth()

const { data, refresh } = await useAsyncData('profile', () => request<Profile>('/profile'), {
  getCachedData: () => undefined,
})

// ---- 내 정보 ----
const form = reactive({ name: '', department: '', job_rank: '', job_title: '' })
const savingProfile = ref(false)
const profileError = ref('')
const profileNotice = ref('')

watch(data, (value) => {
  if (!value) return
  form.name = value.user.name
  form.department = value.user.department ?? ''
  form.job_rank = value.user.job_rank ?? ''
  form.job_title = value.user.job_title ?? ''
}, { immediate: true })

async function saveProfile() {
  if (savingProfile.value) return

  savingProfile.value = true
  profileError.value = ''
  profileNotice.value = ''

  try {
    const response = await request<{ user: WikiUser }>('/profile', { method: 'PATCH', body: { user: form } })
    // 사이드바에 보이는 이름도 같이 바뀌어야 한다
    if (user.value) user.value = response.user
    try {
      localStorage.setItem('prism:user', JSON.stringify(response.user))
    } catch {
      // 저장이 막혀 있어도 이번 세션 동안은 반영된다.
    }
    profileNotice.value = '저장했습니다.'
    await refresh()
  } catch (caught) {
    profileError.value = describeApiError(caught)
  } finally {
    savingProfile.value = false
  }
}

// ---- 비밀번호 ----
const pw = reactive({ current: '', next: '', confirm: '' })
const savingPassword = ref(false)
const passwordError = ref('')
const passwordNotice = ref('')

const passwordMismatch = computed(() => pw.confirm.length > 0 && pw.next !== pw.confirm)

async function changePassword() {
  if (savingPassword.value) return

  passwordError.value = ''
  passwordNotice.value = ''

  if (pw.next !== pw.confirm) {
    passwordError.value = '새 비밀번호가 서로 다릅니다.'
    return
  }

  savingPassword.value = true

  try {
    const response = await request<{ signed_out_devices: number }>('/profile/password', {
      method: 'PATCH',
      body: { current_password: pw.current, password: pw.next },
    })
    passwordNotice.value = response.signed_out_devices > 0
      ? `비밀번호를 바꿨습니다. 다른 기기 ${response.signed_out_devices}대는 로그아웃되었습니다.`
      : '비밀번호를 바꿨습니다.'
    pw.current = ''
    pw.next = ''
    pw.confirm = ''
    await refresh()
  } catch (caught) {
    passwordError.value = describeApiError(caught)
  } finally {
    savingPassword.value = false
  }
}

// ---- 로그인 중인 기기 ----
const sessionError = ref('')
const otherSessions = computed(() => (data.value?.sessions ?? []).filter((s) => !s.current))

async function revoke(session: DeviceSession) {
  if (!confirm(`${session.device} 기기를 로그아웃시킬까요?`)) return

  sessionError.value = ''
  try {
    await request(`/profile/sessions/${session.id}`, { method: 'DELETE' })
    await refresh()
  } catch (caught) {
    sessionError.value = describeApiError(caught)
  }
}

async function revokeAll() {
  if (!confirm('지금 쓰는 기기만 남기고 모두 로그아웃시킬까요?')) return

  sessionError.value = ''
  try {
    await request('/profile/sessions', { method: 'DELETE' })
    await refresh()
  } catch (caught) {
    sessionError.value = describeApiError(caught)
  }
}
</script>

<template>
  <div v-if="data" class="mx-auto max-w-4xl space-y-8">
    <header>
      <h1 class="text-xl font-bold tracking-tight">마이페이지</h1>
      <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        내 정보와 비밀번호는 관리자를 거치지 않고 여기서 바로 바꿀 수 있습니다.
      </p>
    </header>

    <!-- 활동 요약 -->
    <section>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="내가 쓴 문서" :value="data.stats.authored" />
        <StatTile label="내가 손댄 문서" :value="data.stats.edited" :hint="`수정 ${data.stats.edits}회`" />
        <StatTile label="내 문서 복사 수" :value="data.stats.copies" />
        <StatTile label="로그인 중인 기기" :value="data.sessions.length" />
      </div>
    </section>

    <!-- 내 정보 -->
    <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <h2 class="text-sm font-semibold">내 정보</h2>

      <form class="mt-4 space-y-4" @submit.prevent="saveProfile">
        <div>
          <label for="me-email" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            사내 이메일
            <span class="font-normal text-slate-400">로그인에 쓰는 주소라 관리자만 바꿀 수 있습니다</span>
          </label>
          <input
            id="me-email"
            :value="data.user.email"
            disabled
            class="w-full cursor-not-allowed rounded-xl bg-slate-100 px-3 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          >
        </div>

        <div>
          <label for="me-name" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">이름</label>
          <input
            id="me-name"
            v-model="form.name"
            required
            maxlength="60"
            class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
          >
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="me-department" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">소속</label>
            <input
              id="me-department"
              v-model="form.department"
              placeholder="예: WX팀"
              class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
            >
          </div>
          <div>
            <label for="me-rank" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">직급</label>
            <input
              id="me-rank"
              v-model="form.job_rank"
              list="me-job-ranks"
              placeholder="예: 매니저"
              class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
            >
            <datalist id="me-job-ranks">
              <option v-for="rank in JOB_RANKS" :key="rank" :value="rank" />
            </datalist>
          </div>
          <div class="sm:col-span-2">
            <label for="me-job" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              직함 <span class="font-normal text-slate-400">하는 일</span>
            </label>
            <input
              id="me-job"
              v-model="form.job_title"
              placeholder="예: 프론트엔드 엔지니어"
              class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
            >
          </div>
        </div>

        <p v-if="profileError" class="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {{ profileError }}
        </p>
        <p v-else-if="profileNotice" class="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          {{ profileNotice }}
        </p>

        <button
          type="submit"
          :disabled="savingProfile"
          class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {{ savingProfile ? '저장 중...' : '저장' }}
        </button>
      </form>
    </section>

    <!-- 비밀번호 -->
    <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <h2 class="text-sm font-semibold">비밀번호 변경</h2>
      <p class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
        바꾸면 다른 기기는 모두 로그아웃됩니다. 지금 보고 있는 창은 그대로 유지됩니다.
      </p>

      <form class="mt-4 space-y-4" @submit.prevent="changePassword">
        <div>
          <label for="pw-current" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
            지금 비밀번호
          </label>
          <input
            id="pw-current"
            v-model="pw.current"
            type="password"
            required
            autocomplete="current-password"
            class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
          >
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="pw-next" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              새 비밀번호
              <span class="font-normal text-slate-400">8자 이상</span>
            </label>
            <input
              id="pw-next"
              v-model="pw.next"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm transition-colors focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950"
            >
          </div>
          <div>
            <label for="pw-confirm" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              새 비밀번호 확인
            </label>
            <input
              id="pw-confirm"
              v-model="pw.confirm"
              type="password"
              required
              autocomplete="new-password"
              class="w-full rounded-xl px-3 py-2.5 text-sm transition-colors focus:bg-white dark:focus:bg-slate-950"
              :class="passwordMismatch
                ? 'bg-rose-50 ring-1 ring-rose-300 dark:bg-rose-500/10 dark:ring-rose-500/40'
                : 'bg-slate-100 dark:bg-slate-800'"
            >
            <p v-if="passwordMismatch" class="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">
              두 값이 서로 다릅니다.
            </p>
          </div>
        </div>

        <p v-if="passwordError" class="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {{ passwordError }}
        </p>
        <p v-else-if="passwordNotice" class="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          {{ passwordNotice }}
        </p>

        <button
          type="submit"
          :disabled="savingPassword || passwordMismatch"
          class="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {{ savingPassword ? '바꾸는 중...' : '비밀번호 바꾸기' }}
        </button>
      </form>
    </section>

    <!-- 로그인 중인 기기 -->
    <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <div class="flex flex-wrap items-center gap-2">
        <h2 class="text-sm font-semibold">로그인 중인 기기</h2>
        <p class="text-[11px] text-slate-400 dark:text-slate-500">
          모르는 기기가 보이면 내보내고 비밀번호를 바꿔 주세요.
        </p>
        <button
          v-if="otherSessions.length"
          type="button"
          class="ml-auto rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="revokeAll"
        >
          다른 기기 모두 내보내기
        </button>
      </div>

      <p v-if="sessionError" class="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
        {{ sessionError }}
      </p>

      <ul class="mt-4 space-y-2">
        <li
          v-for="session in data.sessions"
          :key="session.id"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3.5 py-2.5 text-[13px]"
          :class="session.current ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-slate-50 dark:bg-slate-800/60'"
        >
          <span class="font-medium">{{ session.device }}</span>
          <span
            v-if="session.current"
            class="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white"
          >지금 이 창</span>
          <span class="text-[11px] text-slate-400">{{ session.ip_address || 'IP 알 수 없음' }}</span>
          <span class="text-[11px] text-slate-400">마지막 사용 {{ fromNow(session.last_active_at) }}</span>

          <button
            v-if="!session.current"
            type="button"
            class="ml-auto rounded-lg px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            @click="revoke(session)"
          >
            내보내기
          </button>
        </li>
      </ul>
    </section>

    <!-- 내 활동 -->
    <div class="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 class="text-sm font-semibold">내가 쓴 문서</h2>
        <div v-if="data.authored.length" class="mt-3 space-y-1.5">
          <NuxtLink
            v-for="prompt in data.authored"
            :key="prompt.id"
            :to="`/prompts/${encodeURIComponent(prompt.slug)}`"
            class="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-200/70 hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
          >
            <span class="min-w-0">
              <span class="block truncate text-[13px] font-medium">{{ prompt.title }}</span>
              <span class="block truncate text-[11px] text-slate-400">{{ prompt.category.name }}</span>
            </span>
            <span class="ml-auto shrink-0 text-[11px] tabular-nums text-slate-400">복사 {{ prompt.copy_count }}</span>
          </NuxtLink>
        </div>
        <p v-else class="mt-3 text-[13px] text-slate-400">
          아직 없습니다. 잘 통한 프롬프트가 있으면 올려 주세요.
        </p>
      </section>

      <section>
        <h2 class="text-sm font-semibold">내가 손댄 문서</h2>
        <div v-if="data.edited.length" class="mt-3 space-y-1.5">
          <NuxtLink
            v-for="prompt in data.edited"
            :key="prompt.id"
            :to="`/prompts/${encodeURIComponent(prompt.slug)}`"
            class="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-200/70 hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
          >
            <span class="min-w-0">
              <span class="block truncate text-[13px] font-medium">{{ prompt.title }}</span>
              <span class="block truncate text-[11px] text-slate-400">{{ prompt.category.name }}</span>
            </span>
            <span class="ml-auto shrink-0 text-[11px] text-slate-400">{{ fromNow(prompt.updated_at) }}</span>
          </NuxtLink>
        </div>
        <p v-else class="mt-3 text-[13px] text-slate-400">
          아직 없습니다. 고칠 게 보이면 허락 없이 고치셔도 됩니다.
        </p>
      </section>
    </div>

    <section class="border-t border-slate-200 pt-5 dark:border-slate-800">
      <button
        type="button"
        class="rounded-xl px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        @click="signOut"
      >
        이 기기에서 로그아웃
      </button>
    </section>
  </div>
</template>
