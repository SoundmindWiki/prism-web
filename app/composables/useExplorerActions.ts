import type { Category, Prompt } from '~/types'
import type { ImportedPrompt } from './useMarkdownFile'

/**
 * 사이드바 트리에서 하는 일들 — 폴더 만들기, 문서 옮기기, 파일(.md · .sh) 넣기.
 * 화면 그리는 일과 섞이면 컴포넌트가 금방 커져서 따로 뒀다.
 */
export function useExplorerActions() {
  const { request } = useApi()
  const { parse } = useMarkdownFile()
  const { invalidate } = usePromptCache()
  const { stash } = usePromptDraft()
  const toast = useToast()
  const router = useRouter()

  async function createFolder(parentSlug: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return null

    try {
      const { category } = await request<{ category: Category }>('/categories', {
        method: 'POST',
        body: { category: { name: trimmed, parent_slug: parentSlug } },
      })
      await invalidate()
      toast.success(`"${category.name}" 폴더를 만들었습니다`)
      return category
    } catch (caught) {
      toast.error(describeApiError(caught))
      return null
    }
  }

  async function movePrompt(slug: string, categorySlug: string, folderName: string) {
    try {
      await request<{ prompt: Prompt }>(`/prompts/${encodeURIComponent(slug)}/move`, {
        method: 'POST',
        body: { category_slug: categorySlug },
      })
      await invalidate(slug)
      toast.success(`"${folderName}" 으로 옮겼습니다`)
      return true
    } catch (caught) {
      toast.error(describeApiError(caught))
      return false
    }
  }

  /**
   * 고른 파일(.md · .sh)을 그 폴더에 문서로 넣는다.
   * 그대로 저장해도 되는 파일은 바로 저장하고, 제목을 못 찾았다든지 걸리는 게 있는 파일은
   * 저장하지 않고 작성 화면으로 넘겨 사람이 보고 저장하게 한다.
   */
  async function importMarkdown(files: File[], categorySlug: string, folderName: string) {
    const saved: string[] = []
    const review: { fields: ImportedPrompt; warnings: string[]; source: string }[] = []
    const failed: string[] = []

    for (const file of files) {
      try {
        const { prompt: fields, warnings } = await parse(file)
        if (warnings.length) {
          review.push({ fields: { ...fields, category_slug: categorySlug }, warnings, source: file.name })
          continue
        }

        const { prompt } = await request<{ prompt: Prompt }>('/prompts', {
          method: 'POST',
          body: { prompt: { ...fields, category_slug: categorySlug } },
        })
        saved.push(prompt.title)
      } catch (caught) {
        failed.push(`${file.name} (${describeApiError(caught)})`)
      }
    }

    if (saved.length) {
      await invalidate()
      toast.success(saved.length === 1 ? `"${saved[0]}" 을(를) ${folderName} 에 넣었습니다` : `${saved.length}개 문서를 ${folderName} 에 넣었습니다`)
    }
    if (failed.length) toast.error(`넣지 못한 파일: ${failed.join(', ')}`)

    // 확인이 필요한 파일이 하나면 그 자리에서 작성 화면을 열어 준다.
    // 여러 개면 화면을 하나만 열 수 없으니 어떤 파일인지 알려 주고 사람이 하나씩 올리게 둔다.
    if (review.length === 1) {
      stash(review[0]!)
      await router.push({ path: '/prompts/new', query: { category: categorySlug } })
    } else if (review.length > 1) {
      toast.error(`확인이 필요해 저장하지 않은 파일: ${review.map((item) => item.source).join(', ')}`)
    }

    return { saved: saved.length, review: review.length, failed: failed.length }
  }

  return { createFolder, movePrompt, importMarkdown }
}
