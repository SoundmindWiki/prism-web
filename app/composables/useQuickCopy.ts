import type { Prompt, PromptCard } from '~/types'

/**
 * 목록 카드에서 바로 복사하기.
 * 카드에는 본문이 실려 있지 않아서 (목록 응답이 무거워진다) 누른 순간 한 건만 받아 온다.
 *
 * 변수가 있는 문서는 {{변수}} 가 남은 원본을 그대로 준다. 채워서 복사하려면
 * 상세 화면의 작성기를 쓰면 되고, 어느 쪽인지는 알림 문구로 알려 준다.
 */
export function useQuickCopy() {
  const { request } = useApi()
  const { copied, copy } = useClipboard()
  const toast = useToast()

  const pending = ref(false)

  async function copyPrompt(card: Pick<PromptCard, 'slug' | 'variable_count'>) {
    if (pending.value) return false
    pending.value = true

    try {
      const { prompt } = await request<{ prompt: Prompt }>(`/prompts/${encodeURIComponent(card.slug)}`)

      if (!(await copy(prompt.body))) {
        toast.error('복사 권한이 없습니다. 문서를 열어 직접 선택해 주세요.')
        return false
      }

      toast.success(
        card.variable_count
          ? `복사했습니다 · 변수 ${card.variable_count}개는 직접 채워 주세요`
          : '복사했습니다',
      )

      // 복사 횟수는 이 위키에서 가장 정직한 인기 지표라 실패해도 조용히 넘긴다.
      request(`/prompts/${encodeURIComponent(card.slug)}/copy`, { method: 'POST' }).catch(() => {})
      return true
    } catch {
      toast.error('문서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return false
    } finally {
      pending.value = false
    }
  }

  return { pending, copied, copyPrompt }
}
