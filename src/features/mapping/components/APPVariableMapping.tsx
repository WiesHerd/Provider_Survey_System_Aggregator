import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  TrashIcon as DeleteSweepIcon,
  CheckIcon,
  XMarkIcon,
  VariableIcon,
  CalculatorIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAPPData } from '../../../hooks/useAPPData';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import LoadingSpinner from '../../../components/ui/loading-spinner';

interface APPVariableMapping {
  id: string;
  sourceVariable: string;
  targetVariable: string;
  calculationType: string;
  formula?: string;
  description: string;
  isCalculated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface APPVariableMappingProps {
  onMappingChange?: (mappings: APPVariableMapping[]) => void;
  onUnmappedChange?: (unmapped: string[]) => void;
}

/**
 * APPVariableMapping component - Manages APP variable mappings
 * Maps source survey variables to standardized APP data structure variables
 */
export const APPVariableMapping: React.FC<APPVariableMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  // State management
  const [mappings, setMappings] = useState<APPVariableMapping[]>([]);
  const [unmappedVariables, setUnmappedVariables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [newMapping, setNewMapping] = useState({
    sourceVariable: '',
    targetVariable: '',
    calculationType: 'direct',
    formula: '',
    description: '',
    isCalculated: false
  });

  // Services
  const { surveyData, loading: dataLoading } = useAPPData();

  // Default APP variable mappings
  const defaultMappings: APPVariableMapping[] = [
    {
      id: 'total-compensation-mapping',
      sourceVariable: 'Total Compensation',
      targetVariable: 'totalCompensation',
      calculationType: 'direct',
      description: 'Direct mapping of total compensation',
      isCalculated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'base-salary-mapping',
      sourceVariable: 'Base Salary',
      targetVariable: 'baseSalary',
      calculationType: 'direct',
      description: 'Direct mapping of base salary',
      isCalculated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'bonus-mapping',
      sourceVariable: 'Bonus',
      targetVariable: 'bonus',
      calculationType: 'direct',
      description: 'Direct mapping of bonus amount',
      isCalculated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'benefits-mapping',
      sourceVariable: 'Benefits',
      targetVariable: 'benefits',
      calculationType: 'direct',
      description: 'Direct mapping of benefits value',
      isCalculated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'productivity-bonus-mapping',
      sourceVariable: 'Productivity Bonus',
      targetVariable: 'productivityBonus',
      calculationType: 'calculated',
      formula: 'baseSalary * productivityMultiplier',
      description: 'Calculated productivity bonus based on base salary and productivity multiplier',
      isCalculated: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'fte-mapping',
      sourceVariable: 'FTE',
      targetVariable: 'fte',
      calculationType: 'direct',
      description: 'Direct mapping of full-time equivalent',
      isCalculated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'hours-per-week-mapping',
      sourceVariable: 'Hours per Week',
      targetVariable: 'hoursPerWeek',
      calculationType: 'direct',
      description: 'Direct mapping of hours worked per week',
      isCalculated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'patient-volume-mapping',
      sourceVariable: 'Patient Volume',
      targetVariable: 'patientVolume',
      calculationType: 'direct',
      description: 'Direct mapping of patient volume metrics',
      isCalculated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Load initial data
  useEffect(() => {
    loadMappings();
  }, []);

  // Update unmapped variables when survey data changes
  useEffect(() => {
    if (surveyData.length > 0) {
      updateUnmappedVariables();
    }
  }, [surveyData, mappings]);

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedVariables);
  }, [unmappedVariables, onUnmappedChange]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load from localStorage or use defaults
      const stored = localStorage.getItem('app_variable_mappings');
      if (stored) {
        const parsedMappings = JSON.parse(stored);
        setMappings(parsedMappings);
      } else {
        setMappings(defaultMappings);
        saveMappings(defaultMappings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mappings');
      setMappings(defaultMappings);
    } finally {
      setLoading(false);
    }
  };

  const saveMappings = (mappingsToSave: APPVariableMapping[]) => {
    try {
      localStorage.setItem('app_variable_mappings', JSON.stringify(mappingsToSave));
    } catch (err) {
      console.error('Failed to save mappings:', err);
    }
  };

  const updateUnmappedVariables = () => {
    // This would typically analyze uploaded survey variables
    // For now, we'll use a mock list of potential unmapped variables
    const potentialVariables = [
      'Years of Experience',
      'Education Level',
      'Board Certification',
      'Continuing Education Hours',
      'Quality Metrics',
      'Patient Satisfaction Score',
      'Outcome Measures',
      'Research Activities',
      'Teaching Hours',
      'Administrative Duties'
    ];

    const mappedSourceVariables = new Set(mappings.map(m => m.sourceVariable));
    const unmapped = potentialVariables.filter(variable => !mappedSourceVariables.has(variable));
    setUnmappedVariables(unmapped);
  };

  const handleCreateMapping = async () => {
    if (!newMapping.sourceVariable.trim() || !newMapping.targetVariable.trim()) return;

    try {
      const mapping: APPVariableMapping = {
        id: `mapping-${Date.now()}`,
        sourceVariable: newMapping.sourceVariable,
        targetVariable: newMapping.targetVariable,
        calculationType: newMapping.calculationType,
        formula: newMapping.formula,
        description: newMapping.description,
        isCalculated: newMapping.isCalculated,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMappings = [...mappings, mapping];
      setMappings(updatedMappings);
      saveMappings(updatedMappings);
      
      // Reset form
      setNewMapping({
        sourceVariable: '',
        targetVariable: '',
        calculationType: 'direct',
        formula: '',
        description: '',
        isCalculated: false
      });
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  };

  const handleUpdateMapping = async (id: string, updates: Partial<APPVariableMapping>) => {
    try {
      const updatedMappings = mappings.map(mapping => 
        mapping.id === id 
          ? { ...mapping, ...updates, updatedAt: new Date() }
          : mapping
      );
      setMappings(updatedMappings);
      saveMappings(updatedMappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mapping');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const updatedMappings = mappings.filter(mapping => mapping.id !== id);
      setMappings(updatedMappings);
      saveMappings(updatedMappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mapping');
    }
  };

  // Filter functions
  const filteredUnmapped = unmappedVariables.filter(variable =>
    variable.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMappings = mappings.filter(mapping =>
    mapping.sourceVariable.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
    mapping.targetVariable.toLowerCase().includes(mappedSearchTerm.toLowerCase())
  );

  // Get icon for calculation type
  const getCalculationTypeIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <VariableIcon className="h-5 w-5" />;
      case 'calculated':
        return <CalculatorIcon className="h-5 w-5" />;
      case 'aggregated':
        return <ChartBarIcon className="h-5 w-5" />;
      default:
        return <VariableIcon className="h-5 w-5" />;
    }
  };

  // Get color for calculation type
  const getCalculationTypeColor = (type: string) => {
    switch (type) {
      case 'direct':
        return 'bg-green-100 text-green-800';
      case 'calculated':
        return 'bg-blue-100 text-blue-800';
      case 'aggregated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Loading APP variable mappings..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XMarkIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadMappings}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdvancedErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">APP Variable Mapping</h2>
            <p className="mt-1 text-sm text-gray-600">
              Map survey variables to standardized APP data structure variables
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <AddIcon className="h-4 w-4 mr-2" />
            Add Mapping
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <VariableIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Mappings</dt>
                    <dd className="text-lg font-medium text-gray-900">{mappings.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalculatorIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Calculated Variables</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {mappings.filter(m => m.isCalculated).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unmapped Variables</dt>
                    <dd className="text-lg font-medium text-gray-900">{unmappedVariables.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Direct Mappings</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {mappings.filter(m => !m.isCalculated).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'unmapped', name: 'Unmapped Variables', count: unmappedVariables.length },
              { id: 'mapped', name: 'Mapped Variables', count: mappings.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'unmapped' && (
          <div className="space-y-4">
            <div className="flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search unmapped variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredUnmapped.map((variable) => (
                  <li key={variable} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{variable}</p>
                          <p className="text-sm text-gray-500">Unmapped variable</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewMapping(prev => ({
                            ...prev,
                            sourceVariable: variable
                          }));
                          setIsCreating(true);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <AddIcon className="h-4 w-4 mr-2" />
                        Map
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'mapped' && (
          <div className="space-y-4">
            <div className="flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search mapped variables..."
                value={mappedSearchTerm}
                onChange={(e) => setMappedSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredMappings.map((mapping) => (
                  <li key={mapping.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 text-gray-400">
                            {getCalculationTypeIcon(mapping.calculationType)}
                          </div>
                          <div className="ml-3">
                            <div className="flex items-center">
                              <h3 className="text-sm font-medium text-gray-900">
                                {mapping.sourceVariable} → {mapping.targetVariable}
                              </h3>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCalculationTypeColor(mapping.calculationType)}`}>
                                {mapping.calculationType}
                              </span>
                              {mapping.isCalculated && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Calculated
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{mapping.description}</p>
                            {mapping.formula && (
                              <p className="text-xs text-gray-400 mt-1">
                                Formula: {mapping.formula}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDeleteMapping(mapping.id)}
                          className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <DeleteSweepIcon className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Create Mapping Dialog */}
        {isCreating && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Variable Mapping</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source Variable</label>
                    <input
                      type="text"
                      value={newMapping.sourceVariable}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, sourceVariable: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Total Compensation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Variable</label>
                    <input
                      type="text"
                      value={newMapping.targetVariable}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, targetVariable: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., totalCompensation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Calculation Type</label>
                    <select
                      value={newMapping.calculationType}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, calculationType: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      aria-label="Select calculation type"
                    >
                      <option value="direct">Direct Mapping</option>
                      <option value="calculated">Calculated</option>
                      <option value="aggregated">Aggregated</option>
                    </select>
                  </div>

                  {newMapping.calculationType === 'calculated' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Formula</label>
                      <input
                        type="text"
                        value={newMapping.formula}
                        onChange={(e) => setNewMapping(prev => ({ ...prev, formula: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., baseSalary * productivityMultiplier"
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newMapping.isCalculated}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, isCalculated: e.target.checked }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      aria-label="Mark as calculated variable"
                    />
                    <label className="ml-2 block text-sm text-gray-900">Calculated variable</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newMapping.description}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      placeholder="Describe this variable mapping..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewMapping({
                        sourceVariable: '',
                        targetVariable: '',
                        calculationType: 'direct',
                        formula: '',
                        description: '',
                        isCalculated: false
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMapping}
                    disabled={!newMapping.sourceVariable.trim() || !newMapping.targetVariable.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Create Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdvancedErrorBoundary>
  );
};

export default APPVariableMapping;
