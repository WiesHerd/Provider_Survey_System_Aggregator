import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  MagnifyingGlassIcon as SearchIcon
} from '@heroicons/react/24/outline';
import {
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { VariableMappingProps, IVariableMapping, IUnmappedVariable } from '../types/mapping';
import { useVariableMappingData } from '../hooks/useVariableMappingData';
import { UnmappedVariables } from './UnmappedVariables';
import { MappedVariables } from './MappedVariables';
import { AnalysisProgressBar } from '../../../shared/components';

/**
 * VariableMapping component - Main orchestrator for variable mapping functionality
 * Shows how variables are being joined across surveys and allows manual overrides
 * 
 * @param onVariableMappingChange - Optional callback when variable mappings change
 * @param onUnmappedVariableChange - Optional callback when unmapped variables change
 */
export const VariableMapping: React.FC<VariableMappingProps> = ({
  onVariableMappingChange,
  onUnmappedVariableChange
}) => {
  // State for editing mappings (keep for future use)
  const [editingMapping, setEditingMapping] = useState<IVariableMapping | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [variableCategory, setVariableCategory] = useState<'compensation' | 'categorical'>('compensation');

  // Custom hook for data management
  const {
    // State
    variableMappings,
    unmappedVariables,
    selectedVariables,
    loading,
    error,
    activeTab,
    
    // Search state
    searchTerm,
    mappedSearchTerm,
    
    // Computed values
    filteredUnmapped,
    filteredMappings,
    
    // Actions
    setActiveTab,
    selectVariable,
    clearSelectedVariables,
    selectAllVariables,
    deselectAllVariables,
    
    // Data operations
    loadData,
    createVariableMapping,
    createGroupedVariableMapping,
    deleteVariableMapping,
    clearAllVariableMappings,
    
    
    // Search and filters
    setSearchTerm,
    setMappedSearchTerm,
    clearError
  } = useVariableMappingData();


  // Handle clear all mappings
  const handleClearAllMappings = () => {
    if (window.confirm('Are you sure you want to clear all variable mappings? This cannot be undone.')) {
      clearAllVariableMappings();
    }
  };

  // Handle create new mapping (auto-join like auto-mapping)
  const handleCreateMapping = async () => {
    if (selectedVariables.length === 0) return;

    try {
      // Auto-generate standardized name from first variable (like auto-mapping)
      const standardizedName = selectedVariables[0].name.toLowerCase().replace(/\s+/g, '_');
      
      await createGroupedVariableMapping(
        standardizedName,
        'compensation', // Default to compensation for consistency
        'general', // Default subtype
        selectedVariables
      );
      
      // Clear selections and switch to mapped tab
      clearSelectedVariables();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Failed to create variable mapping:', error);
    }
  };

  // Handle delete mapping
  const handleDeleteMapping = (mappingId: string) => {
    if (window.confirm('Are you sure you want to delete this variable mapping?')) {
      deleteVariableMapping(mappingId);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Notify parent of changes
  useEffect(() => {
    onVariableMappingChange?.(variableMappings);
  }, [variableMappings, onVariableMappingChange]);

  useEffect(() => {
    onUnmappedVariableChange?.(unmappedVariables);
  }, [unmappedVariables, onUnmappedVariableChange]);

  if (loading) {
    return (
      <AnalysisProgressBar
        message="Loading variable mappings..."
        progress={100}
        recordCount={0}
      />
    );
  }

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">

          {/* Main Mapping Section */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Tabs with Action Buttons */}
            <div className="border-b border-gray-200 mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setShowHelp(true)}
                  className="p-2 mr-3 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  aria-label="Show help"
                >
                  <LightBulbIcon className="h-5 w-5 text-indigo-600" />
                </button>
                <nav className="-mb-px flex space-x-8">
                  {[
                    { key: 'unmapped', label: `Unmapped Fields (${unmappedVariables.length})` },
                    { key: 'mapped', label: `Mapped Fields (${variableMappings.length})` },
                    { key: 'learned', label: `Learned Mappings (0)` }
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

              {/* Action Buttons */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {activeTab === 'unmapped' && selectedVariables.length > 0 && (
                    <button
                      onClick={handleCreateMapping}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 border border-green-600"
                      title="Create Manual Mapping"
                    >
                      <AddIcon className="h-4 w-4 mr-2" />
                      Create Mapping ({selectedVariables.length})
                    </button>
                  )}
                </div>
                
                {/* Select All button - positioned on the right for stable layout */}
                {activeTab === 'unmapped' && (
                  <button
                    onClick={selectedVariables.length === 0 ? selectAllVariables : deselectAllVariables}
                    disabled={unmappedVariables.length === 0}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedVariables.length === 0 ? 'Select All' : 'Deselect All'}
                  </button>
                )}
              </div>
              
              {/* Mapped tab actions */}
              {activeTab === 'mapped' && (
                <div className="flex items-center justify-end mb-4">
                  <button
                    onClick={handleClearAllMappings}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                    title="Delete all variable mappings (this action cannot be undone)"
                  >
                    <DeleteSweepIcon className="h-4 w-4 mr-2" />
                    Clear All
                  </button>
                </div>
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
                      Apply All (0)
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to clear all learned mappings?')) {
                          console.log('Clear all learned variable mappings');
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

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}



            {/* Tab Content - Simple and instant */}
            <div className="min-h-[400px]">
              {activeTab === 'unmapped' && (
                filteredUnmapped.length > 0 ? (
                  <UnmappedVariables
                    unmappedVariables={filteredUnmapped}
                    selectedVariables={selectedVariables}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onVariableSelect={selectVariable}
                    onRefresh={loadData}
                  />
                ) : (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <BoltIcon className="h-6 w-6 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Fields Found</h3>
                      <p className="text-gray-600 mb-4">All fields are mapped, or no survey data is available.</p>
                      <button
                        onClick={loadData}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <BoltIcon className="h-4 w-4 mr-2" />
                        Refresh Data
                      </button>
                    </div>
                  </div>
                )
              )}
              {activeTab === 'mapped' && (
                <MappedVariables
                  mappings={filteredMappings}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onDeleteMapping={handleDeleteMapping}
                  onEditMapping={undefined}
                />
              )}
              {activeTab === 'learned' && (
                <div className="space-y-4">
                  {/* Search Bar - Match SpecialtyMapping Pattern */}
                  <div className="mb-4">
                    <TextField
                      fullWidth
                      placeholder="Search learned mappings..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
                        endAdornment: searchTerm && (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setSearchTerm('')}
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

                  {/* Learned Mappings List - Match SpecialtyMapping Pattern */}
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          <BoltIcon className="h-6 w-6 text-gray-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Learned Mappings Found</h3>
                        <p className="text-gray-600 mb-4">
                          {searchTerm 
                            ? 'No learned mappings match your search criteria.'
                            : 'Learned mappings will appear here as you make corrections to field mappings.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>




          {/* Help Modal */}
          {showHelp && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              {/* Backdrop */}
              <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowHelp(false)} />
              
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
                        <h2 className="text-xl font-semibold text-gray-900">Survey Field Mapping Help</h2>
                        <p className="text-sm text-gray-500">Learn how to use survey field mapping effectively</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                      title="Close help"
                    >
                      <XMarkIcon className="h-6 w-6 text-gray-400" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">What is Survey Field Mapping?</h3>
                      <p className="text-gray-600">
                        Survey Field Mapping standardizes field names across different survey sources. 
                        This ensures that similar data (like TCC, wRVUs, CFs, base pay) from different surveys 
                        are properly combined for analysis.
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">How it Works</h3>
                      <div className="space-y-2 text-gray-600">
                        <p><strong>Example:</strong> "Total Cash Compensation" from MGMA maps to "TCC" from SullivanCotter, 
                        both creating the standardized field "tcc".</p>
                        <p><strong>Manual Mapping:</strong> Create precise mappings with full control over field matching.</p>
                        <p><strong>Manual Override:</strong> You can edit any mapping to change how fields are joined.</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Common Field Types</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Compensation Fields</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• Total Cash Compensation (TCC)</li>
                            <li>• Work RVUs (wRVUs)</li>
                            <li>• Conversion Factors (CF)</li>
                            <li>• Base Pay</li>
                            <li>• Bonuses & Incentives</li>
                          </ul>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-2">Categorical Fields</h4>
                          <ul className="text-sm text-green-800 space-y-1">
                            <li>• Geographic Regions</li>
                            <li>• Provider Types</li>
                            <li>• Practice Settings</li>
                            <li>• Years of Experience</li>
                            <li>• Specialty Categories</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  );
};

