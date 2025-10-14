import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  TrashIcon as DeleteSweepIcon,
  CheckIcon,
  XMarkIcon,
  TableCellsIcon,
  DocumentTextIcon,
  BoltIcon,
  LightBulbIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  MagnifyingGlassIcon as SearchIcon
} from '@heroicons/react/24/outline';
import {
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { useAPPData } from '../../../hooks/useAPPData';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import { AnalysisProgressBar } from '../../../shared/components';

interface APPColumnMapping {
  id: string;
  sourceColumn: string;
  targetColumn: string;
  dataType: string;
  isRequired: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface APPColumnMappingProps {
  onMappingChange?: (mappings: APPColumnMapping[]) => void;
  onUnmappedChange?: (unmapped: string[]) => void;
}

/**
 * APPColumnMapping component - Manages APP column mappings
 * Maps source survey columns to standardized APP data structure columns
 */
export const APPColumnMapping: React.FC<APPColumnMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  // State management
  const [mappings, setMappings] = useState<APPColumnMapping[]>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<string[]>([]);
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
    sourceColumn: '',
    targetColumn: '',
    dataType: 'string',
    isRequired: false,
    description: ''
  });

  // Services
  const { surveyData, loading: dataLoading } = useAPPData();

  // Default APP column mappings
  const defaultMappings: APPColumnMapping[] = [
    {
      id: 'provider-type-mapping',
      sourceColumn: 'Provider Type',
      targetColumn: 'providerType',
      dataType: 'string',
      isRequired: true,
      description: 'APP provider type (NP, PA, CRNA, etc.)',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'specialty-mapping',
      sourceColumn: 'Specialty',
      targetColumn: 'specialty',
      dataType: 'string',
      isRequired: true,
      description: 'APP specialty or subspecialty',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'certification-mapping',
      sourceColumn: 'Certification',
      targetColumn: 'certification',
      dataType: 'string',
      isRequired: true,
      description: 'APP certification type',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'practice-setting-mapping',
      sourceColumn: 'Practice Setting',
      targetColumn: 'practiceSetting',
      dataType: 'string',
      isRequired: false,
      description: 'APP practice setting (Hospital, Clinic, etc.)',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'supervision-level-mapping',
      sourceColumn: 'Supervision Level',
      targetColumn: 'supervisionLevel',
      dataType: 'string',
      isRequired: false,
      description: 'APP supervision level (Independent, Supervised, etc.)',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'billing-level-mapping',
      sourceColumn: 'Billing Level',
      targetColumn: 'billingLevel',
      dataType: 'string',
      isRequired: false,
      description: 'APP billing level',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'region-mapping',
      sourceColumn: 'Region',
      targetColumn: 'region',
      dataType: 'string',
      isRequired: true,
      description: 'Geographic region',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'compensation-mapping',
      sourceColumn: 'Total Compensation',
      targetColumn: 'totalCompensation',
      dataType: 'number',
      isRequired: true,
      description: 'Total compensation amount',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Load initial data
  useEffect(() => {
    loadMappings();
  }, []);

  // Update unmapped columns when survey data changes
  useEffect(() => {
    if (surveyData.length > 0) {
      updateUnmappedColumns();
    }
  }, [surveyData, mappings]);

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedColumns);
  }, [unmappedColumns, onUnmappedChange]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load from localStorage or use defaults
      const stored = localStorage.getItem('app_column_mappings');
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

  const saveMappings = (mappingsToSave: APPColumnMapping[]) => {
    try {
      localStorage.setItem('app_column_mappings', JSON.stringify(mappingsToSave));
    } catch (err) {
      console.error('Failed to save mappings:', err);
    }
  };

  const updateUnmappedColumns = () => {
    // This would typically analyze uploaded survey headers
    // For now, we'll use a mock list of potential unmapped columns
    const potentialColumns = [
      'Provider Name',
      'Provider ID',
      'Years Experience',
      'Hours Worked',
      'Patient Volume',
      'Productivity Metrics',
      'Benefits',
      'Bonus',
      'Other Compensation'
    ];

    const mappedSourceColumns = new Set(mappings.map(m => m.sourceColumn));
    const unmapped = potentialColumns.filter(col => !mappedSourceColumns.has(col));
    setUnmappedColumns(unmapped);
  };

  const handleCreateMapping = async () => {
    if (!newMapping.sourceColumn.trim() || !newMapping.targetColumn.trim()) return;

    try {
      const mapping: APPColumnMapping = {
        id: `mapping-${Date.now()}`,
        sourceColumn: newMapping.sourceColumn,
        targetColumn: newMapping.targetColumn,
        dataType: newMapping.dataType,
        isRequired: newMapping.isRequired,
        description: newMapping.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMappings = [...mappings, mapping];
      setMappings(updatedMappings);
      saveMappings(updatedMappings);
      
      // Reset form
      setNewMapping({
        sourceColumn: '',
        targetColumn: '',
        dataType: 'string',
        isRequired: false,
        description: ''
      });
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  };

  const handleUpdateMapping = async (id: string, updates: Partial<APPColumnMapping>) => {
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
  const filteredUnmapped = unmappedColumns.filter(column =>
    column.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMappings = mappings.filter(mapping =>
    mapping.sourceColumn.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
    mapping.targetColumn.toLowerCase().includes(mappedSearchTerm.toLowerCase())
  );

  if (loading || dataLoading) {
    return (
      <AnalysisProgressBar
        message="Loading APP column mappings..."
        progress={100}
        recordCount={0}
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
            <h2 className="text-2xl font-bold text-gray-900">APP Column Mapping</h2>
            <p className="mt-1 text-sm text-gray-600">
              Map survey columns to standardized APP data structure columns
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TableCellsIcon className="h-6 w-6 text-gray-400" />
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
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unmapped Columns</dt>
                    <dd className="text-lg font-medium text-gray-900">{unmappedColumns.length}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Required Fields</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {mappings.filter(m => m.isRequired).length}
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
                { key: 'unmapped', label: `Unmapped Columns (${unmappedColumns.length})` },
                { key: 'mapped', label: `Mapped Columns (${mappings.length})` },
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
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all column mappings?')) {
                    setMappings([]);
                    saveMappings([]);
                  }
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                title="Delete all column mappings (this action cannot be undone)"
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
                    console.log('Apply all learned mappings');
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
                placeholder="Search unmapped columns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {filteredUnmapped.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredUnmapped.map((column) => (
                    <li key={column} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{column}</p>
                            <p className="text-sm text-gray-500">Unmapped column</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setNewMapping(prev => ({
                              ...prev,
                              sourceColumn: column
                            }));
                            setIsCreating(true);
                          }}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          <AddIcon className="h-4 w-4 mr-2" />
                          Map
                        </button>
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
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Columns Found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm 
                        ? 'No unmapped columns match your search criteria.'
                        : 'All columns are mapped, or no survey data is available.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mapped' && (
          <div className="space-y-4">
            <div className="flex-1 max-w-lg">
              <TextField
                fullWidth
                placeholder="Search mapped columns..."
                value={mappedSearchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMappedSearchTerm(e.target.value)}
                size="small"
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    height: '40px'
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className="h-4 w-4 text-gray-400" />
                    </InputAdornment>
                  ),
                  endAdornment: mappedSearchTerm && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setMappedSearchTerm('')}
                        sx={{
                          padding: '4px',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                        aria-label="Clear search"
                      >
                        <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {filteredMappings.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredMappings.map((mapping) => (
                    <li key={mapping.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {mapping.sourceColumn} → {mapping.targetColumn}
                            </h3>
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {mapping.dataType}
                            </span>
                            {mapping.isRequired && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-500">{mapping.description}</p>
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
              ) : (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Mapped Columns Found</h3>
                    <p className="text-gray-600 mb-4">
                      {mappedSearchTerm 
                        ? 'No mapped columns match your search criteria.'
                        : 'Create column mappings to organize and standardize your survey data.'
                      }
                    </p>
                  </div>
                </div>
              )}
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
                        : 'Learned mappings will appear here as you make corrections to column mappings.'
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Column Mapping</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source Column</label>
                    <input
                      type="text"
                      value={newMapping.sourceColumn}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, sourceColumn: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Provider Type"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Column</label>
                    <input
                      type="text"
                      value={newMapping.targetColumn}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, targetColumn: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., providerType"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Data Type</label>
                    <select
                      value={newMapping.dataType}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, dataType: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      aria-label="Select data type"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newMapping.isRequired}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, isRequired: e.target.checked }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      aria-label="Mark as required field"
                    />
                    <label className="ml-2 block text-sm text-gray-900">Required field</label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newMapping.description}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      placeholder="Describe this column mapping..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewMapping({
                        sourceColumn: '',
                        targetColumn: '',
                        dataType: 'string',
                        isRequired: false,
                        description: ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMapping}
                    disabled={!newMapping.sourceColumn.trim() || !newMapping.targetColumn.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
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

export default APPColumnMapping;
