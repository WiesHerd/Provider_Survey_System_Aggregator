import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  TrashIcon as DeleteSweepIcon,
  CheckIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  HomeIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  LightBulbIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { useAPPData } from '../../../hooks/useAPPData';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import { EnterpriseLoadingSpinner } from '../../../shared/components/EnterpriseLoadingSpinner';

interface APPPracticeSettingMapping {
  id: string;
  standardizedName: string;
  sourceSettings: string[];
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

interface APPPracticeSettingMappingProps {
  onMappingChange?: (mappings: APPPracticeSettingMapping[]) => void;
  onUnmappedChange?: (unmapped: string[]) => void;
}

/**
 * APPPracticeSettingMapping component - Manages APP practice setting mappings
 * Maps source practice settings to standardized categories
 */
export const APPPracticeSettingMapping: React.FC<APPPracticeSettingMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  // State management
  const [mappings, setMappings] = useState<APPPracticeSettingMapping[]>([]);
  const [unmappedSettings, setUnmappedSettings] = useState<string[]>([]);
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
    sourceSettings: [] as string[],
    description: ''
  });

  // Services
  const { surveyData, loading: dataLoading } = useAPPData();

  // Default APP practice setting mappings
  const defaultMappings: APPPracticeSettingMapping[] = [
    {
      id: 'hospital-mapping',
      standardizedName: 'Hospital',
      sourceSettings: ['Hospital', 'Medical Center', 'Health System', 'Acute Care', 'Inpatient'],
      description: 'Hospital-based practice including inpatient and outpatient services',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'clinic-mapping',
      standardizedName: 'Clinic',
      sourceSettings: ['Clinic', 'Outpatient Clinic', 'Ambulatory Care', 'Community Health Center', 'Primary Care Clinic'],
      description: 'Outpatient clinic-based practice',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'private-practice-mapping',
      standardizedName: 'Private Practice',
      sourceSettings: ['Private Practice', 'Private Office', 'Solo Practice', 'Group Practice', 'Independent Practice'],
      description: 'Private practice setting, independent or group-based',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'academic-mapping',
      standardizedName: 'Academic',
      sourceSettings: ['Academic', 'University', 'Medical School', 'Teaching Hospital', 'Academic Medical Center'],
      description: 'Academic or teaching institution',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Load initial data
  useEffect(() => {
    loadMappings();
  }, []);

  // Update unmapped settings when survey data changes
  useEffect(() => {
    if (surveyData.length > 0) {
      updateUnmappedSettings();
    }
  }, [surveyData, mappings]);

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedSettings);
  }, [unmappedSettings, onUnmappedChange]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load from localStorage or use defaults
      const stored = localStorage.getItem('app_practice_setting_mappings');
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

  const saveMappings = (mappingsToSave: APPPracticeSettingMapping[]) => {
    try {
      localStorage.setItem('app_practice_setting_mappings', JSON.stringify(mappingsToSave));
    } catch (err) {
      console.error('Failed to save mappings:', err);
    }
  };

  const updateUnmappedSettings = () => {
    const allSourceSettings = new Set<string>();
    const mappedSourceSettings = new Set<string>();

    // Collect all source settings from survey data
    surveyData.forEach(row => {
      if (row.practiceSetting) {
        allSourceSettings.add(row.practiceSetting);
      }
    });

    // Collect mapped source settings
    mappings.forEach(mapping => {
      mapping.sourceSettings.forEach(sourceSetting => {
        mappedSourceSettings.add(sourceSetting);
      });
    });

    // Find unmapped settings
    const unmapped = Array.from(allSourceSettings).filter(setting => !mappedSourceSettings.has(setting));
    setUnmappedSettings(unmapped);
  };

  const handleCreateMapping = async () => {
    if (!newMapping.standardizedName.trim()) return;

    try {
      const mapping: APPPracticeSettingMapping = {
        id: `mapping-${Date.now()}`,
        standardizedName: newMapping.standardizedName,
        sourceSettings: newMapping.sourceSettings,
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
        sourceSettings: [],
        description: ''
      });
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  };

  const handleUpdateMapping = async (id: string, updates: Partial<APPPracticeSettingMapping>) => {
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

  const handleAddSourceSetting = (mappingId: string, sourceSetting: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (mapping && !mapping.sourceSettings.includes(sourceSetting)) {
      handleUpdateMapping(mappingId, {
        sourceSettings: [...mapping.sourceSettings, sourceSetting]
      });
    }
  };

  const handleRemoveSourceSetting = (mappingId: string, sourceSetting: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (mapping) {
      handleUpdateMapping(mappingId, {
        sourceSettings: mapping.sourceSettings.filter(setting => setting !== sourceSetting)
      });
    }
  };

  // Filter functions
  const filteredUnmapped = unmappedSettings.filter(setting =>
    setting.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMappings = mappings.filter(mapping =>
    mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
    mapping.sourceSettings.some(sourceSetting => 
      sourceSetting.toLowerCase().includes(mappedSearchTerm.toLowerCase())
    )
  );

  // Get icon for practice setting
  const getPracticeSettingIcon = (setting: string) => {
    switch (setting.toLowerCase()) {
      case 'hospital':
        return <BuildingOfficeIcon className="h-5 w-5" />;
      case 'clinic':
        return <HomeIcon className="h-5 w-5" />;
      case 'private practice':
        return <BriefcaseIcon className="h-5 w-5" />;
      case 'academic':
        return <AcademicCapIcon className="h-5 w-5" />;
      default:
        return <BuildingOfficeIcon className="h-5 w-5" />;
    }
  };

  if (loading || dataLoading) {
    return (
      <EnterpriseLoadingSpinner
        message="Loading APP practice setting mappings..."
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
            <h2 className="text-2xl font-bold text-gray-900">APP Practice Setting Mapping</h2>
            <p className="mt-1 text-sm text-gray-600">
              Map APP practice settings to standardized categories for consistent analysis
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
                  <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
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
                  <HomeIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unmapped Settings</dt>
                    <dd className="text-lg font-medium text-gray-900">{unmappedSettings.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BriefcaseIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Practice Types</dt>
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
                { key: 'unmapped', label: `Unmapped Settings (${unmappedSettings.length})` },
                { key: 'mapped', label: `Mapped Settings (${mappings.length})` },
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
                  if (window.confirm('Are you sure you want to clear all practice setting mappings?')) {
                    setMappings([]);
                    saveMappings([]);
                  }
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                title="Delete all practice setting mappings (this action cannot be undone)"
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
                    console.log('Apply all learned practice setting mappings');
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
                placeholder="Search unmapped practice settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredUnmapped.map((setting) => (
                  <li key={setting} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{setting}</p>
                          <p className="text-sm text-gray-500">Unmapped practice setting</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewMapping(prev => ({
                            ...prev,
                            standardizedName: setting,
                            sourceSettings: [setting]
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
                placeholder="Search mapped practice settings..."
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
                            {getPracticeSettingIcon(mapping.standardizedName)}
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-gray-900">
                              {mapping.standardizedName}
                            </h3>
                            <p className="text-sm text-gray-500">{mapping.description}</p>
                          </div>
                        </div>
                        <div className="mt-1 ml-8">
                          <p className="text-sm text-gray-500">
                            Source settings: {mapping.sourceSettings.join(', ')}
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
                        : 'Learned mappings will appear here as you make corrections to practice setting mappings.'
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
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Practice Setting Mapping</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Standardized Name</label>
                    <input
                      type="text"
                      value={newMapping.standardizedName}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, standardizedName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Hospital"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newMapping.description}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, description: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      rows={3}
                      placeholder="Describe this practice setting..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewMapping({
                        standardizedName: '',
                        sourceSettings: [],
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

export default APPPracticeSettingMapping;
