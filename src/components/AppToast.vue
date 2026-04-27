<script setup lang="ts">
import { useToast } from '../composables/useToast.ts'
const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-stack">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast-${t.type}`"
      >
        <i :class="{
          'ph ph-check-circle': t.type === 'success',
          'ph ph-x-circle':     t.type === 'error',
          'ph ph-info':         t.type === 'info',
          'ph ph-warning':      t.type === 'warning',
        }"></i>
        <span>{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  box-shadow: 0 8px 28px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06);
  pointer-events: auto;
  min-width: 260px;
  max-width: 380px;
  font-family: inherit;
}

.toast i { font-size: 18px; flex-shrink: 0; }

.toast-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.toast-error   { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.toast-info    { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.toast-warning { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(40px) scale(0.95); }
.toast-leave-to     { opacity: 0; transform: translateX(40px) scale(0.9); }
</style>
