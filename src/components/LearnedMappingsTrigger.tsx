/**
 * Learned Mappings Trigger Component
 * 
 * This component provides a UI to manually trigger the application of learned mappings
 * to existing survey data. Since the auto-map system was removed, this gives users
 * a way to apply their learned mappings to new or existing data.
 */

import React, { useState } from 'react';
import { PlayIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { learnedMappingsService, LearnedMappingApplicationResult } from '../services/LearnedMappingsService';

interface LearnedMappingsTriggerProps {
  onComplete?: (results: { specialty: LearnedMappingApplicationResult; column: LearnedMappingApplicationResult }) => void;
}

const LearnedMappingsTrigger: React.FC<LearnedMappingsTriggerProps> = ({ onComplete }) => {
  const [isApplying, setIsApplying] = useState(false);
  const [results, setResults] = useState<{ specialty: LearnedMappingApplicationResult; column: LearnedMappingApplicationResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApplyMappings = async () => {
    setIsApplying(true);
    setError(null);
    setResults(null);

    try {
      console.log('🔍 LearnedMappingsTrigger: Starting learned mappings application...');
      const results = await learnedMappingsService.applyAllLearnedMappings();
      
      setResults(results);
      onComplete?.(results);
      
      console.log('🔍 LearnedMappingsTrigger: Learned mappings application completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply learned mappings';
      setError(errorMessage);
      console.error('🔍 LearnedMappingsTrigger: Error applying learned mappings:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const formatResults = (result: LearnedMappingApplicationResult, type: string) => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h4 className="font-semibold text-gray-900 mb-2 capitalize">{type} Mappings</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Rows Processed:</span>
            <span className="ml-2 font-medium">{result.totalRowsProcessed.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-600">Mappings Applied:</span>
            <span className="ml-2 font-medium text-green-600">{result.mappingsApplied.toLocaleString()}</span>
          </div>
        </div>
        
        {Object.keys(result.specialtiesUpdated).length > 0 && (
          <div className="mt-3">
            <span className="text-gray-600 text-sm">Updated Items:</span>
            <div className="mt-1 max-h-32 overflow-y-auto">
              {Object.entries(result.specialtiesUpdated).map(([item, count]) => (
                <div key={item} className="flex justify-between text-xs text-gray-600">
                  <span className="truncate">{item}</span>
                  <span className="ml-2 font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {result.errors.length > 0 && (
          <div className="mt-3">
            <span className="text-red-600 text-sm font-medium">Errors:</span>
            <div className="mt-1 max-h-20 overflow-y-auto">
              {result.errors.map((error, index) => (
                <div key={index} className="text-xs text-red-600">{error}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Apply Learned Mappings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Apply your learned mappings to create new mapped specialties. Your learned mappings will remain available for future use.
          </p>
        </div>
        
        <button
          onClick={handleApplyMappings}
          disabled={isApplying}
          className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isApplying
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
          }`}
        >
          {isApplying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 mr-2"></div>
              Applying...
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4 mr-2" />
              Apply Mappings
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {results && (
        <div className="mt-4">
          <div className="flex items-center mb-4">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-800 font-medium">Learned Mappings Applied Successfully</span>
          </div>
          
          {formatResults(results.specialty, 'Specialty')}
          {formatResults(results.column, 'Column')}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This will apply all your learned mappings to existing survey data. 
          The process may take a few minutes depending on the amount of data. 
          Make sure to backup your data before proceeding.
        </p>
      </div>
    </div>
  );
};

export default LearnedMappingsTrigger;
