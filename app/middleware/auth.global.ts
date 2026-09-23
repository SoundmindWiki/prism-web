/**
 * 로그인하지 않았으면 어디를 열든 로그인 화면으로 보낸다.
 * 백오피스는 관리자만.
 */

// 정적 호스팅에서는 /login 이 /login/ 으로 넘어오기도 한다.
// 끝 슬래시를 떼고 비교하지 않으면 로그인 화면이 자기 자신으로 리다이렉트하는 순환에 빠진다.
function normalize(path: string) {
  return path.replace(/\/+$/, '') || '/'
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const { restore, isSignedIn, isAdmin } = useAuth()
  await restore()

  const path = normalize(to.path)

  if (path === '/login') {
    if (!isSignedIn.value) return

    // 이미 로그인한 사람이 로그인 화면을 열면 원래 가려던 곳으로 보낸다.
    // 단, 돌아갈 곳이 또 로그인 화면이면 홈으로 보낸다.
    const wanted = typeof to.query.redirect === 'string' ? to.query.redirect : '/'
    return navigateTo(normalize(wanted.split('?')[0] ?? '/') === '/login' ? '/' : wanted)
  }

  if (!isSignedIn.value) {
    return navigateTo({ path: '/login', query: path === '/' ? {} : { redirect: to.fullPath } })
  }

  if (path.startsWith('/admin') && !isAdmin.value) {
    return navigateTo('/')
  }
})
