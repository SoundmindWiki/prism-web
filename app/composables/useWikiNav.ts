import type { CategoryRow, DomainRow, ListMeta, PromptCard, Tag, TreeBranch } from '~/types'

export interface CategoryBranch {
  category: CategoryRow
  children: CategoryBranch[]
  /** 이 카테고리에 바로 달린 문서만. 하위 카테고리 문서는 그 가지 아래에 있다. */
  prompts: PromptCard[]
}

/**
 * 사이드바가 쓰는 문서 목록. 레이아웃에서 한 번만 불러 두고 전 화면이 나눠 쓴다.
 * 사내 위키 규모(수백 건)에서는 통째로 받아 두는 편이 트리를 접었다 펴는 맛이 좋다.
 * 수천 건이 되면 카테고리별로 나눠 부르도록 바꾸면 된다.
 */
export function useWikiNav() {
  const { request } = useApi()

  const { data, pending, refresh } = useAsyncData('wiki-nav', async () => {
    const [categories, domains, prompts, tags] = await Promise.all([
      request<{ categories: CategoryRow[] }>('/categories'),
      request<{ domains: DomainRow[] }>('/domains'),
      request<{ prompts: PromptCard[]; meta: ListMeta }>('/prompts', {
        params: { per_page: 200, sort: 'title' },
      }),
      request<{ tags: Tag[] }>('/tags', { params: { used: true } }),
    ])

    return {
      categories: categories.categories,
      domains: domains.domains,
      prompts: prompts.prompts,
      tags: tags.tags,
      total: prompts.meta.total,
    }
  })

  const tree = computed<CategoryBranch[]>(() => {
    const prompts = data.value?.prompts ?? []
    const attach = (branch: TreeBranch<CategoryRow>): CategoryBranch => ({
      category: branch.node,
      children: branch.children.map(attach),
      prompts: prompts.filter((prompt) => prompt.category.id === branch.node.id),
    })
    return buildTree(data.value?.categories ?? []).map(attach)
  })

  const domainTree = computed(() => buildTree(data.value?.domains ?? []))

  const topTags = computed(() =>
    [...(data.value?.tags ?? [])]
      .sort((a, b) => (b.prompts_count ?? 0) - (a.prompts_count ?? 0))
      .slice(0, 10),
  )

  return { data, pending, refresh, tree, domainTree, topTags }
}
