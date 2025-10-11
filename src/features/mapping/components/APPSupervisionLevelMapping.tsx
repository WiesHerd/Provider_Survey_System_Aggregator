import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  TrashIcon as DeleteSweepIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  HandRaisedIcon,
  LightBulbIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useAPPData } from '../../../hooks/useAPPData';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import { AnalysisProgressBar } from '../../../shared/components';

interface APPSupervisionLevelMapping {
  id: string;
  standardizedName: string;
  sourceLevels: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface APPSupervisionLevelMappingProps {
  onMappingChange?: (mappings: APPSupervisionLevelMapping[]) => void;
  onUnmappedChange?: (unmapped: string[]) => void;
}

/**
 * APPSupervisionLevelMapping component - Manages APP supervision level mappings
 * Maps source supervision levels to standardized categories
 */
export const APPSupervisionLevelMapping: React.FC<APPSupervisionLevelMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  // State management
  const [mappings, setMappings] = useState<APPSupervisionLevelMapping[]>([]);
  const [unmappedLevels, setUnmappedLevels] = useState<string[]>([]);
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
    standardizedName: '',
    sourceLevels: [] as string[],
    description: ''
  });

  // Services
  const { surveyData, loading: dataLoading } = useAPPData();

  // Default APP supervision level mappings
  const defaultMappings: APPSupervisionLevelMapping[] = [
    {
      id: 'independent-mapping',
      standardizedName: 'Independent',
      sourceLevels: ['Independent', 'Autonomous', 'Full Practice Authority', 'FPA', 'Independent Practice'],
      description: 'APP can practice independently without physician supervision',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'supervised-mapping',
      standardizedName: 'Supervised',
      sourceLevels: ['Supervised', 'Direct Supervision', 'Physician Supervision', 'Supervised Practice'],
      description: 'APP requires direct physician supervision for practice',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'collaborative-mapping',
      standardizedName: 'Collaborative',
      sourceLevels: ['Collaborative', 'Collaborative Agreement', 'Collaborative Practice', 'Team-Based Care'],
      description: 'APP practices in collaboration with physicians under agreement',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Load initial data
  useEffect(() => {
    loadMappings();
  }, []);

  // Update unmapped levels when survey data changes
  useEffect(() => {
    if (surveyData.length > 0) {
      updateUnmappedLevels();
    }
  }, [surveyData, mappings]);

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedLevels);
  }, [unmappedLevels, onUnmappedChange]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load from localStorage or use defaults
      const stored = localStorage.getItem('app_supervision_level_mappings');
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

  const saveMappings = (mappingsToSave: APPSupervisionLevelMapping[]) => {
    try {
      localStorage.setItem('app_supervision_level_mappings', JSON.stringify(mappingsToSave));
    } catch (err) {
      console.error('Failed to save mappings:', err);
    }
  };

  const updateUnmappedLevels = () => {
    const allSourceLevels = new Set<string>();
    const mappedSourceLevels = new Set<string>();

    // Collect all source levels from survey data
    surveyData.forEach(row => {
      if (row.supervisionLevel) {
        allSourceLevels.add(row.supervisionLevel);
      }
    });

    // Collect mapped source levels
    mappings.forEach(mapping => {
      mapping.sourceLevels.forEach(sourceLevel => {
        mappedSourceLevels.add(sourceLevel);
      });
    });

    // Find unmapped levels
    const unmapped = Array.from(allSourceLevels).filter(level => !mappedSourceLevels.has(level));
    setUnmappedLevels(unmapped);
  };

  const handleCreateMapping = async () => {
    if (!newMapping.standardizedName.trim()) return;

    try {
      const mapping: APPSupervisionLevelMapping = {
        id: `mapping-${Date.now()}`,
        standardizedName: newMapping.standardizedName,
        sourceLevels: newMapping.sourceLevels,
        description: newMapping.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMappings = [...mappings, mapping];
      setMappings(updatedMappings);
      saveMappings(updatedMappings);
      
      // Reset form
      setNewMapping({
        standardizedName: '',
        sourceLevels: [],
        description: ''
      });
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  };

  const handleUpdateMapping = async (id: string, updates: Partial<APPSupervisionLevelMapping>) => {
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

  const handleAddSourceLevel = (mappingId: string, sourceLevel: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (mapping && !mapping.sourceLevels.includes(sourceLevel)) {
      handleUpdateMapping(mappingId, {
        sourceLevels: [...mapping.sourceLevels, sourceLevel]
      });
    }
  };

  const handleRemoveSourceLevel = (mappingId: string, sourceLevel: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (mapping) {
      handleUpdateMapping(mappingId, {
        sourceLevels: mapping.sourceLevels.filter(level => level !== sourceLevel)
      });
    }
  };

  // Filter functions
  const filteredUnmapped = unmappedLevels.filter(level =>
    level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMappings = mappings.filter(mapping =>
    mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
    mapping.sourceLevels.some(sourceLevel => 
      sourceLevel.toLowerCase().includes(mappedSearchTerm.toLowerCase())
    )
  );

  // Get icon for supervision level
  const getSupervisionLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'independent':
        return <UserIcon className="h-5 w-5" />;
      case 'supervised':
        return <UsersIcon className="h-5 w-5" />;
      case 'collaborative':
        return <HandRaisedIcon className="h-5 w-5" />;
      default:
        return <ShieldCheckIcon className="h-5 w-5" />;
    }
  };

  // Get color for supervision level
  const getSupervisionLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'independent':
        return 'bg-green-100 text-green-800';
      case 'supervised':
        return 'bg-yellow-100 text-yellow-800';
      case 'collaborative':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || dataLoading) {
    return (
      <AnalysisProgressBar
        message="Loading APP supervision level mappings..."
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
            <h2 className="text-2xl font-bold text-gray-900">APP Supervision Level Mapping</h2>
            <p className="mt-1 text-sm text-gray-600">
              Map APP supervision levels to standardized categories for consistent analysis
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
                  <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
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
                  <UserIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unmapped Levels</dt>
                    <dd className="text-lg font-medium text-gray-900">{unmappedLevels.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Supervision Types</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {new Set(mappings.map(m => m.standardizedName)).size}
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
                { key: 'unmapped', label: `Unmapped Levels (${unmappedLevels.length})` },
                { key: 'mapped', label: `Mapped Levels (${mappings.length})` },
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
                  if (window.confirm('Are you sure you want to clear all supervision level mappings?')) {
                    setMappings([]);
                    saveMappings([]);
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
                    console.log('Apply all learned supervision level mappings');
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600"
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
                placeholder="Search unmapped supervision levels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredUnmapped.map((level) => (
                  <li key={level} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{level}</p>
                          <p className="text-sm text-gray-500">Unmapped supervision level</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewMapping(prev => ({
                            ...prev,
                            standardizedName: level,
                            sourceLevels: [level]
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
                placeholder="Search mapped supervision levels..."
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
                            {getSupervisionLevelIcon(mapping.standardizedName)}
                          </div>
                          <div className="ml-3">
                            <div className="flex items-center">
                              <h3 className="text-sm font-medium text-gray-900">
                                {mapping.standardizedName}
                              </h3>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSupervisionLevelColor(mapping.standardizedName)}`}>
                                {mapping.standardizedName}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">{mapping.description}</p>
                          </div>
                        </div>
                        <div className="mt-1 ml-8">
                          <p className="text-sm text-gray-500">
                            Source levels: {mapping.sourceLevels.join(', ')}
                          </p>
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
                        : 'Learned mappings will appear here as you make corrections to supervision level mappings.'
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Supervision Level Mapping</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Standardized Name</label>
                    <select
                      value={newMapping.standardizedName}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, standardizedName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      aria-label="Select supervision level"
                    >
                      <option value="">Select supervision level...</option>
                      <option value="Independent">Independent</option>
                      <option value="Supervised">Supervised</option>
                      <option value="Collaborative">Collaborative</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newMapping.description}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      placeholder="Describe this supervision level..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewMapping({
                        standardizedName: '',
                        sourceLevels: [],
                        description: ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateMapping}
                    disabled={!newMapping.standardizedName.trim()}
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

export default APPSupervisionLevelMapping;
