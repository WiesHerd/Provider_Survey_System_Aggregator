import React, { useState, useEffect } from 'react';
import { 
  PlusIcon as AddIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
  XMarkIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { APPSpecialtyMapping as APPSpecialtyMappingType, APPSourceSpecialty } from '../../../types/provider';
import APPSpecialtyMappingService from '../../../services/APPSpecialtyMappingService';
import { useAPPData } from '../../../hooks/useAPPData';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import { EnterpriseLoadingSpinner } from '../../../shared/components/EnterpriseLoadingSpinner';

interface APPSpecialtyMappingProps {
  onMappingChange?: (mappings: APPSpecialtyMappingType[]) => void;
  onUnmappedChange?: (unmapped: string[]) => void;
}

/**
 * APPSpecialtyMapping component - Main orchestrator for APP specialty mapping functionality
 * 
 * @param onMappingChange - Optional callback when mappings change
 * @param onUnmappedChange - Optional callback when unmapped specialties change
 */
export const APPSpecialtyMapping: React.FC<APPSpecialtyMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [isBulkSelected, setIsBulkSelected] = useState(false);

  // State management
  const [mappings, setMappings] = useState<APPSpecialtyMappingType[]>([]);
  const [unmappedSpecialties, setUnmappedSpecialties] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  const [learnedSearchTerm, setLearnedSearchTerm] = useState('');

  // Services
  const mappingService = APPSpecialtyMappingService.getInstance();
  const { surveyData, loading: dataLoading } = useAPPData();

  // Load initial data
  useEffect(() => {
    loadMappings();
  }, []);

  // Update unmapped specialties when survey data changes
  useEffect(() => {
    if (surveyData.length > 0) {
      updateUnmappedSpecialties();
    }
  }, [surveyData, mappings]);

  // Notify parent components of changes
  useEffect(() => {
    onMappingChange?.(mappings);
  }, [mappings, onMappingChange]);

  useEffect(() => {
    onUnmappedChange?.(unmappedSpecialties);
  }, [unmappedSpecialties, onUnmappedChange]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      setError(null);
      const allMappings = mappingService.getAllMappings();
      setMappings(allMappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mappings');
    } finally {
      setLoading(false);
    }
  };

  const updateUnmappedSpecialties = () => {
    const unmapped = mappingService.getUnmappedSpecialties(surveyData);
    setUnmappedSpecialties(unmapped);
  };

  const handleCreateMapping = async (standardizedName: string, sourceSpecialties: string[]) => {
    try {
      // Create mapping with empty source specialties first
      const newMapping = mappingService.createMapping({
        standardizedName,
        sourceSpecialties: [],
        providerType: 'APP',
        certification: 'NP',
        practiceSetting: 'Hospital',
      });

      // Add each source specialty
      for (const specialty of sourceSpecialties) {
        mappingService.addSourceSpecialty(newMapping.id, {
          specialty,
          originalName: specialty,
          surveySource: 'Unknown',
          certification: 'NP', // Default certification
          practiceSetting: 'Hospital', // Default practice setting
        });
      }

      setMappings(prev => [...prev, newMapping]);
      updateUnmappedSpecialties();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  };

  const handleUpdateMapping = async (id: string, updates: Partial<APPSpecialtyMappingType>) => {
    try {
      const updatedMapping = mappingService.updateMapping(id, updates);
      if (updatedMapping) {
        setMappings(prev => prev.map(m => m.id === id ? updatedMapping : m));
        updateUnmappedSpecialties();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mapping');
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const success = mappingService.deleteMapping(id);
      if (success) {
        setMappings(prev => prev.filter(m => m.id !== id));
        updateUnmappedSpecialties();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mapping');
    }
  };

  const handleAddSourceSpecialty = async (mappingId: string, sourceSpecialty: string) => {
    try {
      const success = mappingService.addSourceSpecialty(mappingId, {
        specialty: sourceSpecialty,
        originalName: sourceSpecialty,
        surveySource: 'Unknown',
        certification: 'NP',
        practiceSetting: 'Hospital',
      });

      if (success) {
        await loadMappings();
        updateUnmappedSpecialties();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source specialty');
    }
  };

  const handleRemoveSourceSpecialty = async (mappingId: string, sourceSpecialtyId: string) => {
    try {
      const success = mappingService.removeSourceSpecialty(mappingId, sourceSpecialtyId);
      if (success) {
        await loadMappings();
        updateUnmappedSpecialties();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove source specialty');
    }
  };


  const handleBulkSelection = (specialties: string[], selected: boolean) => {
    if (selected) {
      setSelectedSpecialties(prev => [...new Set([...prev, ...specialties])]);
    } else {
      setSelectedSpecialties(prev => prev.filter(s => !specialties.includes(s)));
    }
  };

  const handleBulkMapping = async (standardizedName: string) => {
    try {
      await handleCreateMapping(standardizedName, selectedSpecialties);
      setSelectedSpecialties([]);
      setIsBulkSelected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk mapping failed');
    }
  };

  // Filter functions
  const filteredUnmapped = unmappedSpecialties.filter(specialty =>
    specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMappings = mappings.filter(mapping =>
    mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
    mapping.sourceSpecialties.some(source => 
      source.originalName.toLowerCase().includes(mappedSearchTerm.toLowerCase())
    )
  );

  if (loading || dataLoading) {
    return (
      <EnterpriseLoadingSpinner
        message="Loading APP specialty mappings..."
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
            <h2 className="text-2xl font-bold text-gray-900">APP Specialty Mapping</h2>
            <p className="mt-1 text-sm text-gray-600">
              Map APP specialty names to standardized categories for consistent analysis
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <LightBulbIcon className="h-4 w-4 mr-2" />
              Help
            </button>
          </div>
        </div>

        {/* Help Panel */}
        {showHelp && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <LightBulbIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">APP Specialty Mapping Help</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Map APP specialty names from different survey sources to standardized categories</li>
                    <li>Each mapping can include multiple source specialties from different surveys</li>
                    <li>APP-specific fields include certification type and practice setting</li>
                    <li>Mappings are used to normalize data across different survey sources</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Unmapped</dt>
                    <dd className="text-lg font-medium text-gray-900">{unmappedSpecialties.length}</dd>
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
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Practice Settings</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {new Set(mappings.map(m => m.practiceSetting)).size}
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
              { id: 'unmapped', name: 'Unmapped Specialties', count: unmappedSpecialties.length },
              { id: 'mapped', name: 'Mapped Specialties', count: mappings.length },
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
            <div className="flex items-center justify-between">
              <div className="flex-1 max-w-lg">
                <input
                  type="text"
                  placeholder="Search unmapped specialties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {selectedSpecialties.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedSpecialties.length} selected
                  </span>
                  <button
                    onClick={() => setIsBulkSelected(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <AddIcon className="h-4 w-4 mr-2" />
                    Bulk Map
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredUnmapped.map((specialty) => (
                  <li key={specialty} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSpecialties.includes(specialty)}
                          onChange={(e) => handleBulkSelection([specialty], e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          aria-label={`Select ${specialty} for bulk mapping`}
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{specialty}</p>
                          <p className="text-sm text-gray-500">Unmapped specialty</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCreateMapping(specialty, [specialty])}
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
                placeholder="Search mapped specialties..."
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
                            {mapping.sourceSpecialties.length} source specialties
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

      </div>
    </AdvancedErrorBoundary>
  );
};

export default APPSpecialtyMapping;
