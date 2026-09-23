<template>
  <!-- PromptCard 와 같은 껍데기·같은 여백. 내용이 도착해도 자리가 움직이지 않는다. -->
  <div
    class="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
    aria-hidden="true"
  >
    <div class="skeleton h-4 w-20 rounded-md" />
    <div class="skeleton mt-3 h-4 w-3/4" />
    <div class="skeleton mt-2.5 h-3 w-full" />
    <div class="skeleton mt-1.5 h-3 w-5/6" />
    <div class="mt-3 flex gap-1">
      <div class="skeleton h-4 w-12 rounded-md" />
      <div class="skeleton h-4 w-16 rounded-md" />
    </div>
    <div class="mt-auto flex items-center gap-2 pt-3.5">
      <div class="skeleton h-3 flex-1" />
      <div class="skeleton h-3 w-8" />
    </div>
  </div>
</template>
