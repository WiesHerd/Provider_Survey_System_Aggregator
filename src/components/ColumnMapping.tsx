import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  PlusIcon as AddIcon,
  MagnifyingGlassIcon as SearchIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import { getDataService } from '../services/DataService';
import { IColumnMapping, IColumnInfo } from '../types/column';
import LoadingSpinner from './ui/loading-spinner';

// Lazy load components for better performance
const MappedColumns = lazy(() => import('./MappedColumns').then(module => ({ default: module.default })));
const AutoMapping = lazy(() => import('../features/mapping/components/AutoMapping').then(module => ({ default: module.AutoMapping })));

interface ColumnCardProps {
  column: IColumnInfo;
  isSelected: boolean;
  onSelect: (column: IColumnInfo) => void;
}

const ColumnCard: React.FC<ColumnCardProps> = ({ column, isSelected, onSelect }) => (
  <button
    onClick={() => onSelect(column)}
    className={`w-full p-2 mb-1.5 text-left rounded-md transition-all text-sm ${
      isSelected 
        ? 'bg-indigo-100 border-2 border-indigo-500' 
        : 'bg-white hover:bg-gray-50 border border-gray-200'
    }`}
  >
    <div className="font-medium text-sm">{column.name}</div>
    <div className="text-xs text-gray-500">Type: {column.dataType}</div>
  </button>
);

// Memoized tab content component for instant switching
const TabContent = React.memo(({ 
  activeTab, 
  searchTerm, 
  setSearchTerm, 
  columnsBySurvey, 
  selectedColumns, 
  handleColumnSelect,
  mappings,
  mappedSearchTerm,
  setMappedSearchTerm,
  handleDelete
}: {
  activeTab: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  columnsBySurvey: Map<string, IColumnInfo[]>;
  selectedColumns: IColumnInfo[];
  handleColumnSelect: (column: IColumnInfo) => void;
  mappings: IColumnMapping[];
  mappedSearchTerm: string;
  setMappedSearchTerm: (term: string) => void;
  handleDelete: (mappingId: string) => Promise<void>;
}) => {
  // Memoize search components to prevent re-renders
  const searchComponents = useMemo(() => ({
    unmapped: (
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      </div>
    ),
    mapped: (
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search mapped columns..."
          value={mappedSearchTerm}
          onChange={(e) => setMappedSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        />
      </div>
    )
  }), [searchTerm, setSearchTerm, mappedSearchTerm, setMappedSearchTerm]);

  // Memoize tab content to prevent unnecessary re-renders
  const content = useMemo(() => {
    switch (activeTab) {
      case 'unmapped':
        return (
          <div className="space-y-4">
            {searchComponents.unmapped}
            {/* Columns by Survey Source */}
            {Array.from(columnsBySurvey.entries()).map(([surveySource, columns]) => (
              <div key={surveySource} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">{surveySource}</h4>
                  <p className="text-xs text-gray-500">{columns.length} unmapped columns</p>
                </div>
                <div className="p-4 space-y-2">
                  {columns.map((column) => (
                    <ColumnCard
                      key={column.name}
                      column={column}
                      isSelected={selectedColumns.some(c => c.name === column.name && c.surveySource === column.surveySource)}
                      onSelect={handleColumnSelect}
                    />
                  ))}
                </div>
              </div>
            ))}

            {Array.from(columnsBySurvey.entries()).length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No unmapped columns found</p>
              </div>
            )}
          </div>
        );
      case 'mapped':
        return (
          <div className="space-y-4">
            {searchComponents.mapped}
            <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
              {/* Mapped Columns */}
              <div className="space-y-3">
                {mappings
                  .filter(mapping => 
                    mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
                    mapping.sourceColumns.some(col => col.name.toLowerCase().includes(mappedSearchTerm.toLowerCase()))
                  )
                  .map((mapping) => (
                    <MappedColumns
                      key={mapping.id}
                      mapping={mapping}
                      onDelete={() => handleDelete(mapping.id)}
                    />
                  ))}
              </div>

              {mappings.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No mapped columns found</p>
                </div>
              )}
            </Suspense>
          </div>
        );
      default:
        return null;
    }
  }, [activeTab, searchComponents, columnsBySurvey, selectedColumns, handleColumnSelect, mappings, mappedSearchTerm, handleDelete]);

  return content;
});

