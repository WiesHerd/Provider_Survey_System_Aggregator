import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AutoRegionMappingProps {
  isOpen: boolean;
  onClose: () => void;
  onAutoMap: (config: any) => Promise<void>;
  loading: boolean;
  title: string;
  description: string;
}

export const AutoRegionMapping: React.FC<AutoRegionMappingProps> = ({
  isOpen,
  onClose,
  onAutoMap,
  loading,
  title,
  description
}) => {
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAutoMap({
      similarityThreshold,
      algorithm: 'word-based'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-sm text-gray-600 mb-6">{description}</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Similarity Threshold
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 w-12">
                  {Math.round(similarityThreshold * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Higher values create more precise matches, lower values create more groupings.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Auto-Mapping...' : 'Start Auto-Mapping'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


