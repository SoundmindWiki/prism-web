<script setup lang="ts">
const { restore: restoreTheme } = useTheme()

onMounted(restoreTheme)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- 레이아웃 밖에 둬야 로그인 화면(blank)에서도 같은 자리에 뜬다. -->
  <AppToaster />
  <ConfirmDialog />
</template>
