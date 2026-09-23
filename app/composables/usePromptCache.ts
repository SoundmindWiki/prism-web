/**
 * 프롬프트를 고치고 나면 화면에 남아 있는 예전 응답을 버려야 한다.
 * useAsyncData 는 같은 키의 결과를 컴포넌트 사이에서 공유하기 때문에,
 * 그냥 두면 저장 직후 상세로 돌아갔을 때 방금 고친 내용이 아니라 열기 전 내용이 보인다.
 */
export function usePromptCache() {
  // wiki-nav 는 사이드바가 늘 띄워 두는 목록이라 특히 잘 상한다.
  const LIST_KEYS = ['prompts', 'stats', 'categories', 'domains', 'tags', 'wiki-nav']

  /**
   * slug 를 주면 그 프롬프트의 상세·히스토리까지 비운다.
   * 지금 보고 있는 화면의 키를 비우면 데이터가 잠깐 비므로,
   * 화면에 이미 최신 응답을 들고 있을 때는 slug 없이 부른다.
   */
  async function invalidate(slug?: string) {
    const keys = [...LIST_KEYS]
    if (slug) keys.push(`prompt:${slug}`, `versions:${slug}`)

    // 먼저 비워서 다음에 열리는 화면이 옛 응답을 물려받지 않게 하고,
    clearNuxtData(keys)
    // 지금 화면에 떠 있는 것(사이드바 같은)은 곧바로 다시 읽는다.
    // 비우기만 하면 이미 붙어 있는 컴포넌트는 스스로 다시 부르지 않는다.
    await refreshNuxtData(keys)
  }

  return { invalidate }
}
