import React, { useState } from 'react';
import { 
  BoltIcon, 
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { AutoMappingProps, IAutoMappingConfig } from '../types/mapping';

/**
 * AutoMapping component for the auto-mapping dialog
 * 
 * @param isOpen - Whether the dialog is open
 * @param onClose - Callback to close the dialog
 * @param onAutoMap - Callback to execute auto-mapping
 * @param loading - Whether auto-mapping is in progress
 */
export const AutoMapping: React.FC<AutoMappingProps> = ({ 
  isOpen, 
  onClose, 
  onAutoMap, 
  loading = false,
  title = "Auto-Map Specialties",
  description = "Configure automatic specialty mapping"
}) => {
  // Configuration state
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.7);
  const [useExistingMappings, setUseExistingMappings] = useState<boolean>(true);
  const [useFuzzyMatching, setUseFuzzyMatching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleAutoMap = async () => {
    try {
      setError(null);
      
      const config: IAutoMappingConfig = {
        confidenceThreshold,
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
              <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                <BoltIcon className="h-6 w-6 text-indigo-600" />
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
            {/* Description */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-sm text-indigo-800">
                Automatically map items based on similarity and existing mappings. 
                This will analyze unmapped items and suggest mappings with the specified confidence level.
              </p>
            </div>

                         {/* Configuration Section */}
             <div className="space-y-4">
              {/* Confidence Threshold */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Confidence Threshold</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Only create mappings with confidence above this threshold
                </p>
                
                                 <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Low (More mappings, less accurate)</span>
                    <span className="text-gray-500">High (Fewer mappings, more accurate)</span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      disabled={loading}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0.1</span>
                      <span>0.5</span>
                      <span>1.0</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {(confidenceThreshold * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                </div>
              </div>

                             {/* Mapping Options */}
               <div>
                 <h3 className="text-lg font-medium text-gray-900 mb-3">Mapping Options</h3>
                 <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useExistingMappings}
                      onChange={(e) => setUseExistingMappings(e.target.checked)}
                      disabled={loading}
                      className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">Use existing mappings as reference</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useFuzzyMatching}
                      onChange={(e) => setUseFuzzyMatching(e.target.checked)}
                      disabled={loading}
                      className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700">Enable fuzzy matching for similar names</span>
                  </label>
                </div>
              </div>

                             {/* Current Settings Summary */}
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                 <h4 className="text-sm font-medium text-gray-900 mb-2">Current Settings</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {(confidenceThreshold * 100).toFixed(0)}% Confidence
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    {useExistingMappings ? "Use existing mappings" : "Ignore existing mappings"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                    {useFuzzyMatching ? "Fuzzy matching enabled" : "Fuzzy matching disabled"}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

                     {/* Footer */}
           <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAutoMap}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <BoltIcon className="h-4 w-4 mr-2" />
                  Auto-Map Specialties
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Custom slider styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};
