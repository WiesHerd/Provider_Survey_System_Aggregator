/**
 * Updated AutoMapping component that uses the new deterministic mapping engine
 */

import React, { useState } from 'react';
import { 
  BoltIcon, 
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { AutoMappingProps } from '../../features/mapping/types/mapping';
import { useNewMappingEngine, NewMappingEngineConfig } from './useNewMappingEngine';

/**
 * Enhanced AutoMapping component with the new deterministic engine
 */
export const NewAutoMapping: React.FC<AutoMappingProps & {
  /** Source identifier for the current survey */
  source: string;
  /** Callback when auto-mapping completes with results */
  onAutoMapComplete?: (results: any) => void;
}> = ({ 
  isOpen, 
  onClose, 
  onAutoMap, 
  loading = false,
  title = "Auto-Map with New Engine",
  description = "Configure automatic mapping using the deterministic engine",
  iconColor = "indigo",
  iconColorClass = "text-indigo-600",
  bgColorClass = "bg-indigo-100",
  source,
  onAutoMapComplete
}) => {
  // Configuration state
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.68);
  const [useExistingMappings, setUseExistingMappings] = useState<boolean>(true);
  const [useFuzzyMatching, setUseFuzzyMatching] = useState<boolean>(true);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Initialize the new mapping engine
  const newMappingConfig: NewMappingEngineConfig = {
    source,
    confidenceThreshold,
    useExistingMappings,
    useFuzzyMatching
  };

  const {
    isAutoMapping: isNewEngineMapping,
    error: newEngineError,
    autoMapSpecialties: newAutoMapSpecialties,
    updateConfig
  } = useNewMappingEngine(newMappingConfig);

  // Update config when settings change
  React.useEffect(() => {
    updateConfig({
      confidenceThreshold,
      useExistingMappings,
      useFuzzyMatching
    });
  }, [confidenceThreshold, useExistingMappings, useFuzzyMatching, updateConfig]);

  const handleAutoMap = async () => {
    try {
      // For now, we'll call the old onAutoMap callback
      // In a full integration, you'd replace this with the new engine
      const config = {
        confidenceThreshold,
        useExistingMappings,
        useFuzzyMatching
      };

      await onAutoMap(config);
      
      // If you have access to unmapped specialties, you could do:
      // const results = await newAutoMapSpecialties(unmappedSpecialties);
      // onAutoMapComplete?.(results);
      
    } catch (error) {
      console.error('Auto-mapping failed:', error);
    }
  };

  const confidenceLevels = [
    { value: 0.55, label: 'Aggressive (55%)', description: 'Maps more specialties but may have lower accuracy' },
    { value: 0.68, label: 'Balanced (68%)', description: 'Good balance of accuracy and coverage' },
    { value: 0.80, label: 'Conservative (80%)', description: 'High accuracy but fewer auto-mappings' },
    { value: 0.90, label: 'Very Conservative (90%)', description: 'Very high accuracy, minimal auto-mappings' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <BoltIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* New Engine Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <InformationCircleIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Deterministic Mapping Engine</h4>
                <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                  Advanced AI-powered mapping with strict domain barriers and subspecialty preservation.
                </p>
              </div>
            </div>
          </div>

          {/* Confidence Threshold */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-gray-900">
                Confidence Level
              </label>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <InformationCircleIcon className="h-4 w-4" />
              </button>
            </div>
            
            {showHelp && (
              <div className="mb-4 p-4 bg-gray-50/80 rounded-xl border border-gray-200/50">
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Confidence Levels:</h5>
                <div className="space-y-3">
                  {confidenceLevels.map(level => (
                    <div key={level.value} className="text-sm">
                      <span className="font-medium text-gray-900">{level.label}:</span>
                      <span className="text-gray-600 ml-2">{level.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {confidenceLevels.map(level => (
                <label key={level.value} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors duration-200 cursor-pointer">
                  <input
                    type="radio"
                    name="confidence"
                    value={level.value}
                    checked={confidenceThreshold === level.value}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{level.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{level.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm font-semibold text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50/80 transition-all duration-200"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              <span>Advanced Options</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pl-6 border-l-2 border-blue-200">
                <label className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors duration-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useExistingMappings}
                    onChange={(e) => setUseExistingMappings(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Use Existing Mappings</span>
                    <p className="text-xs text-gray-500 mt-0.5">Reference previously mapped specialties for better accuracy</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors duration-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFuzzyMatching}
                    onChange={(e) => setUseFuzzyMatching(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Fuzzy Matching</span>
                    <p className="text-xs text-gray-500 mt-0.5">Use advanced string similarity algorithms</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Error Display */}
          {newEngineError && (
            <div className="bg-red-50/80 border border-red-200/50 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Error</h4>
                  <p className="text-sm text-red-700 mt-1">{newEngineError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Current Settings Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100/80 border border-gray-200/50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Configuration Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Source:</span>
                <span className="font-medium text-gray-900">{source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confidence:</span>
                <span className="font-medium text-gray-900">{(confidenceThreshold * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Existing Mappings:</span>
                <span className="font-medium text-gray-900">{useExistingMappings ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fuzzy Matching:</span>
                <span className="font-medium text-gray-900">{useFuzzyMatching ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAutoMap}
            disabled={loading || isNewEngineMapping}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 border border-transparent rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading || isNewEngineMapping ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <BoltIcon className="h-4 w-4" />
                <span>Start Auto-Mapping</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
