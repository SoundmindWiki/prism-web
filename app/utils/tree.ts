import type { TreeBranch } from '~/types'

interface TreeRow {
  id: number
  parent_id: number | null
}

/** 서버가 트리 순서로 편 목록을 다시 가지로 짠다. 부모를 못 찾은 줄은 맨 위에 둔다. */
export function buildTree<T extends TreeRow>(rows: T[]): TreeBranch<T>[] {
  const branches = new Map(rows.map((row) => [row.id, { node: row, children: [] as TreeBranch<T>[] }]))
  const roots: TreeBranch<T>[] = []

  for (const row of rows) {
    const branch = branches.get(row.id)!
    const parent = row.parent_id == null ? undefined : branches.get(row.parent_id)
    if (parent) parent.children.push(branch)
    else roots.push(branch)
  }

  return roots
}

/** 고른 항목과 그 아래 전부의 slug. 부모를 고르면 자식 문서까지 보이는 서버 동작과 맞춘다. */
export function subtreeSlugs<T extends TreeRow & { slug: string }>(rows: T[], slug: string): Set<string> {
  const start = rows.find((row) => row.slug === slug)
  if (!start) return new Set()

  const ids = new Set([start.id])
  // 트리 순서라 자식은 늘 부모 뒤에 온다. 한 번 훑으면 된다.
  for (const row of rows) {
    if (row.parent_id != null && ids.has(row.parent_id)) ids.add(row.id)
  }
  return new Set(rows.filter((row) => ids.has(row.id)).map((row) => row.slug))
}

/** 셀렉트 상자에서 깊이를 보이려고 이름 앞에 들여쓰기를 붙인다. */
export function indentedName(row: { name: string; depth: number }) {
  return row.depth ? `${'　'.repeat(row.depth - 1)}└ ${row.name}` : row.name
}
