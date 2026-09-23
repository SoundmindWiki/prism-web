const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/** "3일 전" 처럼. 목록에서는 정확한 시각보다 이쪽이 읽기 편하다. */
export function fromNow(value: string | null | undefined): string {
  if (!value) return ''

  const elapsed = new Date(value).getTime() - Date.now()
  const formatter = new Intl.RelativeTimeFormat('ko-KR', { numeric: 'auto' })

  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= size) {
      return formatter.format(Math.round(elapsed / size), unit)
    }
  }

  return '방금'
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''

  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 본문에서 {{변수}} 를 찾아낸다. 서버의 Prompt::VARIABLE_PATTERN 과 같은 규칙. */
export const VARIABLE_PATTERN = /\{\{\s*([^{}\n]{1,40}?)\s*\}\}/g

export function extractVariables(body: string): string[] {
  return [...body.matchAll(VARIABLE_PATTERN)].map((match) => match[1]!.trim()).filter((name, index, all) => all.indexOf(name) === index)
}

/** 입력한 값으로 {{변수}} 를 채운다. 비어 있는 변수는 그대로 남겨 둔다. */
export function fillVariables(body: string, values: Record<string, string>): string {
  return body.replace(VARIABLE_PATTERN, (match, rawName: string) => {
    const filled = values[rawName.trim()]
    return filled && filled.trim() ? filled : match
  })
}

const CATEGORY_STYLES: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/30',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
  fuchsia: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-500/30',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30',
}

export function categoryStyle(color: string | undefined): string {
  return CATEGORY_STYLES[color ?? 'slate'] ?? CATEGORY_STYLES.slate!
}

// 사이드바 폴더 아이콘 색. Tailwind 가 찾을 수 있게 클래스 이름을 통째로 적어 둔다.
const CATEGORY_ICON_COLORS: Record<string, string> = {
  indigo: 'text-indigo-500 dark:text-indigo-400',
  violet: 'text-violet-500 dark:text-violet-400',
  sky: 'text-sky-500 dark:text-sky-400',
  cyan: 'text-cyan-500 dark:text-cyan-400',
  teal: 'text-teal-500 dark:text-teal-400',
  emerald: 'text-emerald-500 dark:text-emerald-400',
  amber: 'text-amber-500 dark:text-amber-400',
  rose: 'text-rose-500 dark:text-rose-400',
  fuchsia: 'text-fuchsia-500 dark:text-fuchsia-400',
  orange: 'text-orange-500 dark:text-orange-400',
  slate: 'text-slate-400 dark:text-slate-500',
}

export function categoryIconColor(color: string | undefined): string {
  return CATEGORY_ICON_COLORS[color ?? 'slate'] ?? CATEGORY_ICON_COLORS.slate!
}

// 자주 쓰는 직급. 고정 목록이 아니라 거들어 주기만 한다 — 직접 적어도 된다.
export const JOB_RANKS = ['매니저', '팀장', '책임', '선임', '대표']

const FIELD_LABELS: Record<string, string> = {
  title: '제목',
  body: '본문',
  summary: '한 줄 설명',
  usage_notes: '사용 팁',
  model_hint: '권장 모델',
  variables: '변수',
}

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}
