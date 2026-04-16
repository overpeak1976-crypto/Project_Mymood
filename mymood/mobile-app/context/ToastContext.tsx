import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
}

interface ToastContextType {
  state: ToastState;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const timeoutRef = useRef<any>(null);

  const hideToast = useCallback(() => {
    setState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      message,
      type,
      isVisible: true,
    });

    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, 3000);
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ state, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
