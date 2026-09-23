<script setup lang="ts">
useHead({ title: '백오피스 · 도메인' })
</script>

<template>
  <TaxonomyManager
    endpoint="/admin/domains"
    resource-key="domain"
    collection-key="domains"
    noun="도메인"
    intro="문서가 어느 업계에 쓰이는지 나눕니다. 한 문서에 여러 개를 달 수 있고, 상위를 고르면 하위 문서까지 함께 보입니다."
  />
</template>
