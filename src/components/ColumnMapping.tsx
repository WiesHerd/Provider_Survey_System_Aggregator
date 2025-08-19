import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  PlusIcon as AddIcon,
  MagnifyingGlassIcon as SearchIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ArrowPathIcon as RefreshIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { Dialog } from '@mui/material';
import { getDataService } from '../services/DataService';
import { IColumnMapping, IColumnInfo } from '../types/column';
import LoadingSpinner from './ui/loading-spinner';

// Lazy load components for better performance
const MappedColumns = lazy(() => import('./MappedColumns').then(module => ({ default: module.default })));
const AutoMapDialog = lazy(() => import('./shared/AutoMapDialog').then(module => ({ default: module.default })));

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
    enableFuzzyMatching: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the auto-mapping service
      const suggestions = await dataService.autoMapColumns({
        confidenceThreshold: config.confidenceThreshold,
        includeDataTypeMatching: config.enableFuzzyMatching
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

        {/* Help Section */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                aria-label={showHelp ? "Collapse help section" : "Expand help section"}
              >
                {showHelp ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>
              <h3 className="text-lg font-semibold text-gray-900">Column Mapping Help</h3>
            </div>
            <div className="flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          
          {showHelp && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-900 mb-2">How Auto-Mapping Works</h4>
                <ul className="text-sm text-indigo-800 space-y-1 mb-4">
                  <li>• The app uses smart matching to suggest standardized column names for each survey's data columns</li>
                  <li>• Auto-mapping considers column names, data types, and patterns to suggest the most likely matches</li>
                  <li>• You can adjust the confidence threshold and enable/disable fuzzy matching in the Auto-Map dialog</li>
                </ul>
                <h4 className="font-semibold text-indigo-900 mb-2">How to Review and Fix Mappings</h4>
                <ul className="text-sm text-indigo-800 space-y-1 mb-4">
                  <li>• After auto-mapping, review the suggested mappings in the "Mapped" tab</li>
                  <li>• If a column is mapped incorrectly, you can delete the mapping and manually remap it</li>
                  <li>• Use the search bar to quickly find and review specific columns</li>
                  <li>• Clearing all mappings will reset the process and allow you to start over</li>
                </ul>
                <h4 className="font-semibold text-indigo-900 mb-2">Best Practices</h4>
                <ul className="text-sm text-indigo-800 space-y-1">
                  <li>• Always review auto-mapped results for accuracy, especially for columns with similar names</li>
                  <li>• Use consistent column naming conventions in your source data for best results</li>
                  <li>• Contact support if you encounter persistent mapping issues</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Main Mapping Section */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Column Mapping</h3>
            <div className="flex space-x-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshIcon className="h-4 w-4 mr-2" />
                Refresh
              </button>
              {activeTab !== 'mapped' && (
                <button
                  onClick={() => setIsAutoMapOpen(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <BoltIcon className="h-4 w-4 mr-2" />
                  Auto-Map Columns
                </button>
              )}
              <button
                onClick={handleCreateMapping}
                disabled={selectedColumns.length === 0}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AddIcon className="h-4 w-4 mr-2" />
                Create Mapping
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
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                  <DeleteSweepIcon className="h-4 w-4 mr-2" />
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
        <Dialog
          open={isAutoMapOpen}
          onClose={() => setIsAutoMapOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
            <AutoMapDialog
              title="Auto-Map Columns"
              description="Automatically map columns based on similarity and data types."
              onClose={() => setIsAutoMapOpen(false)}
              onAutoMap={handleAutoMap}
            />
          </Suspense>
        </Dialog>
      </div>
    </div>
  );
};

export default ColumnMapping; 