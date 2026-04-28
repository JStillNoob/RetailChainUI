<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue: boolean
  title: string
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  width: '480px'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
}>()

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) close()
}

onMounted(() => document.addEventListener('keydown', handleKey))
onUnmounted(() => document.removeEventListener('keydown', handleKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="ps-modal">
      <div v-if="modelValue" class="ps-modal-backdrop" @click="close">
        <div class="ps-modal-card" :style="{ maxWidth: width }" @click.stop>
          <div class="ps-modal-header">
            <h3 class="ps-modal-title">{{ title }}</h3>
            <button class="ps-modal-close" @click="close" aria-label="Close modal">
              <i class="ph ph-x"></i>
            </button>
          </div>
          <div class="ps-modal-body">
            <slot></slot>
          </div>
          <div class="ps-modal-footer" v-if="$slots.footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ps-modal-enter-active,
.ps-modal-leave-active {
  transition: opacity 0.18s ease;
}
.ps-modal-enter-active .ps-modal-card,
.ps-modal-leave-active .ps-modal-card {
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.ps-modal-enter-from,
.ps-modal-leave-to {
  opacity: 0;
}
.ps-modal-enter-from .ps-modal-card,
.ps-modal-leave-to .ps-modal-card {
  transform: scale(0.97) translateY(8px);
}
</style>
