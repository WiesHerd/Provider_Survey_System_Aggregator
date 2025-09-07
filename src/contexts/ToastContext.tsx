import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ModernToastManager, { useModernToast } from '../components/ui/modern-toast-manager';

interface ToastContextType {
  success: (title: string, description?: string, duration?: number) => void;
  error: (title: string, description?: string, duration?: number) => void;
  warning: (title: string, description?: string, duration?: number) => void;
  info: (title: string, description?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const { toasts, success, error, warning, info, removeToast } = useModernToast();

  const contextValue: ToastContextType = {
    success: (title, description, duration) => {
      console.log('🍞 Toast success called:', { title, description, duration });
      success(title, description, duration);
    },
    error: (title, description, duration) => {
      console.log('🍞 Toast error called:', { title, description, duration });
      error(title, description, duration);
    },
    warning: (title, description, duration) => {
      console.log('🍞 Toast warning called:', { title, description, duration });
      warning(title, description, duration);
    },
    info: (title, description, duration) => {
      console.log('🍞 Toast info called:', { title, description, duration });
      info(title, description, duration);
    },
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ModernToastManager toasts={toasts} onRemoveToast={removeToast} />
    </ToastContext.Provider>
  );
};
