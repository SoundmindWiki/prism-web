<script setup lang="ts">
import type { Category } from '~/types'

const props = defineProps<{ category: Category }>()
const classes = computed(() => categoryStyle(props.category.color))
</script>

<template>
  <span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset" :class="classes">
    {{ category.name }}
  </span>
</template>
