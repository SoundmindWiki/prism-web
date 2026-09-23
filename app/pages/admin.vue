<script setup lang="ts">
// /admin 아래 화면들의 공통 껍데기. 자식 라우트는 아래 NuxtPage 에 들어간다.
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <AdminNav />
    <NuxtPage />
  </div>
</template>
