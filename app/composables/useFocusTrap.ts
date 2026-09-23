const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * 열려 있는 동안 탭이 이 안에서만 돌게 묶고, Esc 로 닫는다.
 * 닫히면 열기 전에 보고 있던 곳으로 포커스를 돌려준다 — 키보드로 쓰는 사람이
 * 서랍을 닫고 나서 목록 맨 위로 튕겨 가지 않도록.
 *
 * 처음부터 열린 채로 붙는 창(v-if 로 띄우는 다이얼로그)과
 * 열고 닫기를 반복하는 서랍(모바일 사이드바) 양쪽을 다 받는다.
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  onEscape?: () => void,
  /** 열렸을 때 커서를 둘 곳. 없으면 안쪽 첫 번째 요소로 간다. */
  initialFocus?: () => HTMLElement | null | undefined,
) {
  let restoreTo: HTMLElement | null = null

  function items() {
    const root = container.value
    if (!root) return [] as HTMLElement[]
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
  }

  async function activate() {
    restoreTo = document.activeElement as HTMLElement | null
    await nextTick()
    ;(initialFocus?.() ?? items()[0])?.focus()
  }

  function deactivate() {
    // 사라진 요소로 되돌리면 포커스가 body 로 떨어진다. 살아 있을 때만.
    if (restoreTo?.isConnected) restoreTo.focus()
    restoreTo = null
  }

  function onKeydown(event: KeyboardEvent) {
    if (!active.value) return

    if (event.key === 'Escape') {
      event.stopPropagation()
      onEscape?.()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = items()
    if (!focusable.length) return

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const current = document.activeElement as HTMLElement | null

    // 컨테이너 밖에 포커스가 있으면 (직전 화면에 남아 있던 경우) 안쪽으로 끌어온다.
    if (!current || !container.value?.contains(current)) {
      event.preventDefault()
      first.focus()
      return
    }

    if (event.shiftKey && current === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(active, (isActive) => (isActive ? activate() : deactivate()))

  onMounted(() => {
    document.addEventListener('keydown', onKeydown, true)
    // 이미 열린 채로 붙은 경우 — watch 는 값이 바뀌어야 도니까 여기서 한 번 챙긴다.
    if (active.value) activate()
  })

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown, true)
    // 열린 채로 떼어 내는 창(v-if)도 포커스를 돌려주고 사라져야 한다.
    if (active.value) deactivate()
  })
}
