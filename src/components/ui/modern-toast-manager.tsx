import React, { useState, useCallback } from 'react';
import ModernToast, { ModernToastProps } from './modern-toast';

export interface ToastOptions {
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastManagerProps {
  toasts: ModernToastProps[];
  onRemoveToast: (id: string) => void;
}

const ModernToastManager: React.FC<ToastManagerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 w-96 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="transform transition-all duration-300 ease-in-out"
          style={{
            transform: `translateY(${index * 8}px)`,
            zIndex: 1000 - index
          }}
        >
          <ModernToast
            {...toast}
            onClose={onRemoveToast}
          />
        </div>
      ))}
    </div>
  );
};

// Custom hook for managing toasts
export const useModernToast = () => {
  const [toasts, setToasts] = useState<ModernToastProps[]>([]);

  const addToast = useCallback((options: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ModernToastProps = {
      id,
      ...options,
      onClose: () => {} // Will be set by the component
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string, duration?: number) => {
    addToast({ title, description, type: 'success', duration });
  }, [addToast]);

  const error = useCallback((title: string, description?: string, duration?: number) => {
    addToast({ title, description, type: 'error', duration });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string, duration?: number) => {
    addToast({ title, description, type: 'warning', duration });
  }, [addToast]);

  const info = useCallback((title: string, description?: string, duration?: number) => {
    addToast({ title, description, type: 'info', duration });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    ToastManager: () => <ModernToastManager toasts={toasts} onRemoveToast={removeToast} />
  };
};

export default ModernToastManager;
