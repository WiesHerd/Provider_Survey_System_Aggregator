import React from 'react';
import { LightBulbIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SpecialtyMappingHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Help modal component for SpecialtyMapping
 * Extracted for better maintainability and reusability
 */
export const SpecialtyMappingHelp: React.FC<SpecialtyMappingHelpProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg">
                <LightBulbIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Specialty Mapping Help</h2>
                <p className="text-sm text-gray-500">Learn how to use specialty mapping effectively</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="Close help"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-900 mb-3">How Specialty Mapping Works</h4>
              <ul className="text-sm text-indigo-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-medium">•</span>
                  <span>Map specialty names from different surveys to standardized names</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-medium">•</span>
                  <span>Review and edit mappings in the "Mapped Specialties" tab</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-medium">•</span>
                  <span>Learned mappings are automatically created based on your patterns</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Key Features</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Manual Mapping</h5>
                  <p className="text-sm text-gray-600">Create precise mappings with full control over specialty matching</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Bulk Operations</h5>
                  <p className="text-sm text-gray-600">Select and map multiple specialties efficiently</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Learned Mappings</h5>
                  <p className="text-sm text-gray-600">System learns from your mapping patterns for future suggestions</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Search & Filter</h5>
                  <p className="text-sm text-gray-600">Quickly find specific specialties across all surveys</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
