<script setup lang="ts">
const router = useRouter()
const sidebarOpen = ref(false)
const year = new Date().getFullYear()

function focusSearch() {
  const input = document.getElementById('sidebar-search') as HTMLInputElement | null
  if (!input) return

  // 좁은 화면에서는 검색창이 서랍 안에 접혀 있다. 서랍을 열면
  // 포커스 트랩이 검색창으로 커서를 옮겨 준다.
  if (!input.offsetParent) {
    sidebarOpen.value = true
    return
  }

  input.focus()
  input.select()
}

useShortcuts({
  '/': focusSearch,
  c: () => router.push('/prompts/new'),
})
</script>

<template>
  <div class="min-h-screen lg:flex">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar @toggle="sidebarOpen = !sidebarOpen" />

      <main class="flex-1 px-4 py-7 sm:px-8 sm:py-9">
        <slot />
      </main>

      <footer class="border-t border-slate-200 px-4 py-5 sm:px-8 dark:border-slate-800">
        <div class="flex flex-col gap-1.5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between dark:text-slate-500">
          <p class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span class="font-medium text-slate-500 dark:text-slate-400">Prism</span>
            · 좋은 프롬프트를 찾았다면 다듬어서 여기 올려 주세요.
            <span class="hidden items-center gap-1 lg:inline-flex">
              <kbd class="rounded border border-slate-200 px-1 py-px font-sans text-[10px] dark:border-slate-700">/</kbd>
              검색
              <kbd class="ml-1 rounded border border-slate-200 px-1 py-px font-sans text-[10px] dark:border-slate-700">C</kbd>
              새 문서
            </span>
          </p>
          <p>&copy; {{ year }} RosieOh. All rights reserved.</p>
        </div>
      </footer>
    </div>
  </div>
</template>
