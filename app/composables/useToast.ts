export type ToastTone = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

/** 같은 문구가 연달아 뜨면 새로 쌓지 않고 시계만 다시 돌린다. */
const DEFAULT_DURATION = 3200
const MAX_STACK = 3

let seq = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

/**
 * 저장·삭제처럼 화면이 크게 바뀌지 않는 동작의 결과를 알린다.
 * 상태를 useState 에 두기 때문에 어느 화면에서 띄우든 같은 자리에 쌓인다.
 */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(message: string, tone: ToastTone = 'info', duration = DEFAULT_DURATION) {
    const existing = toasts.value.find((toast) => toast.message === message && toast.tone === tone)
    if (existing) {
      const timer = timers.get(existing.id)
      if (timer) clearTimeout(timer)
      timers.set(existing.id, setTimeout(() => dismiss(existing.id), duration))
      return existing.id
    }

    const id = ++seq
    toasts.value = [...toasts.value, { id, message, tone }].slice(-MAX_STACK)
    timers.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }

  return {
    toasts,
    dismiss,
    push,
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error'),
    info: (message: string) => push(message, 'info'),
  }
}
