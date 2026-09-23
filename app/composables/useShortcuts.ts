/**
 * 화면 전체에 걸리는 키 하나짜리 단축키.
 *
 * 글을 쓰는 중이거나 (input·textarea·편집 가능한 곳) 창이 떠 있을 때는 쉰다.
 * 조합키가 눌려 있으면 브라우저 단축키일 수 있으니 건드리지 않는다.
 */
export function useShortcuts(map: Record<string, (event: KeyboardEvent) => void>) {
  function onKeydown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return

    const target = event.target as HTMLElement | null
    if (target?.isContentEditable) return
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

    // 확인 창이나 서랍이 떠 있으면 그쪽이 먼저다.
    if (document.querySelector('[aria-modal="true"]')) return

    const handler = map[event.key]
    if (!handler) return

    event.preventDefault()
    handler(event)
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
}
