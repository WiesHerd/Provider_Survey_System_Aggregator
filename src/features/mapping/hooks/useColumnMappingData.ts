import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDataService } from '../../../services/DataService';
import { IColumnMapping, IColumnInfo } from '../../../types/column';
import { useProviderContext } from '../../../contexts/ProviderContext';

/**
 * Custom hook for Column Mapping data management
 * Extracts all business logic from the main component
 */
export const useColumnMappingData = () => {
  // Provider context
  const { selectedProviderType } = useProviderContext();
  
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
  const [isLoadingData, setIsLoadingData] = useState(false);

  const dataService = useMemo(() => getDataService(), []);

  // Load data function
  const loadData = useCallback(async () => {
    if (isLoadingData) {
      return;
    }

    try {
      setIsLoadingData(true);
      setLoading(true);
      setError(null);
      
      const dataProviderType = selectedProviderType === 'BOTH' ? undefined : selectedProviderType;
      
      const [mappingsData, unmappedData, learnedData] = await Promise.all([
        dataService.getAllColumnMappings(dataProviderType),
        dataService.getUnmappedColumns(dataProviderType),
        dataService.getLearnedMappings('column')
      ]);
      
      
      setMappings(mappingsData);
      setUnmappedColumns(unmappedData);
      setLearnedMappings(learnedData);
      setSelectedColumns([]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setIsLoadingData(false);
    }
  }, [dataService, selectedProviderType]);

  // Filtered data
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm) return unmappedColumns;
    const searchLower = searchTerm.toLowerCase();
    return unmappedColumns.filter(column => 
      column.name.toLowerCase().includes(searchLower) ||
      column.surveySource.toLowerCase().includes(searchLower)
    );
  }, [unmappedColumns, searchTerm]);

  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return mappings;
    const searchLower = mappedSearchTerm.toLowerCase();
    return mappings.filter(mapping => 
      mapping.standardizedName.toLowerCase().includes(searchLower) ||
      mapping.sourceColumns.some(col => col.name.toLowerCase().includes(searchLower))
    );
  }, [mappings, mappedSearchTerm]);

  const filteredLearned = useMemo(() => {
    if (!mappedSearchTerm) return learnedMappings;
    const searchLower = mappedSearchTerm.toLowerCase();
    const filtered: Record<string, string> = {};
    Object.entries(learnedMappings).forEach(([original, corrected]) => {
      if (original.toLowerCase().includes(searchLower) || corrected.toLowerCase().includes(searchLower)) {
        filtered[original] = corrected;
      }
    });
    return filtered;
  }, [learnedMappings, mappedSearchTerm]);

  // Selection handlers
  const selectColumn = useCallback((column: IColumnInfo) => {
    setSelectedColumns(prev => {
      if (prev.some(c => c.id === column.id)) {
        return prev.filter(c => c.id !== column.id);
      }
      return [...prev, column];
    });
  }, []);

  const clearSelectedColumns = useCallback(() => {
    setSelectedColumns([]);
  }, []);

  const selectAllColumns = useCallback(() => {
    setSelectedColumns([...filteredUnmapped]);
  }, [filteredUnmapped]);

  const deselectAllColumns = useCallback(() => {
    setSelectedColumns([]);
  }, []);

  // Mapping operations
  const createMapping = useCallback(async (standardizedName: string, columns: IColumnInfo[]) => {
    try {
      const mapping: IColumnMapping = {
        id: `mapping_${Date.now()}`,
        standardizedName,
        sourceColumns: columns,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await dataService.createColumnMapping(mapping);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  }, [dataService, loadData]);

  const createGroupedMapping = useCallback(async (standardizedName: string, columns: IColumnInfo[]) => {
    try {
      const mapping: IColumnMapping = {
        id: `mapping_${Date.now()}`,
        standardizedName,
        sourceColumns: columns,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await dataService.createColumnMapping(mapping);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create mapping');
    }
  }, [dataService, loadData]);

  const deleteMapping = useCallback(async (mappingId: string) => {
    try {
      await dataService.deleteColumnMapping(mappingId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete mapping');
    }
  }, [dataService, loadData]);

  const removeLearnedMapping = useCallback(async (original: string) => {
    try {
      await dataService.removeLearnedMapping('column', original);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove learned mapping');
    }
  }, [dataService, loadData]);

  // Load data on mount and when provider type changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Data
    mappings,
    unmappedColumns,
    selectedColumns,
    learnedMappings,
    loading,
    error,
    activeTab,
    searchTerm,
    mappedSearchTerm,
    filteredUnmapped,
    filteredMappings,
    filteredLearned,
    
    // Actions
    setActiveTab,
    selectColumn,
    clearSelectedColumns,
    selectAllColumns,
    deselectAllColumns,
    setSearchTerm,
    setMappedSearchTerm,
    createMapping,
    createGroupedMapping,
    deleteMapping,
    removeLearnedMapping,
    loadData,
    clearError: () => setError(null)
  };
};
