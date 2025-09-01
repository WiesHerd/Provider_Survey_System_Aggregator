import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import {
  TextField,
  Typography,
  Paper,
  InputAdornment
} from '@mui/material';
import { 
  MagnifyingGlassIcon as SearchIcon,
  BoltIcon,
  LightBulbIcon,
  XMarkIcon,
  ExclamationTriangleIcon as WarningIcon
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

import { getDataService } from '../services/DataService';
import { IColumnMapping, IColumnInfo } from '../types/column';
import { LoadingSpinner, SuspenseSpinner } from '../shared/components';

// Lazy load components for better performance
const MappedColumns = lazy(() => import('./MappedColumns').then(module => ({ default: module.default })));
const AutoMapping = lazy(() => import('../features/mapping/components/AutoMapping').then(module => ({ default: module.AutoMapping })));
const LearnedColumnMappings = lazy(() => import('./LearnedColumnMappings').then(module => ({ default: module.default })));

interface ColumnCardProps {
  column: IColumnInfo;
  isSelected: boolean;
  onSelect: (column: IColumnInfo) => void;
}

// Helper function to get survey source color (copied from Specialty Mapping)
const getSurveySourceColor = (surveySource: string): string => {
  const colors: Record<string, string> = {
    'MGMA': '#10B981',      // Green
    'SullivanCotter': '#3B82F6',  // Blue
    'Gallagher': '#8B5CF6', // Purple
    'ECG': '#F59E0B',       // Amber
    'AMGA': '#EF4444',      // Red
    'Unknown': '#6B7280'    // Gray
  };
  return colors[surveySource] || colors['Unknown'];
};

const ColumnCard: React.FC<ColumnCardProps> = ({ column, isSelected, onSelect }) => {
  const handleClick = () => {
    onSelect(column);
  };

  return (
    <Paper 
      onClick={handleClick}
      role="button"
      className={`p-3 relative transition-all duration-200 border cursor-pointer ${
        isSelected 
          ? 'bg-indigo-50 border-2 border-indigo-500 ring-2 ring-indigo-200 shadow-md' 
          : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      style={{ 
        borderLeftColor: getSurveySourceColor(column.surveySource), 
        borderLeftWidth: isSelected ? '5px' : '3px' 
      }}
    >
      {/* Green checkmark for selected items */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow">
          <CheckIcon className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <Typography variant="subtitle1" className="font-medium text-gray-900 text-sm">
            {column.name}
          </Typography>
          <Typography variant="caption" className="text-gray-500 text-xs">
            Frequency: {(column as any).frequency || 'N/A'}
          </Typography>
        </div>
        <div className="ml-2">
          <Typography 
            variant="caption" 
            style={{ color: getSurveySourceColor(column.surveySource) }} 
            className="text-xs font-medium whitespace-nowrap"
          >
            {column.surveySource}
          </Typography>
        </div>
      </div>
    </Paper>
  );
};

// Memoized tab content component for instant switching
const TabContent = React.memo(({ 
  searchTerm, 
  setSearchTerm, 
  columnsBySurvey, 
  selectedColumns, 
  handleColumnSelect,
  onRefresh
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  columnsBySurvey: Map<string, IColumnInfo[]>;
  selectedColumns: IColumnInfo[];
  handleColumnSelect: (column: IColumnInfo) => void;
  onRefresh: () => void;
}) => {
  // Memoize search component to prevent re-renders (Material-UI style like Specialty Mapping)
  const searchComponent = useMemo(() => (
    <div className="mb-4">
      <TextField
        fullWidth
        placeholder="Search across all surveys..."
        value={searchTerm}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </InputAdornment>
          ),
        }}
        variant="outlined"
        size="small"
      />
    </div>
  ), [searchTerm, setSearchTerm]);

  // Memoize tab content to prevent unnecessary re-renders
  const content = useMemo(() => {
    return (
      <>
        {/* Search Bar */}
        {searchComponent}

        {/* Compensation Fields Grid - EXACT same layout as Specialty Mapping */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(columnsBySurvey.entries()).map(([source, columns]) => {
            const color = getSurveySourceColor(source);
            
            return (
              <Paper key={source} className="p-3 relative overflow-hidden">
                <Typography variant="h6" className="mb-3 flex items-center justify-between text-sm font-medium">
                  <span style={{ color }}>{source}</span>
                  <Typography variant="caption" color="textSecondary" className="text-xs">
                    {columns.length} fields
                  </Typography>
                </Typography>
                <div className="space-y-1.5">
                  {columns.map((column) => (
                    <ColumnCard
                      key={`${column.name}-${column.surveySource}`}
                      column={column}
                      isSelected={selectedColumns.some(c => c.name === column.name && c.surveySource === column.surveySource)}
                      onSelect={handleColumnSelect}
                    />
                  ))}
                </div>
                <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: color }} />
              </Paper>
            );
          })}
        </div>

        {/* Empty State - Consistent large cue with refresh action */}
        {Array.from(columnsBySurvey.entries()).length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-xl w-full border border-dashed border-gray-300 rounded-xl p-10 bg-gray-50">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <WarningIcon className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unmapped Columns Found</h3>
              <p className="text-gray-600 mb-4">All columns are mapped, or no survey data is available.</p>
              <button
                onClick={onRefresh}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                Refresh Data
              </button>
            </div>
          </div>
        )}
      </>
    );
  }, [searchComponent, columnsBySurvey, selectedColumns, handleColumnSelect, onRefresh]);

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
  const [learnedMappings, setLearnedMappings] = useState<Record<string, string>>({});
  
  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
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
      const [mappingsData, unmappedData, learnedData] = await Promise.all([
        dataService.getAllColumnMappings(),
        dataService.getUnmappedColumns(),
        dataService.getLearnedMappings('column')
      ]);
      
      console.log('Data load completed:', { 
        mappings: mappingsData.length, 
        unmapped: unmappedData.length,
        learned: Object.keys(learnedData).length
      });
      
      setMappings(mappingsData);
      setUnmappedColumns(unmappedData);
      setLearnedMappings(learnedData);
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

      // Save learned mappings for each selected column
      for (const column of selectedColumns) {
        try {
          await dataService.saveLearnedMapping('column', column.name, standardizedName);
        } catch (learnedError) {
          console.warn('Failed to save learned mapping for', column.name, learnedError);
        }
      }

      setSelectedColumns([]);
      
      // Refresh data without showing loading spinner for better UX
      await loadData();
    } catch (error) {
      console.error('Error creating mapping:', error);
      setError('Failed to create mapping. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Selection helpers (match specialty mapping experience)
  const handleSelectAll = useCallback(() => {
    setSelectedColumns(prevSelected => {
      const result = [...prevSelected];
      const exists = (c: IColumnInfo) => result.some(r => r.name === c.name && r.surveySource === c.surveySource);
      filteredUnmapped.forEach(c => {
        if (!exists(c)) result.push(c);
      });
      return result;
    });
  }, [filteredUnmapped]);

  const handleDeselectAll = useCallback(() => {
    setSelectedColumns([]);
  }, []);

  // Dynamic select/deselect all toggle
  const allUnmappedCount = filteredUnmapped.length;
  const [isBulkSelected, setIsBulkSelected] = useState(false);

  const handleToggleSelectAll = useCallback(() => {
    if (isBulkSelected) {
      setSelectedColumns([]);
      setIsBulkSelected(false);
    } else {
      setSelectedColumns(prevSelected => {
        const result = [...prevSelected];
        const exists = (c: IColumnInfo) => result.some(r => r.name === c.name && r.surveySource === c.surveySource);
        filteredUnmapped.forEach(c => { if (!exists(c)) result.push(c); });
        return result;
      });
      setIsBulkSelected(true);
    }
  }, [isBulkSelected, filteredUnmapped]);

  // Clear all mappings in mapped tab
  const handleClearAllMappings = async () => {
    if (!window.confirm('Clear all column mappings? This cannot be undone.')) return;
    try {
      setLoading(true);
      await dataService.clearAllColumnMappings();
      await loadData();
    } catch (e) {
      console.error('Failed to clear mappings:', e);
      setError('Failed to clear mappings');
    } finally {
      setLoading(false);
    }
  };

  // Remove learned mapping
  const handleRemoveLearnedMapping = async (original: string) => {
    try {
      await dataService.removeLearnedMapping('column', original);
      await loadData(); // Refresh to update learned mappings
    } catch (error) {
      console.error('Error removing learned mapping:', error);
      setError('Failed to remove learned mapping');
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

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mb-4">
              <button
                onClick={() => setIsAutoMapOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 border border-indigo-600"
                title="Auto Map Columns"
              >
                <BoltIcon className="h-4 w-4 mr-2" />
                Auto Map
              </button>

              {/* Google/Microsoft-style master checkbox with indeterminate state */}
              <button
                onClick={handleToggleSelectAll}
                disabled={allUnmappedCount === 0}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isBulkSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isBulkSelected && <CheckIcon className="w-4 h-4" />}
                {isBulkSelected ? `Selected (${allUnmappedCount})` : `Select (${allUnmappedCount})`}
              </button>

              {/* Clear All shown on Mapped tab */}
              {activeTab === 'mapped' && (
                <button
                  onClick={handleClearAllMappings}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 border border-red-300 hover:border-red-400"
                >
                  Clear All Mappings
                </button>
              )}
            </div>
          </div>

          {/* Tab Content - Optimized for instant switching */}
          <div className="min-h-[400px]">
            {activeTab === 'unmapped' ? (
              <TabContent
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                columnsBySurvey={columnsBySurvey}
                selectedColumns={selectedColumns}
                handleColumnSelect={handleColumnSelect}
                onRefresh={loadData}
              />
            ) : activeTab === 'learned' ? (
              <Suspense fallback={<SuspenseSpinner />}>
                <LearnedColumnMappings
                  learnedMappings={learnedMappings}
                  searchTerm={mappedSearchTerm}
                  onSearchChange={setMappedSearchTerm}
                  onRemoveMapping={handleRemoveLearnedMapping}
                />
              </Suspense>
            ) : (
              <div className="space-y-4">
                <div className="mb-4">
                  <TextField
                    fullWidth
                    placeholder="Search mapped compensation fields..."
                    value={mappedSearchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMappedSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="h-5 w-5 text-gray-400" />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    size="small"
                  />
                </div>
                <Suspense fallback={<SuspenseSpinner />}>
                  {/* Mapped Columns */}
                  <div className="space-y-3">
                    {mappings
                      .filter(mapping => 
                        mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
                        mapping.sourceColumns.some(col => col.name.toLowerCase().includes(mappedSearchTerm.toLowerCase()))
                      )
                      .sort((a, b) => {
                        // Define logical order for compensation columns
                        const order = ['n_orgs', 'n_incumbents', 'p25', 'p50', 'p75', 'p90'];
                        const aIndex = order.indexOf(a.standardizedName.toLowerCase());
                        const bIndex = order.indexOf(b.standardizedName.toLowerCase());
                        
                        // If both are in the order array, sort by their position
                        if (aIndex !== -1 && bIndex !== -1) {
                          return aIndex - bIndex;
                        }
                        // If only one is in the order array, prioritize it
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        // If neither is in the order array, sort alphabetically
                        return a.standardizedName.localeCompare(b.standardizedName);
                      })
                      .map((mapping) => (
                        <MappedColumns
                          key={mapping.id}
                          mapping={mapping}
                          selected={isBulkSelected}
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
            )}
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