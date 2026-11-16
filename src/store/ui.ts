import { create } from 'zustand'
import { uid } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Toasts:  toast.success('Saved')                                      */
/* ------------------------------------------------------------------ */

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  // At most 4 on screen. The Toaster (components/ui/Feedback.tsx) auto-dismisses each one and pauses
  // while a toast is hovered or focused, so there is no timer here.
  push: (t) => {
    const id = uid('tst')
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ tone: 'success', title, description }),
  error: (title: string, description?: string) => useToastStore.getState().push({ tone: 'error', title, description }),
  info: (title: string, description?: string) => useToastStore.getState().push({ tone: 'info', title, description }),
}

/* ------------------------------------------------------------------ */
/* Confirm dialog:  if (await confirmDialog({ title: 'Delete?' })) … */
/* ------------------------------------------------------------------ */

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions | null
  resolve: ((ok: boolean) => void) | null
  ask: (o: ConfirmOptions) => Promise<boolean>
  close: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      get().resolve?.(false)
      set({ open: true, options, resolve })
    }),
  close: (ok) => {
    get().resolve?.(ok)
    set({ open: false, resolve: null })
  },
}))

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().ask(options)
}
