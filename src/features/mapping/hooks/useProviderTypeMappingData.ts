import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { IProviderTypeMapping, IUnmappedProviderType } from '../types/mapping';
import { getDataService } from '../../../services/DataService';
import { useProviderContext } from '../../../contexts/ProviderContext';
import { queryKeys } from '../../../shared/services/queryClient';
import { useProviderTypeMappingQuery } from './useProviderTypeMappingQuery';

interface UseProviderTypeMappingDataReturn {
  showAllCategories: boolean;
  setShowAllCategories: (value: boolean) => void;
  mappings: IProviderTypeMapping[];
  unmappedProviderTypes: IUnmappedProviderType[];
  selectedProviderTypes: IUnmappedProviderType[];
  learnedMappings: Record<string, string>;
  loading: boolean;
  error: string | null;
  activeTab: 'unmapped' | 'mapped' | 'learned';
  searchTerm: string;
  mappedSearchTerm: string;
  filteredUnmapped: IUnmappedProviderType[];
  filteredMappings: IProviderTypeMapping[];
  filteredLearned: Record<string, string>;
  setActiveTab: (tab: 'unmapped' | 'mapped' | 'learned') => void;
  selectProviderType: (providerType: IUnmappedProviderType) => void;
  clearSelectedProviderTypes: () => void;
  selectAllProviderTypes: () => void;
  deselectAllProviderTypes: () => void;
  loadData: (forceRefresh?: boolean) => Promise<void>;
  createMapping: () => Promise<void>;
  createGroupedMapping: (standardizedName: string, providerTypes: IUnmappedProviderType[]) => Promise<void>;
  deleteMapping: (mappingId: string) => Promise<void>;
  clearAllMappings: () => Promise<void>;
  removeLearnedMapping: (original: string) => void;
  setSearchTerm: (term: string) => void;
  setMappedSearchTerm: (term: string) => void;
  clearError: () => void;
}

/**
 * Provider type mapping data hook backed by TanStack Query (same pattern as useMappingData + useSpecialtyMappingQuery).
 * No refetch on mount — cache is used so return visits are instant. Invalidate only on create/delete/update.
 */
