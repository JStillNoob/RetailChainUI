import { ref } from 'vue'

interface ConfirmState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  confirmColor: string
  resolve: (value: boolean) => void
}

const state = ref<ConfirmState>({
  isOpen: false,
  title: 'Confirm',
  message: '',
  confirmText: 'Confirm',
  confirmColor: 'bg-red-600 hover:bg-red-700',
  resolve: () => {}
})

export function useConfirm() {
  function confirmDialog(
    message: string, 
    options?: { title?: string, confirmText?: string, confirmColor?: string }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = {
        isOpen: true,
        title: options?.title || 'Are you sure?',
        message,
        confirmText: options?.confirmText || 'Confirm',
        confirmColor: options?.confirmColor || 'ps-btn-primary', // Tailwind classes or PS buttons
        resolve
      }
    })
  }

  function handleAction(result: boolean) {
    state.value.isOpen = false
    state.value.resolve(result)
  }

  return { state, confirmDialog, handleAction }
}
