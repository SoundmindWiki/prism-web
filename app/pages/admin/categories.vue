<script setup lang="ts">
useHead({ title: '백오피스 · 카테고리' })
</script>

<template>
  <TaxonomyManager
    endpoint="/admin/categories"
    resource-key="category"
    collection-key="categories"
    noun="카테고리"
    intro="팀·업무 단위로 나눕니다. 여기서 정한 순서와 계층이 사이드바에 그대로 보입니다."
    with-color
    keep-while-used
  />
</template>
