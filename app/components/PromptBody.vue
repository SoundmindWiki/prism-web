<script setup lang="ts">
const props = defineProps<{
  body: string
  values?: Record<string, string>
}>()

interface Segment {
  text: string
  variable?: string
  filled?: boolean
}

/** 본문을 글자 조각과 {{변수}} 조각으로 나눈다. 변수는 눈에 띄게, 채워진 값은 다른 색으로. */
const segments = computed<Segment[]>(() => {
  const result: Segment[] = []
  const pattern = new RegExp(VARIABLE_PATTERN.source, 'g')
  let cursor = 0

  for (const match of props.body.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > cursor) result.push({ text: props.body.slice(cursor, index) })

    const name = match[1]!.trim()
    const value = props.values?.[name]?.trim()
    result.push({ text: value || match[0], variable: name, filled: Boolean(value) })
    cursor = index + match[0].length
  }

  if (cursor < props.body.length) result.push({ text: props.body.slice(cursor) })
  return result
})
</script>

<template>
  <div class="prompt-body">
    <template v-for="(segment, index) in segments" :key="index">
      <span
        v-if="segment.variable"
        class="prompt-variable"
        :class="{ 'prompt-variable--filled': segment.filled }"
        :title="segment.filled ? `${segment.variable} = ${segment.text}` : `채워야 할 변수: ${segment.variable}`"
      >{{ segment.text }}</span>
      <template v-else>{{ segment.text }}</template>
    </template>
  </div>
</template>
