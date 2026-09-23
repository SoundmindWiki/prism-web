/** 복사 버튼 하나에 필요한 상태를 모아 둔 것. 복사 성공 표시는 잠깐만 띄운다. */
export function useClipboard(resetAfter = 1800) {
  const copied = ref(false)
  const failed = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  /** 성공 여부를 돌려준다 — 부르는 쪽에서 알림 문구를 고를 수 있게. */
  async function copy(text: string) {
    clearTimeout(timer)
    failed.value = false

    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      copied.value = true
      ok = true
    } catch {
      // http 로 열었거나 권한이 없을 때. 사용자가 직접 선택해 복사할 수 있게 알려 준다.
      copied.value = false
      failed.value = true
    }

    timer = setTimeout(() => {
      copied.value = false
      failed.value = false
    }, resetAfter)

    return ok
  }

  onScopeDispose(() => clearTimeout(timer))

  return { copied, failed, copy }
}
