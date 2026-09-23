<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const { signIn } = useAuth()

useHead({ title: '로그인' })
const route = useRoute()
const { theme, restore: restoreTheme, toggle } = useTheme()

const year = new Date().getFullYear()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const pending = ref(false)
const error = ref('')
// 실패할 때마다 올린다. 이 값을 :key 로 걸어야 같은 문구가 또 떠도 흔들림이 다시 돈다.
const errorSeq = ref(0)

// 중괄호 두 개는 템플릿에 직접 쓰지 않는다 (Vue 가 보간식으로 읽으려 든다).
const VARIABLE_EXAMPLE = '{{…}}'
const HIGHLIGHTS = [
  { term: '변수 채워 복사', desc: `${VARIABLE_EXAMPLE} 자리를 화면에서 채우고 완성본을 그대로 붙여 넣습니다` },
  { term: '문서 히스토리', desc: '저장할 때마다 전체가 남고 언제든 되돌릴 수 있습니다' },
  { term: '권한 관리', desc: '구성원·카테고리·태그는 백오피스에서 관리합니다' },
]

onMounted(restoreTheme)

async function submit() {
  if (pending.value) return

  pending.value = true
  error.value = ''

  try {
    await signIn(email.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await navigateTo(redirect)
  } catch (caught) {
    error.value = describeApiError(caught)
    errorSeq.value += 1
    password.value = ''
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <!-- 왼쪽: 제품 소개. 좁은 화면에서는 접힌다 -->
    <section class="relative hidden overflow-hidden bg-slate-900 px-12 py-14 text-slate-100 lg:flex lg:flex-col">
      <div
        class="pointer-events-none absolute -right-24 -top-24 size-96 animate-drift rounded-full bg-indigo-600/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-32 -left-16 size-96 animate-drift rounded-full bg-sky-500/15 blur-3xl"
        style="animation-duration: 21s; animation-delay: -7s"
        aria-hidden="true"
      />

      <div class="relative animate-rise">
        <AppWordmark size="lg" />
      </div>

      <div class="relative my-auto max-w-md">
        <h1 class="animate-rise text-3xl font-bold leading-tight tracking-tight" style="animation-delay: 80ms">
          흩어진 프롬프트를<br>한 갈래로
        </h1>
        <p class="animate-rise mt-4 text-sm leading-relaxed text-slate-300" style="animation-delay: 150ms">
          각자 메모장에 흩어져 있던 프롬프트를 Prism 한곳에 모읍니다.
          변수를 채워 바로 복사할 수 있고, 누가 언제 무엇을 고쳤는지 전부 남습니다.
        </p>

        <dl class="mt-9 space-y-3.5">
          <div
            v-for="(item, i) in HIGHLIGHTS"
            :key="item.term"
            class="flex animate-rise gap-3"
            :style="{ animationDelay: `${230 + i * 80}ms` }"
          >
            <svg class="mt-0.5 size-4 shrink-0 text-indigo-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m4 10 4 4 8-8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div>
              <dt class="text-[13px] font-medium">{{ item.term }}</dt>
              <dd class="mt-0.5 text-[13px] leading-relaxed text-slate-400">{{ item.desc }}</dd>
            </div>
          </div>
        </dl>
      </div>

      <p class="relative animate-rise text-xs text-slate-500" style="animation-delay: 520ms">
        팀이 함께 쌓아 올리는 프롬프트 라이브러리
      </p>
    </section>

    <!-- 오른쪽: 로그인 -->
    <section class="flex flex-col justify-center px-6 py-12 sm:px-12">
      <div class="mx-auto w-full max-w-sm">
        <div class="flex items-center justify-between lg:hidden">
          <AppWordmark />
        </div>

        <h2 class="mt-8 animate-rise text-xl font-bold tracking-tight lg:mt-0" style="animation-delay: 60ms">로그인</h2>
        <p class="mt-1.5 animate-rise text-sm text-slate-500 dark:text-slate-400" style="animation-delay: 110ms">
          사내 계정으로 들어와 주세요.
        </p>

        <form class="mt-7 animate-rise space-y-4" style="animation-delay: 170ms" @submit.prevent="submit">
          <div>
            <label for="login-email" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              사내 이메일
            </label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              required
              autocomplete="username"
              autofocus
              placeholder="name@company.com"
              class="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm transition-colors placeholder:text-slate-400 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-950"
            >
          </div>

          <div>
            <label for="login-password" class="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              비밀번호
            </label>
            <div class="relative">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-xl bg-slate-100 py-2.5 pl-3 pr-11 text-sm transition-colors placeholder:text-slate-400 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-950"
              >
              <button
                type="button"
                class="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M3 3l14 14M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5M6.2 6.3C4.5 7.4 3.2 9 2.5 10c1.4 2.4 4.2 5 7.5 5 1.3 0 2.5-.4 3.6-1M11 5.2c3 .4 5.3 2.7 6.5 4.8-.4.7-1 1.5-1.7 2.2" stroke-linecap="round" />
                </svg>
                <svg v-else class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M2.5 10S5.2 5 10 5s7.5 5 7.5 5-2.7 5-7.5 5-7.5-5-7.5-5Z" stroke-linejoin="round" />
                  <circle cx="10" cy="10" r="2.5" />
                </svg>
              </button>
            </div>
          </div>

          <p
            v-if="error"
            :key="errorSeq"
            role="alert"
            class="flex animate-shake items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <svg class="mt-0.5 size-3.5 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M10 6.5v4M10 13.5v.01" stroke-linecap="round" />
            </svg>
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="pending"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <svg v-if="pending" class="size-4 animate-spin" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="2.5" class="opacity-25" />
              <path d="M17.5 10A7.5 7.5 0 0 0 10 2.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            {{ pending ? '확인 중' : '로그인' }}
          </button>
        </form>

        <div
          class="mt-8 flex animate-rise items-center justify-between border-t border-slate-200 pt-5 dark:border-slate-800"
          style="animation-delay: 240ms"
        >
          <p class="text-xs text-slate-400 dark:text-slate-500">
            계정이 없으면 WX팀 오태훈 매니저에게 요청해 주세요.
          </p>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            :aria-label="theme === 'dark' ? '밝은 테마로 전환' : '어두운 테마로 전환'"
            @click="toggle"
          >
            <svg v-if="theme === 'dark'" class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="10" cy="10" r="3.5" />
              <path d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.9 4.1l-1.4 1.4M5.5 14.5l-1.4 1.4M15.9 15.9l-1.4-1.4M5.5 5.5 4.1 4.1" stroke-linecap="round" />
            </svg>
            <svg v-else class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M17 12.5A7.5 7.5 0 0 1 7.5 3a7.5 7.5 0 1 0 9.5 9.5Z" stroke-linejoin="round" />
            </svg>
          </button>
        </div>

        <p class="mt-6 animate-rise text-center text-xs text-slate-400 dark:text-slate-500" style="animation-delay: 300ms">
          &copy; {{ year }} RosieOh. All rights reserved.
        </p>
      </div>
    </section>
  </div>
</template>
