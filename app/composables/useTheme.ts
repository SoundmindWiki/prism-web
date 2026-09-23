const STORAGE_KEY = 'prism:theme'

type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = useState<Theme>('wiki-theme', () => 'light')

  function apply(next: Theme) {
    theme.value = next
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 저장이 막혀 있어도 이번 세션 동안은 적용된다.
    }
  }

  function restore() {
    if (import.meta.server) return

    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      stored = null
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    apply(stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light')
  }

  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, restore, toggle }
}
