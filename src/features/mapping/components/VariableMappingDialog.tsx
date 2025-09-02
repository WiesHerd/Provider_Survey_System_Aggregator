import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { IVariableMapping, IUnmappedVariable, IVariableSource } from '../types/mapping';

interface VariableMappingDialogProps {
  isOpen: boolean;
  mapping?: IVariableMapping | null;
  unmappedVariables: IUnmappedVariable[];
  preSelectedVariables?: IUnmappedVariable[];
  onClose: () => void;
  onSave: (mapping: Partial<IVariableMapping>) => Promise<void>;
}

export const VariableMappingDialog: React.FC<VariableMappingDialogProps> = ({
  isOpen,
  mapping,
  unmappedVariables,
  preSelectedVariables = [],
  onClose,
  onSave
}) => {
  const [standardizedName, setStandardizedName] = useState('');
  const [variableType, setVariableType] = useState<'compensation' | 'categorical'>('compensation');
  const [variableSubType, setVariableSubType] = useState('');
  const [selectedVariables, setSelectedVariables] = useState<IUnmappedVariable[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize form when mapping or preSelectedVariables change
  useEffect(() => {
    if (mapping) {
      setStandardizedName(mapping.standardizedName);
      setVariableType(mapping.variableType);
      setVariableSubType(mapping.variableSubType || '');
      // Convert source variables back to unmapped variables for selection
      const mappedVariables = mapping.sourceVariables.map(source => ({
        id: `${source.surveySource}-${source.originalVariableName}`,
        name: source.originalVariableName,
        surveySource: source.surveySource,
        frequency: source.frequency || 0,
        variableType: mapping.variableType
      }));
      setSelectedVariables(mappedVariables);
    } else {
      setStandardizedName('');
      setVariableType('compensation');
      setVariableSubType('');
      // Initialize with pre-selected variables for new mappings
      setSelectedVariables(preSelectedVariables);
    }
  }, [mapping, preSelectedVariables]);

  const handleSave = async () => {
    if (!standardizedName.trim() || !variableType || !variableSubType.trim() || selectedVariables.length === 0) {
      alert('Please fill in all required fields and select at least one variable.');
      return;
    }

    setLoading(true);
    try {
      const sourceVariables: IVariableSource[] = selectedVariables.map(variable => ({
        id: crypto.randomUUID(),
        surveySource: variable.surveySource,
        originalVariableName: variable.name,
        frequency: variable.frequency
      }));

      await onSave({
        standardizedName,
        variableType,
        variableSubType,
        sourceVariables
      });
    } catch (error) {
      console.error('Failed to save variable mapping:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariableToggle = (variable: IUnmappedVariable) => {
    setSelectedVariables(prev => {
      const isSelected = prev.some(v => v.id === variable.id);
      if (isSelected) {
        return prev.filter(v => v.id !== variable.id);
      } else {
        return [...prev, variable];
      }
    });
  };

  const isVariableSelected = (variable: IUnmappedVariable) => 
    selectedVariables.some(v => v.id === variable.id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mapping ? 'Edit Variable Mapping' : 'Create Variable Mapping'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standardized Name *
                </label>
                <input
                  type="text"
                  value={standardizedName}
                  onChange={(e) => setStandardizedName(e.target.value)}
                  placeholder="e.g., tcc_variable, wrvu_variable"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variable Category *
                </label>
                <select
                  value={variableType}
                  onChange={(e) => setVariableType(e.target.value as 'compensation' | 'categorical')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="compensation">Compensation Variables</option>
                  <option value="categorical">Categorical Variables</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variable Sub-Type *
                </label>
                <select
                  value={variableSubType}
                  onChange={(e) => setVariableSubType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select sub-type...</option>
                  {variableType === 'compensation' && (
                    <>
                      <option value="tcc">TCC (Total Cash Compensation)</option>
                      <option value="wrvu">WRVU (Work RVU)</option>
                      <option value="cf">CF (Conversion Factor)</option>
                      <option value="bonus">Bonus</option>
                      <option value="quality">Quality</option>
                      <option value="stipend">Stipend</option>
                      <option value="retention">Retention</option>
                      <option value="call">Call</option>
                      <option value="admin">Administrative</option>
                      <option value="research">Research</option>
                    </>
                  )}
                  {variableType === 'categorical' && (
                    <>
                      <option value="region">Region</option>
                      <option value="providerType">Provider Type</option>
                      <option value="year">Year</option>
                      <option value="practiceType">Practice Type</option>
                      <option value="specialty">Specialty</option>
                      <option value="setting">Setting</option>
                    </>
                  )}
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Variable Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Select Variables to Map ({selectedVariables.length} selected)
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {unmappedVariables.map((variable) => (
                  <div
                    key={variable.id}
                    onClick={() => handleVariableToggle(variable)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      isVariableSelected(variable)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {variable.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {variable.surveySource} • {variable.frequency} occurrences
                        </p>
                      </div>
                      {isVariableSelected(variable) && (
                        <div className="ml-2 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {unmappedVariables.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No unmapped variables available. All variables may already be mapped.
                </p>
              )}
            </div>

            {/* Preview */}
            {selectedVariables.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Mapping Preview:</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>{standardizedName || 'Variable Name'}</strong> ({variableType || 'Type'})
                  </p>
                  <div className="space-y-1">
                    {selectedVariables.map((variable) => (
                      <div key={variable.id} className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-500">→</span>
                        <span className="font-medium">{variable.name}</span>
                        <span className="text-gray-500">({variable.surveySource})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !standardizedName.trim() || !variableType.trim() || selectedVariables.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving...' : (mapping ? 'Update Mapping' : 'Create Mapping')}
          </button>
        </div>
      </div>
    </div>
  );
};

