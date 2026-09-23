import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-18',
  devtools: { enabled: true },

  // 검색 노출을 노리는 화면이 아니라 SEO 도 첫 페인트 경쟁도 없다.
  // SPA 로 두면 브라우저에 저장한 신원 정보를 서버 렌더링과 맞출 일이 사라져서
  // 화면이 깜빡이거나 하이드레이션이 어긋나는 문제를 아예 만들지 않는다.
  // SSR 이 필요해지면 이 줄만 지우고 신원 관련 UI 를 <ClientOnly> 로 감싸면 된다.
  ssr: false,

  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001/api/v1',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'ko' },
      // 화면마다 useHead({ title }) 를 달아 두면 탭에 '로그인 · Prism' 처럼 보인다.
      title: '사내 프롬프트 위키',
      titleTemplate: '%s · Prism',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Prism — 팀이 함께 쌓아 올리는 사내 프롬프트 라이브러리' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // 본문 서체. 자간이 좁고 획이 고른 편이라 한글 UI 가 차분하게 앉는다.
        // CDN 을 타기 싫으면 woff2 를 public/fonts 로 내려받고
        // 이 줄 대신 main.css 에 @font-face 를 직접 선언하면 된다.
        { rel: 'preconnect', href: 'https://cdn.jsdelivr.net', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
        },
      ],
    },
  },
})
