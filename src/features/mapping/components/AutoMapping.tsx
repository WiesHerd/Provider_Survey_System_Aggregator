import React, { useState } from 'react';
import { 
  BoltIcon, 
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { AutoMappingProps, IAutoMappingConfig } from '../types/mapping';

/**
 * Modular AutoMapping component for all mapping screens
 * 
 * @param isOpen - Whether the dialog is open
 * @param onClose - Callback to close the dialog
 * @param onAutoMap - Callback to execute auto-mapping
 * @param loading - Whether auto-mapping is in progress
 * @param title - Modal title (default: "Auto-Map")
 * @param description - Modal description
 * @param iconColor - Icon background color (default: "indigo")
 * @param iconColorClass - Icon color class (default: "text-indigo-600")
 * @param bgColorClass - Icon background color class (default: "bg-indigo-100")
 */
export const AutoMapping: React.FC<AutoMappingProps> = ({ 
  isOpen, 
  onClose, 
  onAutoMap, 
  loading = false,
  title = "Auto-Map",
  description = "Intelligent mapping with learning",
  iconColor = "indigo",
  iconColorClass = "text-indigo-600",
  bgColorClass = "bg-indigo-100"
}) => {
  // Configuration state (simplified - no confidence thresholds)
  const [useExistingMappings, setUseExistingMappings] = useState<boolean>(true);
  const [useFuzzyMatching, setUseFuzzyMatching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleAutoMap = async () => {
    try {
      setError(null);
      
      const config: IAutoMappingConfig = {
        confidenceThreshold: 0, // No threshold - map everything
        useExistingMappings,
        useFuzzyMatching
      };

      await onAutoMap(config);
      onClose();
    } catch (err) {
      setError('Failed to process auto-mapping');
      console.error('Auto-mapping error:', err);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 ${bgColorClass} rounded-lg`}>
                <BoltIcon className={`h-6 w-6 ${iconColorClass}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              disabled={loading}
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Configuration Section */}
            <div className="space-y-4">
              {/* Learning System Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BoltIcon className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-medium text-gray-900">Intelligent Learning System</h3>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800 mb-2">
                    <strong>How it works:</strong>
                  </p>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Maps all specialties automatically (no thresholds)</li>
                    <li>• Learns from your corrections and manual mappings</li>
                    <li>• Gets smarter with each automap run</li>
                    <li>• Uses your expertise to improve accuracy</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> After automap, review and correct any wrong mappings. 
                    The system will learn from your corrections and be more accurate next time!
                  </p>
                </div>
              </div>

              

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAutoMap}
              disabled={loading}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white ${iconColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-700' : iconColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${iconColor === 'indigo' ? 'focus:ring-indigo-500' : iconColor === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-purple-500'} transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <BoltIcon className="h-4 w-4 mr-2" />
              {loading ? 'Processing...' : 'Start Auto-Mapping'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${iconColor === 'indigo' ? '#6366f1' : iconColor === 'blue' ? '#3b82f6' : '#8b5cf6'};
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${iconColor === 'indigo' ? '#6366f1' : iconColor === 'blue' ? '#3b82f6' : '#8b5cf6'};
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
