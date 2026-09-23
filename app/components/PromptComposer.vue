<script setup lang="ts">
import type { Prompt } from '~/types'

const props = defineProps<{ prompt: Prompt }>()

const { request } = useApi()
const { copied, failed, copy } = useClipboard()

// 변수별 입력값. 프롬프트가 바뀌면 (되돌리기 등) 새로 맞춘다.
const values = ref<Record<string, string>>({})

watch(
  () => props.prompt.variables,
  (variables) => {
    const next: Record<string, string> = {}
    for (const variable of variables) next[variable.name] = values.value[variable.name] ?? ''
    values.value = next
  },
  { immediate: true, deep: true },
)

const filledBody = computed(() => fillVariables(props.prompt.body, values.value))
const remaining = computed(() => props.prompt.variables.filter((variable) => !values.value[variable.name]?.trim()))

async function copyPrompt() {
  await copy(filledBody.value)

  // 복사 횟수는 이 위키에서 가장 정직한 인기 지표라 실패해도 조용히 넘긴다.
  try {
    await request(`/prompts/${encodeURIComponent(props.prompt.slug)}/copy`, { method: 'POST' })
  } catch {
    // 카운트가 안 올라가는 것으로 사용자를 방해하지 않는다.
  }
}

function clearValues() {
  values.value = Object.fromEntries(props.prompt.variables.map((variable) => [variable.name, '']))
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <h2 class="text-sm font-semibold">프롬프트</h2>

      <p v-if="prompt.variables.length" class="text-xs text-slate-400 dark:text-slate-500">
        <template v-if="remaining.length">
          변수 {{ remaining.length }}개를 채우면 그대로 붙여 넣을 수 있습니다
        </template>
        <template v-else>변수를 모두 채웠습니다</template>
      </p>

      <div class="ml-auto flex items-center gap-2">
        <button
          v-if="prompt.variables.length"
          type="button"
          class="rounded-lg px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          @click="clearValues"
        >
          입력값 비우기
        </button>

        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
          :class="copied ? 'bg-emerald-600' : failed ? 'bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'"
          @click="copyPrompt"
        >
          {{ copied ? '복사했습니다' : failed ? '복사 실패 — 직접 선택해 주세요' : '복사' }}
        </button>
      </div>
    </header>

    <div v-if="prompt.variables.length" class="grid gap-3 border-b border-slate-200 px-4 py-4 sm:grid-cols-2 dark:border-slate-800">
      <div v-for="variable in prompt.variables" :key="variable.name">
        <label :for="`variable-${variable.name}`" class="mb-1.5 block text-xs font-medium">
          <span class="rounded bg-amber-100 px-1 py-0.5 font-mono text-amber-900 dark:bg-amber-400/15 dark:text-amber-200">
            {{ variable.name }}
          </span>
          <span v-if="variable.description" class="ml-1.5 font-normal text-slate-400 dark:text-slate-500">
            {{ variable.description }}
          </span>
        </label>
        <textarea
          :id="`variable-${variable.name}`"
          v-model="values[variable.name]"
          rows="2"
          :placeholder="variable.example || '값을 입력하세요'"
          class="w-full resize-y rounded-xl bg-slate-100 px-3 py-2 text-[13px] placeholder:text-slate-400 focus:bg-white dark:bg-slate-800 dark:focus:bg-slate-950 transition-colors"
        />
      </div>
    </div>

    <div class="max-h-[32rem] overflow-auto px-4 py-4">
      <PromptBody :body="prompt.body" :values="values" />
    </div>
  </section>
</template>
