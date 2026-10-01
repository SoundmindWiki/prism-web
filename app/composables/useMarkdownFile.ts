import type { PromptVariable } from '~/types'

/** 서버가 .md 를 읽어 돌려주는, "새 문서" 폼에 채울 값. */
export interface ImportedPrompt {
  title: string
  category_slug: string | null
  summary: string
  body: string
  usage_notes: string
  model_hint: string
  tag_names: string[]
  /** 서버가 이미 있는 도메인으로 맞춰 준 주소들. 모르는 이름은 경고로 따로 온다. */
  domain_slugs: string[]
  variables: PromptVariable[]
}

/** 프롬프트를 .md 로 올리고 내려받는 일을 한곳에 모아 둔다. */
export function useMarkdownFile() {
  const { request } = useApi()

  /**
   * 파일을 글자로 읽는다. 대부분은 UTF-8 이지만, 예전 윈도우 메모장으로 저장한
   * 파일은 EUC-KR 이라 그대로 읽으면 한글이 전부 깨진다. 그럴 때만 다시 읽는다.
   */
  async function readText(file: File): Promise<string> {
    const bytes = await file.arrayBuffer()

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    } catch {
      return new TextDecoder('euc-kr').decode(bytes)
    }
  }

  async function parse(file: File) {
    return request<{ prompt: ImportedPrompt; warnings: string[] }>('/prompts/parse_markdown', {
      method: 'POST',
      body: { markdown: await readText(file), filename: file.name },
    })
  }

  /**
   * 파일로 내려받는다. 토큰을 헤더로 보내야 해서 링크로는 못 걸고,
   * 글자로 받아 브라우저 안에서 파일을 만들어 내려준다.
   *
   * 파일 이름은 서버가 정한 것(prompt.download_filename)을 그대로 쓴다.
   * 스크립트냐 아니냐를 양쪽에서 따로 따지면 언젠가 어긋난다.
   */
  async function download(slug: string, filename = `${slug}.md`) {
    const text = await request<string>(`/prompts/${encodeURIComponent(slug)}/markdown`, {
      responseType: 'text',
    })

    const type = filename.endsWith('.sh') ? 'text/x-shellscript' : 'text/markdown'
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return { readText, parse, download }
}
