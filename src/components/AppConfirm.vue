<script setup lang="ts">
import AppModal from './AppModal.vue'
import { useConfirm } from '../composables/useConfirm'

const { state, handleAction } = useConfirm()
</script>

<template>
  <AppModal v-model="state.isOpen" :title="state.title" width="400px" @close="handleAction(false)">
    <div class="text-slate-600 leading-relaxed text-[15px] pb-6 pt-2">
      {{ state.message }}
    </div>
    <template #footer>
      <div class="flex items-center justify-end gap-3 w-full">
        <button class="px-4 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                @click="handleAction(false)">
          Cancel
        </button>
        <button :class="['px-5 py-2 rounded-lg font-bold text-white transition-all shadow-sm', state.confirmColor]"
                @click="handleAction(true)">
          {{ state.confirmText }}
        </button>
      </div>
    </template>
  </AppModal>
</template>