export const useProviderTypeMappingData = (): UseProviderTypeMappingDataReturn => {
  const queryClient = useQueryClient();
  const { selectedProviderType } = useProviderContext();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [selectedProviderTypes, setSelectedProviderTypes] = useState<IUnmappedProviderType[]>([]);
  const [activeTab, setActiveTab] = useState<'unmapped' | 'mapped' | 'learned'>('unmapped');
  const [searchTerm, setSearchTerm] = useState('');
  const [mappedSearchTerm, setMappedSearchTerm] = useState('');

  const {
    data: queryData,
    isLoading: queryLoading,
    error: queryError,
    refetch,
    mappings,
    unmapped,
    learned,
    createMapping: queryCreateMapping,
    deleteMapping: queryDeleteMapping,
    clearAllMappings: queryClearAllMappings,
    removeLearnedMapping: queryRemoveLearnedMapping,
  } = useProviderTypeMappingQuery(showAllCategories);

  const dataService = useMemo(() => getDataService(), []);

  useEffect(() => {
    if (queryData) {
      setSelectedProviderTypes([]);
    }
  }, [queryData]);

  const loading = queryLoading;
  const error = queryError
    ? (queryError instanceof Error ? queryError.message : String(queryError))
    : null;

  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mappings.providerType() });
      }
      await refetch();
    },
    [queryClient, refetch]
  );

  const selectProviderType = useCallback((providerType: IUnmappedProviderType) => {
    setSelectedProviderTypes((prev) =>
      prev.some((s) => s.id === providerType.id)
        ? prev.filter((s) => s.id !== providerType.id)
        : [...prev, providerType]
    );
  }, []);

  const clearSelectedProviderTypes = useCallback(() => setSelectedProviderTypes([]), []);
  const filteredUnmapped = useMemo(() => {
    if (!searchTerm) return unmapped;
    return unmapped.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.surveySource?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unmapped, searchTerm]);

  const filteredMappings = useMemo(() => {
    if (!mappedSearchTerm) return mappings;
    return mappings.filter(
      (m) =>
        m.standardizedName?.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
        m.sourceProviderTypes?.some((s: { providerType?: string }) =>
          s.providerType?.toLowerCase().includes(mappedSearchTerm.toLowerCase())
        )
    );
  }, [mappings, mappedSearchTerm]);

  const filteredLearned = useMemo(() => {
    if (!mappedSearchTerm) return learned;
    const out: Record<string, string> = {};
    Object.entries(learned).forEach(([k, v]) => {
      if (
        k.toLowerCase().includes(mappedSearchTerm.toLowerCase()) ||
        v.toLowerCase().includes(mappedSearchTerm.toLowerCase())
      )
        out[k] = v;
    });
    return out;
  }, [learned, mappedSearchTerm]);

  const selectAllProviderTypes = useCallback(() => {
    setSelectedProviderTypes([...filteredUnmapped]);
  }, [filteredUnmapped]);

  const deselectAllProviderTypes = useCallback(() => setSelectedProviderTypes([]), []);

  const createMapping = useCallback(async () => {
    if (selectedProviderTypes.length === 0) return;
    const mapping: any = {
      id: `providerType_${Date.now()}`,
      standardizedName: selectedProviderTypes[0].name,
      sourceProviderTypes: selectedProviderTypes.map((p) => ({
        providerType: p.name,
        surveySource: p.surveySource,
        frequency: p.frequency,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (selectedProviderType && selectedProviderType !== 'BOTH') mapping.providerType = selectedProviderType;
    await queryCreateMapping(mapping);
    setSelectedProviderTypes([]);
  }, [selectedProviderTypes, selectedProviderType, queryCreateMapping]);

  const createGroupedMapping = useCallback(
    async (standardizedName: string, providerTypes: IUnmappedProviderType[]) => {
      const mapping: any = {
        id: `providerType_group_${Date.now()}`,
        standardizedName,
        sourceProviderTypes: providerTypes.map((p) => ({
          providerType: p.name,
          surveySource: p.surveySource,
          frequency: p.frequency,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (selectedProviderType && selectedProviderType !== 'BOTH') mapping.providerType = selectedProviderType;
      await queryCreateMapping(mapping);
      for (const p of providerTypes) {
        try {
          await dataService.saveLearnedMapping(
            'providerType',
            p.name,
            standardizedName,
            selectedProviderType === 'BOTH' ? undefined : selectedProviderType,
            p.surveySource
          );
        } catch {
          // optional
        }
      }
      await refetch();
    },
    [queryCreateMapping, dataService, selectedProviderType, refetch]
  );

  const deleteMapping = useCallback(
    async (mappingId: string) => {
      await queryDeleteMapping(mappingId);
    },
    [queryDeleteMapping]
  );

  const clearAllMappings = useCallback(async () => {
    await queryClearAllMappings();
  }, [queryClearAllMappings]);

  const removeLearnedMapping = useCallback(
    async (original: string) => {
      await queryRemoveLearnedMapping(original);
    },
    [queryRemoveLearnedMapping]
  );

  const clearError = useCallback(() => {}, []);

  return {
    showAllCategories,
    setShowAllCategories,
    mappings,
    unmappedProviderTypes: unmapped,
    selectedProviderTypes,
    learnedMappings: learned,
    loading,
    error,
    activeTab,
    searchTerm,
    mappedSearchTerm,
    filteredUnmapped,
    filteredMappings,
    filteredLearned,
    setActiveTab,
    selectProviderType,
    clearSelectedProviderTypes,
    selectAllProviderTypes,
    deselectAllProviderTypes,
    loadData,
    createMapping,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
    setSearchTerm,
    setMappedSearchTerm,
    clearError,
  };
};
