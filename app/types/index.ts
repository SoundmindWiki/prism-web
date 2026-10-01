export interface WikiUser {
  id: number
  name: string
  email: string
  department: string | null
  /** 직급. 팀장·매니저처럼 조직 안에서의 자리 */
  job_rank: string | null
  /** 직함. 하는 일 */
  job_title: string | null
  initials: string
  role: 'member' | 'admin'
  active: boolean
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  color: string
  position: number
  parent_id: number | null
  /** 맨 위부터 자기까지의 이름. ["개발", "프론트엔드"] */
  path: string[]
  prompts_count?: number
}

export interface Domain {
  id: number
  name: string
  slug: string
  path: string[]
}

/**
 * 트리 분류 목록의 한 줄. 서버는 트리 순서(부모 다음 자식)로 편 목록을 준다.
 * prompts_count 는 바로 달린 문서 수, total_count 는 하위까지 합친 수다.
 */
export interface TaxonomyFields {
  description: string | null
  position: number
  parent_id: number | null
  parent_slug: string | null
  depth: number
  has_children: boolean
  prompts_count: number
  total_count: number
}

export type CategoryRow = Category & TaxonomyFields
export type DomainRow = Domain & TaxonomyFields

/** 편 목록을 다시 짠 트리의 가지 */
export interface TreeBranch<T> {
  node: T
  children: TreeBranch<T>[]
}

export interface Tag {
  id: number
  name: string
  slug: string
  prompts_count?: number
}

export interface PromptVariable {
  name: string
  description: string
  example: string
}

export interface PromptCard {
  id: number
  slug: string
  title: string
  summary: string | null
  excerpt: string
  status: 'draft' | 'published' | 'archived'
  model_hint: string | null
  copy_count: number
  view_count: number
  variable_count: number
  category: Category
  /** 비어 있으면 특정 업계에 매이지 않은 범용 문서 */
  domains: Domain[]
  author: WikiUser | null
  last_editor: WikiUser | null
  tags: Tag[]
  created_at: string
  updated_at: string
}

export interface Prompt extends PromptCard {
  body: string
  usage_notes: string | null
  variables: PromptVariable[]
  version_count: number
  /** 내려받을 때 쓸 파일 이름. 스크립트면 .sh, 아니면 .md */
  download_filename: string
}

export interface PromptVersion {
  version_number: number
  title: string
  summary: string | null
  model_hint: string | null
  change_note: string | null
  changed_fields: string[]
  editor: WikiUser | null
  created_at: string
  body?: string
  usage_notes?: string | null
}

export interface ListMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface WikiStats {
  prompts: number
  drafts: number
  archived: number
  contributors: number
  tags: number
  copies: number
  edits: number
  updated_this_week: number
}

export interface ApiError {
  error: string
  /** 세션 만료는 "unauthenticated", 권한 부족은 "forbidden" */
  code?: string
  detail?: string
  details?: Record<string, string[]>
}
