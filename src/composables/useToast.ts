import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

// Module-level state — shared across all components
const toasts = ref<Toast[]>([])
let _next = 0

export function useToast() {
  function toast(message: string, type: ToastType = 'success', ms = 3500) {
    const id = ++_next
    toasts.value.push({ id, type, message })
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, ms)
  }

  return { toasts, toast }
}
