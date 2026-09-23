import type { ApiError } from '~/types'

/** Rails API 를 부르는 얇은 래퍼. 토큰을 붙이고, 만료되면 로그인 화면으로 보낸다. */
export function useApi() {
  const config = useRuntimeConfig()
  const { token, user } = useAuth()

  async function request<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}): Promise<T> {
    const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) }
    if (token.value) headers.Authorization = `Bearer ${token.value}`

    try {
      return await $fetch<T>(path, { ...options, baseURL: config.public.apiBase, headers })
    } catch (error) {
      // 401 이라고 다 세션 문제가 아니다. 비밀번호를 틀린 것도 401 이 될 수 있는데
      // 그걸로 로그아웃시키면 화면이 통째로 날아간다.
      // 서버가 code: "unauthenticated" 를 붙여 준 것만 세션 만료로 취급한다.
      const status = (error as { status?: number })?.status
      const code = (error as { data?: ApiError })?.data?.code

      if (status === 401 && code === 'unauthenticated' && token.value) {
        token.value = null
        user.value = null
        try {
          localStorage.removeItem('prism:token')
          localStorage.removeItem('prism:user')
        } catch {
          // 지울 수 없어도 메모리에서는 이미 비웠다.
        }
        await navigateTo('/login')
      }

      throw error
    }
  }

  return { request }
}

/** 서버가 돌려준 오류를 사람이 읽을 수 있는 한 줄로 바꾼다. */
export function describeApiError(error: unknown): string {
  const payload = (error as { data?: ApiError })?.data

  if (payload?.details) {
    const messages = Object.entries(payload.details).map(([field, texts]) => `${field}: ${texts.join(', ')}`)
    if (messages.length) return messages.join(' · ')
  }

  return payload?.error ?? payload?.detail ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
