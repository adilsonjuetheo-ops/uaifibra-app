import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  mensagem: string | null;
  tone: ToastTone;
}

export const useToastStore = create<ToastState>(() => ({
  mensagem: null,
  tone: 'success',
}));

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

export function showToast(mensagem: string, tone: ToastTone = 'success'): void {
  if (toastTimeout) clearTimeout(toastTimeout);
  useToastStore.setState({ mensagem, tone });
  toastTimeout = setTimeout(() => {
    useToastStore.setState({ mensagem: null });
  }, 3000);
}
