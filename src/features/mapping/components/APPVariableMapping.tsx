import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  TrashIcon as DeleteSweepIcon,
  CheckIcon,
  XMarkIcon,
  VariableIcon,
  CalculatorIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useAPPData } from '../../../hooks/useAPPData';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import { EnterpriseLoadingSpinner } from '../../../shared/components';
import { getDataService } from '../../../services/DataService';

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
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  const [learnedSearchTerm, setLearnedSearchTerm] = useState('');

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
      
      // Load from DataService or use defaults
      const dataService = getDataService();
      const stored = await dataService.getUserPreference('app_variable_mappings');
      
      if (stored && Array.isArray(stored)) {
        // Convert date strings back to Date objects
        const parsedMappings = stored.map((mapping: any) => ({
          ...mapping,
          createdAt: mapping.createdAt ? new Date(mapping.createdAt) : new Date(),
          updatedAt: mapping.updatedAt ? new Date(mapping.updatedAt) : new Date()
        }));
        setMappings(parsedMappings);
      } else {
        setMappings(defaultMappings);
        await saveMappings(defaultMappings);
      }
    } catch (err) {
      console.error('Failed to load mappings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mappings');
      setMappings(defaultMappings);
    } finally {
      setLoading(false);
    }
  };

  const saveMappings = async (mappingsToSave: APPVariableMapping[]) => {
    try {
      const dataService = getDataService();
      await dataService.saveUserPreference('app_variable_mappings', mappingsToSave);
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
      await saveMappings(updatedMappings);
      
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
      await saveMappings(updatedMappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mapping');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const updatedMappings = mappings.filter(mapping => mapping.id !== id);
      setMappings(updatedMappings);
      await saveMappings(updatedMappings);
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
      <EnterpriseLoadingSpinner
        message="Loading APP variable mappings..."
        recordCount="auto"
        data={mappings}
        variant="overlay"
        loading={loading || dataLoading}
      />
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

        {/* Tabs - Match SpecialtyMapping Pattern */}
        <div className="border-b border-gray-200 mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => {/* Add help functionality */}}
              className="p-2 mr-3 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label="Show help"
            >
              <LightBulbIcon className="h-5 w-5 text-indigo-600" />
            </button>
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'unmapped', label: `Unmapped Variables (${unmappedVariables.length})` },
                { key: 'mapped', label: `Mapped Variables (${mappings.length})` },
                { key: 'learned', label: `Learned Mappings (${Object.keys(learnedMappings).length})` }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'unmapped' | 'mapped' | 'learned')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Action Buttons - Match SpecialtyMapping Pattern */}
          <div className="flex items-center space-x-3 mb-4">
            {activeTab === 'unmapped' && (
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600"
              >
                <AddIcon className="h-4 w-4 mr-2" />
                Add Mapping
              </button>
            )}
            {activeTab === 'mapped' && (
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to clear all variable mappings?')) {
                    setMappings([]);
                    await saveMappings([]);
                  }
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
              >
                <DeleteSweepIcon className="h-4 w-4 mr-2" />
                Clear All
              </button>
            )}
            {activeTab === 'learned' && (
              <>
                <button
                  onClick={() => {
                    // Apply all learned mappings
                    console.log('Apply all learned variable mappings');
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600"
                  title="Convert all learned mappings to permanent mappings"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Apply All ({Object.keys(learnedMappings).length})
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all learned mappings?')) {
                      setLearnedMappings({});
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                  title="Delete all learned mappings (this action cannot be undone)"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Clear All
                </button>
              </>
            )}
          </div>
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

        {/* Learned Tab Content - Match SpecialtyMapping Pattern */}
        {activeTab === 'learned' && (
          <div className="space-y-4">
            <div className="flex-1 max-w-lg">
              <input
                type="text"
                placeholder="Search learned mappings..."
                value={learnedSearchTerm}
                onChange={(e) => setLearnedSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {Object.keys(learnedMappings).length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {Object.entries(learnedMappings)
                    .filter(([key, value]) => 
                      key.toLowerCase().includes(learnedSearchTerm.toLowerCase()) ||
                      value.toLowerCase().includes(learnedSearchTerm.toLowerCase())
                    )
                    .map(([original, corrected]) => (
                    <li key={original} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {original} → {corrected}
                            </h3>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Learned
                            </span>
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-500">Auto-learned mapping from user corrections</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Apply this learned mapping
                              console.log('Apply learned mapping:', original, corrected);
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Apply
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Remove this learned mapping?')) {
                                const updated = { ...learnedMappings };
                                delete updated[original];
                                setLearnedMappings(updated);
                              }
                            }}
                            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <BoltIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learned Mappings Found</h3>
                    <p className="text-gray-600 mb-4">
                      {learnedSearchTerm 
                        ? 'No learned mappings match your search criteria.'
                        : 'Learned mappings will appear here as you make corrections to variable mappings.'
                      }
                    </p>
                  </div>
                </div>
              )}
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
