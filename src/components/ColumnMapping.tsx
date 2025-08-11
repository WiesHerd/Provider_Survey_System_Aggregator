import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  TextField,
  Dialog,
  Chip,
  Typography,
  Alert,
  InputAdornment,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { 
  PlusIcon as AddIcon,
  MagnifyingGlassIcon as SearchIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon,
  ExclamationTriangleIcon as WarningIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ArrowPathIcon as RefreshIcon
} from '@heroicons/react/24/outline';
import { ColumnMappingService } from '../services/ColumnMappingService';
import { LocalStorageService } from '../services/StorageService';
import { IColumnMapping, IColumnInfo } from '../types/column';
import MappedColumns from './MappedColumns';
import AutoMapColumns from './AutoMapColumns';
import AutoMapDialog from './shared/AutoMapDialog';
import LoadingSpinner from './ui/loading-spinner';

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

  const mappingService = new ColumnMappingService(new LocalStorageService());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mappingsData, unmappedData] = await Promise.all([
        mappingService.getAllMappings(),
        mappingService.getUnmappedColumns()
      ]);
      setMappings(mappingsData);
      setUnmappedColumns(unmappedData);
      setError(null);
    } catch (err) {
      setError('Failed to load column data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

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

  // Filter mapped columns based on search
  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return mappings;
    return mappings.filter(mapping => 
      mapping.standardizedName.toLowerCase().includes(mappedSearchTerm.toLowerCase())
    );
  }, [mappings, mappedSearchTerm]);

  const handleCreateMapping = async () => {
    if (selectedColumns.length === 0) return;

    try {
      // Use the first column name as the standardized name
      const standardizedName = selectedColumns[0].name;
      
      const sourceColumns = selectedColumns.map(column => ({
        id: crypto.randomUUID(),
        name: column.name,
        surveySource: column.surveySource,
        dataType: column.dataType,
        mappingId: ''
      }));

      const mapping = await mappingService.createMapping(standardizedName, sourceColumns);
      setMappings([...mappings, mapping]);
      setUnmappedColumns(unmappedColumns.filter(
        c => !selectedColumns.some(selected => selected.id === c.id)
      ));
      setSelectedColumns([]);
      setActiveTab('mapped'); // Switch to mapped view after creating
    } catch (err) {
      setError('Failed to create mapping');
      console.error('Error creating mapping:', err);
    }
  };

  const handleColumnSelect = (column: IColumnInfo) => {
    if (selectedColumns.some(c => c.id === column.id)) {
      setSelectedColumns(selectedColumns.filter(c => c.id !== column.id));
    } else {
      setSelectedColumns([...selectedColumns, column]);
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      console.log('Deleting mapping:', mappingId);
      await mappingService.deleteMapping(mappingId);
      
      // Wait a moment for backend to process the deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove from local state
      setMappings(mappings.filter(m => m.id !== mappingId));
      
      // Refresh unmapped columns to show the deleted ones
      console.log('Refreshing unmapped columns...');
      const unmappedData = await mappingService.getUnmappedColumns();
      console.log('Unmapped columns after delete:', unmappedData.length);
      setUnmappedColumns(unmappedData);
      
      // Switch to unmapped tab
      setActiveTab('unmapped');
    } catch (err) {
      setError('Failed to delete mapping');
      console.error('Error deleting mapping:', err);
    }
  };

  const handleAutoMap = async (config: {
    confidenceThreshold: number;
    useExistingMappings: boolean;
    enableFuzzyMatching: boolean;
  }) => {
    try {
      setLoading(true);
      const mappingConfig = {
        confidenceThreshold: config.confidenceThreshold,
        includeDataTypeMatching: config.enableFuzzyMatching
      };

      const suggestions = await mappingService.autoMapColumns(mappingConfig);

      // Create mappings from suggestions
      for (const suggestion of suggestions) {
        await mappingService.createMapping(
          suggestion.standardizedName,
          suggestion.columns
        );
      }

      // Wait a moment for backend to process, then refresh data
      await new Promise(resolve => setTimeout(resolve, 500));
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
      <div className="mx-6">
        {/* Collapsible Help Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowHelp((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-medium mb-2"
          >
            <span className="flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-indigo-600" />
              <span>Column Mapping Help</span>
            </span>
            <ChevronDownIcon 
              className={`h-5 w-5 text-indigo-600 transition-transform duration-200 ${showHelp ? 'rotate-180' : ''}`}
            />
          </button>
          {showHelp && (
            <div className="p-4 bg-white border border-indigo-100 rounded shadow text-sm space-y-3">
              <h3 className="font-bold text-indigo-700 mb-1">How Auto-Mapping Works</h3>
              <ul className="list-disc pl-5 mb-2">
                <li>The app uses smart matching to suggest standardized column names for each survey's data columns.</li>
                <li>Auto-mapping considers column names, data types, and patterns to suggest the most likely matches.</li>
                <li>You can adjust the confidence threshold and enable/disable fuzzy matching in the Auto-Map dialog.</li>
              </ul>
              <h3 className="font-bold text-indigo-700 mb-1">How to Review and Fix Mappings</h3>
              <ul className="list-disc pl-5 mb-2">
                <li>After auto-mapping, review the suggested mappings in the "Mapped" tab.</li>
                <li>If a column is mapped incorrectly, you can delete the mapping and manually remap it by selecting the correct columns and clicking "Create Mapping."</li>
                <li>Use the search bar to quickly find and review specific columns.</li>
                <li>Clearing all mappings will reset the process and allow you to start over.</li>
              </ul>
              <h3 className="font-bold text-indigo-700 mb-1">Best Practices</h3>
              <ul className="list-disc pl-5">
                <li>Always review auto-mapped results for accuracy, especially for columns with similar names or purposes.</li>
                <li>Use consistent column naming conventions in your source data for best results.</li>
                <li>Contact support if you encounter persistent mapping issues.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Tabs and Action Buttons */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Tabs 
                value={activeTab} 
                onChange={(_event: React.SyntheticEvent, newValue: 'unmapped' | 'mapped') => setActiveTab(newValue)}
                sx={{ 
                  '& .MuiTab-root': { 
                    fontSize: '0.875rem', 
                    fontWeight: 500,
                    textTransform: 'none',
                    minHeight: '40px',
                    padding: '8px 16px'
                  }
                }}
              >
                <Tab label="Unmapped Columns" value="unmapped" />
                <Tab label="Mapped Columns" value="mapped" />
              </Tabs>
              
              <div className="flex space-x-2">
                <Button
                  variant="outlined"
                  onClick={loadData}
                  startIcon={<RefreshIcon className="h-4 w-4" />}
                  disabled={loading}
                  size="small"
                  sx={{ fontSize: '0.875rem', textTransform: 'none' }}
                >
                  Refresh
                </Button>
                {activeTab !== 'mapped' && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setIsAutoMapOpen(true)}
                    startIcon={<BoltIcon className="h-4 w-4" />}
                    size="small"
                    sx={{ fontSize: '0.875rem', textTransform: 'none' }}
                  >
                    Auto-Map Columns
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleCreateMapping}
                  startIcon={<AddIcon className="h-4 w-4" />}
                  disabled={selectedColumns.length === 0}
                  size="small"
                  sx={{ fontSize: '0.875rem', textTransform: 'none' }}
                >
                  Create Mapping
                </Button>
                {activeTab === 'mapped' && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to clear all mappings? This cannot be undone.')) {
                        try {
                          console.log('User confirmed clear all mappings');
                          await mappingService.clearAllMappings();
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
                    startIcon={<DeleteSweepIcon className="h-4 w-4" />}
                    size="small"
                    sx={{ fontSize: '0.875rem', textTransform: 'none' }}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'unmapped' ? (
              <>
                <div className="mb-4">
                  <TextField
                    fullWidth
                    placeholder="Search across all surveys..."
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
                    }}
                  />
                </div>

                {selectedColumns.length > 0 && (
                  <div className="mb-4">
                    <Typography variant="subtitle2" className="mb-2 text-sm">
                      Selected Columns:
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {selectedColumns.map((column) => (
                        <Chip
                          key={column.id}
                          label={`${column.name} (${column.surveySource})`}
                          onDelete={() => handleColumnSelect(column)}
                          color="primary"
                          size="small"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(columnsBySurvey.entries()).map(([source, columns]) => {
                    const color = source === 'SullivanCotter' ? '#818CF8' :
                                source === 'MGMA' ? '#34D399' :
                                source === 'Gallagher' ? '#F472B6' :
                                source === 'ECG' ? '#FBBF24' :
                                source === 'AMGA' ? '#60A5FA' : '#9CA3AF';
                    
                    return (
                      <Paper key={source} className="p-3 relative overflow-hidden">
                        <Typography variant="h6" className="mb-3 flex items-center justify-between text-sm font-medium">
                          <span style={{ color }}>{source}</span>
                          <Typography variant="caption" color="textSecondary" className="text-xs">
                            {columns.length} columns
                          </Typography>
                        </Typography>
                        <div className="space-y-1.5">
                          {columns.map((column) => (
                            <ColumnCard
                              key={column.id}
                              column={column}
                              isSelected={selectedColumns.some(c => c.id === column.id)}
                              onSelect={handleColumnSelect}
                            />
                          ))}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-1" style={{ backgroundColor: color }} />
                      </Paper>
                    );
                  })}
                </div>

                {Array.from(columnsBySurvey.entries()).length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <WarningIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <Typography variant="h6" color="textSecondary" className="mb-2 text-sm">
                      No Unmapped Columns Found
                    </Typography>
                    <Typography variant="body2" color="textSecondary" className="mb-3 text-sm">
                      {searchTerm 
                        ? "No columns match your search criteria"
                        : "All columns have been mapped or no survey data is available"
                      }
                    </Typography>
                    {!searchTerm && (
                      <Button
                        variant="outlined"
                        onClick={() => loadData()}
                        startIcon={<BoltIcon className="h-4 w-4" />}
                        size="small"
                        sx={{ fontSize: '0.875rem', textTransform: 'none' }}
                      >
                        Refresh Data
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="mb-4">
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
                    }}
                  />
                </div>

                <div className="space-y-3">
                  {filteredMappings.map((mapping) => (
                    <MappedColumns
                      key={mapping.id}
                      mapping={mapping}
                      onDelete={() => handleDelete(mapping.id)}
                    />
                  ))}
                </div>
                
                {filteredMappings.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">
                      {mappedSearchTerm 
                        ? "No mapped columns match your search"
                        : "No mapped columns yet"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auto-Map Dialog */}
      <Dialog
        open={isAutoMapOpen}
        onClose={() => setIsAutoMapOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <AutoMapDialog
          title="Auto-Map Columns"
          description="Automatically map columns based on similarity and data types."
          onClose={() => setIsAutoMapOpen(false)}
          onAutoMap={handleAutoMap}
        />
      </Dialog>
    </div>
  );
};

export default ColumnMapping; 