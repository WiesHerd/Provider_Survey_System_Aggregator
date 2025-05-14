import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Paper,
  Tabs,
  Tab,
  Box
} from '@mui/material';
import { 
  PlusIcon as AddIcon,
  MagnifyingGlassIcon as SearchIcon,
  BoltIcon,
  TrashIcon as DeleteSweepIcon
} from '@heroicons/react/24/outline';
import { ColumnMappingService } from '../services/ColumnMappingService';
import { LocalStorageService } from '../services/StorageService';
import { IColumnMapping, IColumnInfo } from '../types/column';
import MappedColumns from './MappedColumns';
import AutoMapColumns from './AutoMapColumns';
import AutoMapDialog from './shared/AutoMapDialog';

interface ColumnCardProps {
  column: IColumnInfo;
  isSelected: boolean;
  onSelect: (column: IColumnInfo) => void;
}

const ColumnCard: React.FC<ColumnCardProps> = ({ column, isSelected, onSelect }) => (
  <button
    onClick={() => onSelect(column)}
    className={`w-full p-3 mb-2 text-left rounded-lg transition-all ${
      isSelected 
        ? 'bg-indigo-100 border-2 border-indigo-500' 
        : 'bg-white hover:bg-gray-50 border border-gray-200'
    }`}
  >
    <div className="font-medium">{column.name}</div>
    <div className="text-sm text-gray-500">Type: {column.dataType}</div>
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
      await mappingService.deleteMapping(mappingId);
      // Remove from local state
      setMappings(mappings.filter(m => m.id !== mappingId));
      // Refresh unmapped columns to show the deleted ones
      const unmappedData = await mappingService.getUnmappedColumns();
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

    // Refresh data and close dialog
    await loadData();
    setActiveTab('mapped');
    setIsAutoMapOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="flex flex-col w-full">
        <div className="bg-white rounded-lg shadow mx-6">
          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          {/* Tabs and Action Buttons */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Tabs 
                value={activeTab} 
                onChange={(_, newValue) => setActiveTab(newValue)}
              >
                <Tab label="Unmapped Columns" value="unmapped" />
                <Tab label="Mapped Columns" value="mapped" />
              </Tabs>
              
              <div className="flex space-x-4">
                {activeTab !== 'mapped' && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setIsAutoMapOpen(true)}
                    startIcon={<BoltIcon className="h-5 w-5" />}
                  >
                    Auto-Map Columns
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={handleCreateMapping}
                  startIcon={<AddIcon className="h-5 w-5" />}
                  disabled={selectedColumns.length === 0}
                >
                  Create Mapping
                </Button>
                {activeTab === 'mapped' && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all mappings? This cannot be undone.')) {
                        mappingService.clearAllMappings().then(() => {
                          setMappings([]);
                          setActiveTab('unmapped');
                          loadData();
                        });
                      }
                    }}
                    startIcon={<DeleteSweepIcon className="h-5 w-5" />}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'unmapped' ? (
              <>
                <div className="mb-6">
                  <TextField
                    fullWidth
                    placeholder="Search across all surveys..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="h-5 w-5 text-gray-400" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>

                {selectedColumns.length > 0 && (
                  <div className="mb-6">
                    <Typography variant="subtitle2" className="mb-2">
                      Selected Columns:
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {selectedColumns.map((column) => (
                        <Chip
                          key={column.id}
                          label={`${column.name} (${column.surveySource})`}
                          onDelete={() => handleColumnSelect(column)}
                          color="primary"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from(columnsBySurvey.entries()).map(([source, columns]) => {
                    const color = source === 'SullivanCotter' ? '#818CF8' :
                                source === 'MGMA' ? '#34D399' :
                                source === 'Gallagher' ? '#F472B6' :
                                source === 'ECG' ? '#FBBF24' :
                                source === 'AMGA' ? '#60A5FA' : '#9CA3AF';
                    
                    return (
                      <Paper key={source} className="p-4 relative overflow-hidden">
                        <Typography variant="h6" className="mb-4 flex items-center justify-between">
                          <span style={{ color }}>{source}</span>
                          <Typography variant="caption" color="textSecondary">
                            {columns.length} columns
                          </Typography>
                        </Typography>
                        <div className="space-y-2">
                          {columns.map((column) => (
                            <ColumnCard
                              key={column.id}
                              column={column}
                              isSelected={selectedColumns.some(c => c.id === column.id)}
                              onSelect={handleColumnSelect}
                            />
                          ))}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 h-1.5" style={{ backgroundColor: color }} />
                      </Paper>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div className="mb-6">
                  <TextField
                    fullWidth
                    placeholder="Search mapped columns..."
                    value={mappedSearchTerm}
                    onChange={(e) => setMappedSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon className="h-5 w-5 text-gray-400" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>

                <div className="space-y-4">
                  {filteredMappings.map((mapping) => (
                    <MappedColumns
                      key={mapping.id}
                      mapping={mapping}
                      onDelete={() => handleDelete(mapping.id)}
                    />
                  ))}
                </div>
                
                {filteredMappings.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">
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