import { useState, useCallback } from 'react';

export interface ConfirmationDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}

/**
 * Custom hook for managing confirmation dialogs
 * Provides a clean API for showing confirmation dialogs throughout the app
 */
export const useConfirmationDialog = () => {
  const [dialogState, setDialogState] = useState<ConfirmationDialogState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning'
  });

  const showConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: 'danger' | 'warning' | 'info';
      onCancel?: () => void;
    }
  ) => {
    setDialogState({
      isOpen: true,
      title,
      message,
      confirmText: options?.confirmText || 'Confirm',
      cancelText: options?.cancelText || 'Cancel',
      type: options?.type || 'warning',
      onConfirm,
      onCancel: options?.onCancel
    });
  }, []);

  const hideConfirmation = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (dialogState.onConfirm) {
      dialogState.onConfirm();
    }
    hideConfirmation();
  }, [dialogState.onConfirm, hideConfirmation]);

  const handleCancel = useCallback(() => {
    if (dialogState.onCancel) {
      dialogState.onCancel();
    }
    hideConfirmation();
  }, [dialogState.onCancel, hideConfirmation]);

  return {
    dialogState,
    showConfirmation,
    hideConfirmation,
    handleConfirm,
    handleCancel
  };
};
