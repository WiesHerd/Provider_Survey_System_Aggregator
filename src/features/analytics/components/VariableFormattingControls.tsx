/**
 * Enhanced Variable Formatting Controls Component
 * 
 * Modern, app-consistent design for configuring variable formatting
 */

import React, { useState, useEffect } from 'react';
import { Cog6ToothIcon, TrashIcon } from '@heroicons/react/24/outline';

interface VariableFormattingRule {
  variableName: string;
  displayName: string;
  formatType: 'currency' | 'number' | 'percentage';
  decimals: number;
  showCurrency: boolean;
  enabled: boolean;
}

interface VariableFormattingControlsProps {
  variables: string[];
  onFormattingChange: (rules: VariableFormattingRule[]) => void;
  currentRules?: VariableFormattingRule[];
  open?: boolean;
  onClose?: () => void;
}

/**
 * Enhanced Variable Formatting Controls Component
 * 
 * Modern design that matches the app's aesthetic
 */
export const VariableFormattingControls: React.FC<VariableFormattingControlsProps> = ({
  variables,
  onFormattingChange,
  currentRules = [],
  open: controlledOpen,
  onClose: onControlledClose
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onControlledClose ? onControlledClose : setInternalOpen;
  const [rules, setRules] = useState<VariableFormattingRule[]>([]);

  // Initialize rules from props or create defaults
  useEffect(() => {
    if (currentRules.length > 0) {
      setRules(currentRules);
    } else {
      const defaultRules = variables.slice(0, 3).map(variable => ({
        variableName: variable,
        displayName: formatVariableDisplayName(variable),
        formatType: detectFormatType(variable),
        decimals: 0,
        showCurrency: detectFormatType(variable) === 'currency',
        enabled: true
      }));
      setRules(defaultRules);
    }
  }, [currentRules, variables]);

  const handleRuleChange = (index: number, field: keyof VariableFormattingRule, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    
    // Fix logical inconsistency: disable showCurrency for percentage
    if (field === 'formatType' && value === 'percentage') {
      newRules[index].showCurrency = false;
    }
    
    setRules(newRules);
    onFormattingChange(newRules);
  };


  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    onFormattingChange(newRules);
  };

  const handleResetToDefaults = () => {
    const defaultRules = variables.slice(0, 3).map(variable => ({
      variableName: variable,
      displayName: formatVariableDisplayName(variable),
      formatType: detectFormatType(variable),
      decimals: 0,
      showCurrency: detectFormatType(variable) === 'currency',
      enabled: true
    }));
    setRules(defaultRules);
    onFormattingChange(defaultRules);
  };


  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white focus:ring-green-500"
      >
        <Cog6ToothIcon className="w-4 h-4 mr-2" />
        Format Variables
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setOpen(false)}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Variable Formatting</h2>
                <p className="text-gray-600">Configure how existing variables are displayed in the analytics table</p>
              </div>
              
              {/* Content */}
              <div className="px-8 py-6 max-h-96 overflow-y-auto">
                {/* Formatting Rules Section */}
                <div className="mb-6">
                   <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-semibold text-gray-900">
                       Formatting Rules ({rules.length})
                     </h3>
                     <button
                       onClick={handleResetToDefaults}
                       className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                     >
                       Reset to Defaults
                     </button>
                   </div>

                  {rules.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-500 text-lg mb-2">No formatting rules configured</div>
                      <p className="text-gray-400">Variables will appear here after uploading survey data</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {rules.map((rule, index) => (
         <div
           key={`${rule.variableName}-${index}`}
           className={`bg-white border rounded-xl p-6 transition-all ${
             rule.enabled
               ? 'border-gray-300 shadow-sm hover:shadow-md'
               : 'border-gray-200 bg-gray-50'
           }`}
         >
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {rule.displayName}
                              </h4>
                            </div>
                             <button
                               onClick={() => handleRemoveRule(index)}
                               className="text-red-600 hover:text-red-800 p-2 rounded-xl hover:bg-red-50 transition-colors"
                               aria-label={`Remove ${rule.displayName}`}
                             >
                               <TrashIcon className="h-4 w-4" />
                             </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Format Type
                              </label>
         <select
           value={rule.formatType}
           onChange={(e) => handleRuleChange(index, 'formatType', e.target.value)}
           className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
           aria-label={`Format type for ${rule.displayName}`}
         >
                                <option value="number">Number</option>
                                <option value="currency">Currency</option>
                                <option value="percentage">Percentage</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Decimals
                              </label>
         <input
           type="number"
           min="0"
           max="4"
           value={rule.decimals}
           onChange={(e) => handleRuleChange(index, 'decimals', parseInt(e.target.value) || 0)}
           className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
           aria-label={`Number of decimals for ${rule.displayName}`}
         />
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Enabled</label>
         <button
           onClick={() => handleRuleChange(index, 'enabled', !rule.enabled)}
           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
             rule.enabled ? 'bg-gray-500' : 'bg-gray-200'
           }`}
           aria-label={`Toggle enabled for ${rule.displayName}`}
         >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      rule.enabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Show Currency</label>
         <button
           onClick={() => handleRuleChange(index, 'showCurrency', !rule.showCurrency)}
           disabled={rule.formatType === 'percentage'}
           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
             rule.showCurrency && rule.formatType !== 'percentage'
               ? 'bg-gray-500'
               : 'bg-gray-200'
           } ${rule.formatType === 'percentage' ? 'opacity-50 cursor-not-allowed' : ''}`}
           aria-label={`Toggle show currency for ${rule.displayName}`}
         >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                      rule.showCurrency && rule.formatType !== 'percentage' 
                                        ? 'translate-x-6' 
                                        : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

               {/* Footer */}
               <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                 <button
                   onClick={() => setOpen(false)}
                   className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={() => setOpen(false)}
                   className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                 >
                   Apply Formatting
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper functions
const formatVariableDisplayName = (variableName: string): string => {
  return variableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\bTcc\b/g, 'TCC')
    .replace(/\bRvu\b/g, 'RVU')
    .replace(/\bCf\b/g, 'CF');
};

const detectFormatType = (variableName: string): 'currency' | 'number' | 'percentage' => {
  const lowerName = variableName.toLowerCase();
  if (lowerName.includes('percentage') || lowerName.includes('percent')) {
    return 'percentage';
  }
  if (lowerName.includes('salary') || lowerName.includes('compensation') || lowerName.includes('tcc') || lowerName.includes('cf')) {
    return 'currency';
  }
  return 'number';
};