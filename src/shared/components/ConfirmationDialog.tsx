import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

/**
 * Enterprise-grade confirmation dialog component
 * Provides consistent confirmation UI across the entire application
 * 
 * @param isOpen - Whether the dialog is visible
 * @param onClose - Callback when dialog is closed
 * @param onConfirm - Callback when user confirms action
 * @param title - Dialog title
 * @param message - Dialog message
 * @param confirmText - Text for confirm button (default: "Confirm")
 * @param cancelText - Text for cancel button (default: "Cancel")
 * @param type - Dialog type for styling (default: "warning")
 * @param isLoading - Whether confirm action is in progress
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: ExclamationTriangleIcon,
          iconColor: 'text-red-600',
          iconBg: 'bg-red-100',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
          borderColor: 'border-red-200'
        };
      case 'warning':
        return {
          icon: ExclamationTriangleIcon,
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-100',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
          borderColor: 'border-amber-200'
        };
      case 'info':
        return {
          icon: InformationCircleIcon,
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-100',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
          borderColor: 'border-blue-200'
        };
      default:
        return {
          icon: ExclamationTriangleIcon,
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-100',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500 text-white',
          borderColor: 'border-amber-200'
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${styles.iconBg}`}>
                <IconComponent className={`h-6 w-6 ${styles.iconColor}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="Close dialog"
              disabled={isLoading}
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed">{message}</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmButton}`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
