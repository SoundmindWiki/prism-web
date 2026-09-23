import type { ImportedPrompt } from './useMarkdownFile'

/** 저장 전에 작성 화면으로 넘기는 초안. MD 파일을 폴더에 넣다가 확인이 필요할 때 쓴다. */
export interface PromptDraft {
  fields: ImportedPrompt
  warnings: string[]
  /** 어디서 온 초안인지. 파일 이름을 그대로 쓴다. */
  source: string
}

export function usePromptDraft() {
  const draft = useState<PromptDraft | null>('prompt-draft', () => null)

  function stash(next: PromptDraft) {
    draft.value = next
  }

  // 한 번 쓰면 비운다. 새로 고치거나 다시 들어왔을 때 옛 초안이 되살아나면 곤란하다.
  function take() {
    const current = draft.value
    draft.value = null
    return current
  }

  return { stash, take }
}
