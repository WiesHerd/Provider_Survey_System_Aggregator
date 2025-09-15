import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  TrashIcon as DeleteSweepIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { useAPPData } from '../../../hooks/useAPPData';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import LoadingSpinner from '../../../components/ui/loading-spinner';

interface APPProviderTypeMapping {
  id: string;
  standardizedName: string;
  sourceTypes: string[];
  certification: string;
  practiceSetting: string;
  createdAt: Date;
  updatedAt: Date;
}

interface APPProviderTypeMappingProps {
  onMappingChange?: (mappings: APPProviderTypeMapping[]) => void;
  onUnmappedChange?: (unmapped: string[]) => void;
}

/**
 * APPProviderTypeMapping component - Manages APP provider type mappings
 * Maps source provider types (NP, PA, CRNA, etc.) to standardized categories
 */
export const APPProviderTypeMapping: React.FC<APPProviderTypeMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  // State management
  const [mappings, setMappings] = useState<APPProviderTypeMapping[]>([]);
  const [unmappedTypes, setUnmappedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');

  // Form state
  const [isCreating, setIsCreating] = useState(false);
  const [newMapping, setNewMapping] = useState({
    standardizedName: '',
    sourceTypes: [] as string[],
    certification: 'NP',
    practiceSetting: 'Hospital'
  });

  // Services
  const { surveyData, loading: dataLoading } = useAPPData();

  // Default APP provider type mappings
  const defaultMappings: APPProviderTypeMapping[] = [
    {
      id: 'np-mapping',
      standardizedName: 'Nurse Practitioner',
      sourceTypes: ['NP', 'Nurse Practitioner', 'Advanced Practice Nurse', 'APN'],
      certification: 'NP',
      practiceSetting: 'Hospital',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'pa-mapping',
      standardizedName: 'Physician Assistant',
      sourceTypes: ['PA', 'Physician Assistant', 'PA-C', 'Physician Associate'],
      certification: 'PA',
      practiceSetting: 'Hospital',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'crna-mapping',
      standardizedName: 'Certified Registered Nurse Anesthetist',
      sourceTypes: ['CRNA', 'Nurse Anesthetist', 'Certified Registered Nurse Anesthetist'],
      certification: 'CRNA',
      practiceSetting: 'Hospital',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cns-mapping',
      standardizedName: 'Clinical Nurse Specialist',
      sourceTypes: ['CNS', 'Clinical Nurse Specialist', 'Advanced Practice CNS'],
      certification: 'CNS',
      practiceSetting: 'Hospital',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cnm-mapping',
      standardizedName: 'Certified Nurse Midwife',
      sourceTypes: ['CNM', 'Certified Nurse Midwife', 'Nurse Midwife'],
      certification: 'CNM',
      practiceSetting: 'Hospital',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Load initial data
  useEffect(() => {
    loadMappings();
  }, []);

  // Update unmapped types when survey data changes
  useEffect(() => {
    if (surveyData.length > 0) {
      updateUnmappedTypes();
    }
  }, [surveyData, mappings]);

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedTypes);
  }, [unmappedTypes, onUnmappedChange]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load from localStorage or use defaults
      const stored = localStorage.getItem('app_provider_type_mappings');
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

  const saveMappings = (mappingsToSave: APPProviderTypeMapping[]) => {
    try {
      localStorage.setItem('app_provider_type_mappings', JSON.stringify(mappingsToSave));
    } catch (err) {
      console.error('Failed to save mappings:', err);
    }
  };

  const updateUnmappedTypes = () => {
    const allSourceTypes = new Set<string>();
    const mappedSourceTypes = new Set<string>();

    // Collect all source types from survey data
    surveyData.forEach(row => {
      if (row.providerType) {
        allSourceTypes.add(row.providerType);
      }
    });

    // Collect mapped source types
    mappings.forEach(mapping => {
      mapping.sourceTypes.forEach(sourceType => {
        mappedSourceTypes.add(sourceType);
      });
    });

    // Find unmapped types
    const unmapped = Array.from(allSourceTypes).filter(type => !mappedSourceTypes.has(type));
    setUnmappedTypes(unmapped);
  };

  const handleCreateMapping = async () => {
    if (!newMapping.standardizedName.trim()) return;

    try {
      const mapping: APPProviderTypeMapping = {
        id: `mapping-${Date.now()}`,
        standardizedName: newMapping.standardizedName,
        sourceTypes: newMapping.sourceTypes,
        certification: newMapping.certification,
        practiceSetting: newMapping.practiceSetting,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMappings = [...mappings, mapping];
      setMappings(updatedMappings);
      saveMappings(updatedMappings);
      
      // Reset form
      setNewMapping({
        standardizedName: '',
        sourceTypes: [],
        certification: 'NP',
        practiceSetting: 'Hospital'
      });
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  };

  const handleUpdateMapping = async (id: string, updates: Partial<APPProviderTypeMapping>) => {
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

  const handleAddSourceType = (mappingId: string, sourceType: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (mapping && !mapping.sourceTypes.includes(sourceType)) {
      handleUpdateMapping(mappingId, {
        sourceTypes: [...mapping.sourceTypes, sourceType]
      });
    }
  };

  const handleRemoveSourceType = (mappingId: string, sourceType: string) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (mapping) {
      handleUpdateMapping(mappingId, {
        sourceTypes: mapping.sourceTypes.filter(type => type !== sourceType)
      });
    }
  };

  // Filter functions
  const filteredUnmapped = unmappedTypes.filter(type =>
    type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMappings = mappings.filter(mapping =>
    mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
    mapping.sourceTypes.some(sourceType => 
      sourceType.toLowerCase().includes(mappedSearchTerm.toLowerCase())
    )
  );

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner message="Loading APP provider type mappings..." />
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
            <h2 className="text-2xl font-bold text-gray-900">APP Provider Type Mapping</h2>
            <p className="mt-1 text-sm text-gray-600">
              Map APP provider types (NP, PA, CRNA, etc.) to standardized categories
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
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
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
                  <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unmapped Types</dt>
                    <dd className="text-lg font-medium text-gray-900">{unmappedTypes.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Certifications</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {new Set(mappings.map(m => m.certification)).size}
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
              { id: 'unmapped', name: 'Unmapped Types', count: unmappedTypes.length },
              { id: 'mapped', name: 'Mapped Types', count: mappings.length },
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
                placeholder="Search unmapped provider types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredUnmapped.map((type) => (
                  <li key={type} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{type}</p>
                          <p className="text-sm text-gray-500">Unmapped provider type</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewMapping(prev => ({
                            ...prev,
                            standardizedName: type,
                            sourceTypes: [type]
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
                placeholder="Search mapped provider types..."
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
                          <h3 className="text-sm font-medium text-gray-900">
                            {mapping.standardizedName}
                          </h3>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {mapping.certification}
                          </span>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {mapping.practiceSetting}
                          </span>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-gray-500">
                            Source types: {mapping.sourceTypes.join(', ')}
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

        {/* Create Mapping Dialog */}
        {isCreating && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Provider Type Mapping</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Standardized Name</label>
                    <input
                      type="text"
                      value={newMapping.standardizedName}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, standardizedName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Nurse Practitioner"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Certification</label>
                    <select
                      value={newMapping.certification}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, certification: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      aria-label="Select certification type"
                    >
                      <option value="NP">Nurse Practitioner (NP)</option>
                      <option value="PA">Physician Assistant (PA)</option>
                      <option value="CRNA">Certified Registered Nurse Anesthetist (CRNA)</option>
                      <option value="CNS">Clinical Nurse Specialist (CNS)</option>
                      <option value="CNM">Certified Nurse Midwife (CNM)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Practice Setting</label>
                    <select
                      value={newMapping.practiceSetting}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, practiceSetting: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      aria-label="Select practice setting"
                    >
                      <option value="Hospital">Hospital</option>
                      <option value="Clinic">Clinic</option>
                      <option value="Private Practice">Private Practice</option>
                      <option value="Academic">Academic</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewMapping({
                        standardizedName: '',
                        sourceTypes: [],
                        certification: 'NP',
                        practiceSetting: 'Hospital'
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

export default APPProviderTypeMapping;
