import type { WikiUser } from '~/types'

const TOKEN_KEY = 'prism:token'
const USER_KEY = 'prism:user'

/**
 * 토큰 기반 로그인. 프론트가 API 와 다른 오리진에서 돌기 때문에
 * 쿠키 대신 Authorization 헤더로 토큰을 들고 다닌다.
 *
 * 토큰을 localStorage 에 두는 건 XSS 에 약하다는 걸 알고 내린 선택이다.
 * 프론트와 API 의 오리진이 달라서 쿠키를 그대로 태우기 어려웠기 때문인데,
 * 같은 도메인으로 합치게 되면 HttpOnly 쿠키로 바꾸는 편이 낫다.
 */
export function useAuth() {
  const config = useRuntimeConfig()
  const token = useState<string | null>('auth-token', () => null)
  const user = useState<WikiUser | null>('auth-user', () => null)
  const restored = useState<boolean>('auth-restored', () => false)

  const isSignedIn = computed(() => Boolean(token.value && user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')

  function persist(nextToken: string | null, nextUser: WikiUser | null) {
    token.value = nextToken
    user.value = nextUser

    try {
      if (nextToken && nextUser) {
        localStorage.setItem(TOKEN_KEY, nextToken)
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      } else {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    } catch {
      // 저장이 막힌 브라우저에서도 이번 세션 동안은 쓸 수 있게 둔다.
    }
  }

  /** 새로고침 후 저장된 토큰을 되살리고, 서버에 아직 유효한지 물어본다. */
  async function restore() {
    if (restored.value || import.meta.server) return

    let storedToken: string | null = null
    let storedUser: string | null = null
    try {
      storedToken = localStorage.getItem(TOKEN_KEY)
      storedUser = localStorage.getItem(USER_KEY)
    } catch {
      storedToken = null
    }

    if (!storedToken) {
      restored.value = true
      return
    }

    // 먼저 저장된 값으로 화면을 띄워 깜빡임을 없애고,
    token.value = storedToken
    try {
      if (storedUser) user.value = JSON.parse(storedUser) as WikiUser
    } catch {
      user.value = null
    }

    // 그 다음 서버에 확인한다. 그새 계정이 중지됐을 수도 있다.
    try {
      const response = await $fetch<{ user: WikiUser }>('/session', {
        baseURL: config.public.apiBase,
        headers: { Authorization: `Bearer ${storedToken}` },
      })
      persist(storedToken, response.user)
    } catch {
      persist(null, null)
    } finally {
      restored.value = true
    }
  }

  async function signIn(email: string, password: string) {
    const response = await $fetch<{ token: string; user: WikiUser }>('/session', {
      baseURL: config.public.apiBase,
      method: 'POST',
      body: { session: { email, password } },
    })

    persist(response.token, response.user)
    restored.value = true
    return response.user
  }

  async function signOut() {
    const current = token.value

    // 서버 세션을 지우지 못해도 이 기기에서는 나가야 한다.
    if (current) {
      try {
        await $fetch('/session', {
          baseURL: config.public.apiBase,
          method: 'DELETE',
          headers: { Authorization: `Bearer ${current}` },
        })
      } catch {
        // 이미 만료됐거나 서버가 닫혔을 뿐이다.
      }
    }

    persist(null, null)
    clearNuxtState()
    await navigateTo('/login')
  }

  /** 로그아웃할 때 남의 데이터가 화면에 남지 않도록 캐시를 비운다. */
  function clearNuxtState() {
    clearNuxtData()
  }

  return { token, user, restored, isSignedIn, isAdmin, restore, signIn, signOut }
}
