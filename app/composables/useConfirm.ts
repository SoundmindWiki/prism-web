export interface ConfirmRequest {
  title: string
  /** 한 문장으로 무슨 일이 일어나는지. */
  description?: string
  /** "무엇이 몇 건 바뀌는지" 를 줄 단위로. 되돌릴 수 없는 항목일수록 여기 적는다. */
  impacts?: string[]
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

// 화면 어디서든 부를 수 있어야 해서 resolver 는 모듈에 둔다 (직렬화 대상이 아니라 useState 에 못 넣는다).
let resolver: ((ok: boolean) => void) | null = null

/**
 * 되돌리기 어려운 동작 앞에 세우는 확인 창.
 * 브라우저 기본 confirm 과 달리 영향 범위를 항목으로 보여 줄 수 있고, 화면 톤을 따라간다.
 *
 *   if (!(await ask({ title: '지울까요?', impacts: ['문서 12건이 분류를 잃습니다'] }))) return
 */
export function useConfirm() {
  const request = useState<ConfirmRequest | null>('confirm-request', () => null)

  function ask(next: ConfirmRequest) {
    // 앞에 열려 있던 게 있으면 취소로 닫고 새 질문을 띄운다.
    resolver?.(false)
    request.value = next
    return new Promise<boolean>((resolve) => {
      resolver = resolve
    })
  }

  function settle(ok: boolean) {
    request.value = null
    const resolve = resolver
    resolver = null
    resolve?.(ok)
  }

  return {
    request,
    ask,
    accept: () => settle(true),
    reject: () => settle(false),
  }
}