TabContent.displayName = 'TabContent';

const ColumnMapping: React.FC = () => {
  // State for data
  const [mappings, setMappings] = useState<IColumnMapping[]>([]);
  const [unmappedColumns, setUnmappedColumns] = useState<IColumnInfo[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<IColumnInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped'>('unmapped');
  const [isAutoMapOpen, setIsAutoMapOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false); // Prevent multiple simultaneous loads

  const dataService = useMemo(() => getDataService(), []);

  const loadData = useCallback(async () => {
    // Prevent multiple simultaneous data loads
    if (isLoadingData) {
      console.log('Data load already in progress, skipping...');
      return;
    }

    try {
      setIsLoadingData(true);
      setLoading(true);
      setError(null);
      
      console.log('Starting data load...');
      const [mappingsData, unmappedData] = await Promise.all([
        dataService.getAllColumnMappings(),
        dataService.getUnmappedColumns()
      ]);
      
      console.log('Data load completed:', { 
        mappings: mappingsData.length, 
        unmapped: unmappedData.length 
      });
      
      setMappings(mappingsData);
      setUnmappedColumns(unmappedData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load column data. Please check your connection and try again.');
      // Don't clear existing data on error to prevent flickering
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  }, [dataService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Smart tab selection based on data availability
  useEffect(() => {
    if (!loading && !isLoadingData) {
      // If there are mappings, default to mapped tab
      if (mappings.length > 0 && activeTab === 'unmapped') {
        setActiveTab('mapped');
      }
      // If there are unmapped columns and no mappings, default to unmapped tab
      else if (unmappedColumns.length > 0 && mappings.length === 0 && activeTab === 'mapped') {
        setActiveTab('unmapped');
      }
      // Otherwise, keep current tab
    }
  }, [loading, isLoadingData, mappings.length, unmappedColumns.length, activeTab]);

  const filteredUnmapped = useMemo(() => {
    return unmappedColumns.filter(column => 
      column.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      column.surveySource.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unmappedColumns, searchTerm]);

  // Group columns by survey source
  const columnsBySurvey = useMemo(() => {
    const grouped = new Map<string, IColumnInfo[]>();
    filteredUnmapped.forEach(column => {
      const current = grouped.get(column.surveySource) || [];
      grouped.set(column.surveySource, [...current, column]);
    });
    return grouped;
  }, [filteredUnmapped]);

  const handleColumnSelect = (column: IColumnInfo) => {
    setSelectedColumns(prev => {
      const isSelected = prev.some(c => c.name === column.name && c.surveySource === column.surveySource);
      if (isSelected) {
        return prev.filter(c => !(c.name === column.name && c.surveySource === column.surveySource));
      } else {
        return [...prev, column];
      }
    });
  };

  const handleCreateMapping = async () => {
    if (selectedColumns.length === 0) return;

    try {
      const standardizedName = prompt('Enter standardized column name:');
      if (!standardizedName) return;

      setLoading(true);
      setError(null);
      
      await dataService.createColumnMapping({
        id: crypto.randomUUID(),
        standardizedName,
        sourceColumns: selectedColumns.map(col => ({
          id: crypto.randomUUID(),
          column: col.name,
          originalName: col.name,
          surveySource: col.surveySource,
          mappingId: ''
        } as any)),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      setSelectedColumns([]);
      
      // Refresh data without showing loading spinner for better UX
      await loadData();
      setActiveTab('mapped');
    } catch (error) {
      console.error('Error creating mapping:', error);
      setError('Failed to create mapping. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await dataService.deleteColumnMapping(mappingId);
      
      // Refresh data without showing loading spinner for better UX
      await loadData();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      setError('Failed to delete mapping. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMap = async (config: {
    confidenceThreshold: number;
    useExistingMappings: boolean;
    useFuzzyMatching: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the auto-mapping service
      const suggestions = await dataService.autoMapColumns({
        confidenceThreshold: config.confidenceThreshold,
        includeDataTypeMatching: config.useFuzzyMatching
      });

      // Create mappings from suggestions
      for (const suggestion of suggestions) {
        await dataService.createColumnMapping({
          id: crypto.randomUUID(),
          standardizedName: suggestion.standardizedName,
          sourceColumns: suggestion.columns.map(col => ({
            id: crypto.randomUUID(),
            column: col.name,
            originalName: col.name,
            surveySource: col.surveySource,
            mappingId: ''
          } as any)),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      // Refresh data and close dialog
      await loadData();
      setActiveTab('mapped');
      setIsAutoMapOpen(false);
    } catch (error) {
      console.error('Auto-mapping error:', error);
      setError('Failed to auto-map columns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner 
        message="Loading column mappings..." 
        fullScreen={true}
        size="lg"
      />
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="w-full flex flex-col gap-4">



        {/* Main Mapping Section */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Column Mapping</h3>
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 transform hover:scale-110"
                aria-label="Show help"
              >
                <LightBulbIcon className="h-5 w-5 text-indigo-600" />
              </button>
            </div>
            <div className="flex space-x-2">
              {activeTab !== 'mapped' && (
                <button
                  onClick={() => setIsAutoMapOpen(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  <BoltIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                  Auto Map
                </button>
              )}
              <button
                onClick={handleCreateMapping}
                disabled={selectedColumns.length === 0}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                title={selectedColumns.length === 1 ? "Create mapping for selected column" : `Create mapping for ${selectedColumns.length} selected columns`}
              >
                <AddIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
                Create Mapping ({selectedColumns.length})
              </button>
              {activeTab === 'mapped' && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to clear all mappings? This cannot be undone.')) {
                      try {
                        console.log('User confirmed clear all mappings');
                        await dataService.clearAllColumnMappings();
                        console.log('Successfully cleared all mappings from database');
                        setMappings([]);
                        setActiveTab('unmapped');
                        await loadData();
                        console.log('UI updated after clearing mappings');
                      } catch (error) {
                        console.error('Error clearing all mappings:', error);
                        setError('Failed to clear all mappings. Please try again.');
                      }
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-300 transform hover:scale-105 hover:shadow-md border border-red-200 hover:border-red-300 hover:shadow-red-100"
                >
                  <DeleteSweepIcon className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                  Clear All
                </button>
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

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'unmapped', label: 'Unmapped Columns' },
                { key: 'mapped', label: 'Mapped Columns' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'unmapped' | 'mapped')}
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

          {/* Tab Content - Optimized for instant switching */}
          <div className="min-h-[400px]">
            <TabContent
              activeTab={activeTab}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              columnsBySurvey={columnsBySurvey}
              selectedColumns={selectedColumns}
              handleColumnSelect={handleColumnSelect}
              mappings={mappings}
              mappedSearchTerm={mappedSearchTerm}
              setMappedSearchTerm={setMappedSearchTerm}
              handleDelete={handleDelete}
            />
          </div>
        </div>

        {/* Auto-Mapping Dialog */}
        <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
          <AutoMapping
            isOpen={isAutoMapOpen}
            onClose={() => setIsAutoMapOpen(false)}
            onAutoMap={handleAutoMap}
            loading={loading}
            title="Auto-Map Columns"
            description="Configure automatic column mapping"
          />
        </Suspense>

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
                      <h2 className="text-xl font-semibold text-gray-900">Column Mapping Help</h2>
                      <p className="text-sm text-gray-500">Learn how to use column mapping effectively</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHelp(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-3">How Column Mapping Works</h4>
                    <ul className="text-sm text-indigo-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-medium">•</span>
                        <span>Map column names from different surveys to standardized names</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-medium">•</span>
                        <span>Use auto-mapping for bulk processing with configurable confidence levels</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-medium">•</span>
                        <span>Review and edit mappings in the "Mapped Columns" tab</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-600 font-medium">•</span>
                        <span>Clear all mappings to reset the process and start over</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900">Key Features</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Auto-Mapping</h5>
                        <p className="text-sm text-gray-600">Bulk process unmapped columns with smart suggestions</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Manual Mapping</h5>
                        <p className="text-sm text-gray-600">Select and map individual columns with full control</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Data Type Matching</h5>
                        <p className="text-sm text-gray-600">System considers column names and data types for accuracy</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Search & Filter</h5>
                        <p className="text-sm text-gray-600">Quickly find specific columns across all surveys</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Best Practices</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Always review auto-mapped results for accuracy, especially for columns with similar names</li>
                      <li>• Use consistent column naming conventions in your source data for best results</li>
                      <li>• Contact support if you encounter persistent mapping issues</li>
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowHelp(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColumnMapping; 