/**
 * Optimized Specialty Mapping Component
 * Enterprise-grade performance with loading states and progress indicators
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  CircularProgress, 
  LinearProgress, 
  Typography, 
  Alert,
  Chip,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  ArrowPathIcon, 
  CpuChipIcon, 
  ChartBarIcon,
  CpuChipIcon as MemoryIcon
} from '@heroicons/react/24/outline';
import { useOptimizedMappingData } from '../hooks/useOptimizedMappingData';
import { SpecialtyMappingHeader } from './SpecialtyMappingHeader';
import { SpecialtyMappingContent } from './SpecialtyMappingContent';
import { PerformanceDashboard } from './PerformanceDashboard';

interface OptimizedSpecialtyMappingProps {
  onMappingChange?: (mappings: any[]) => void;
  onUnmappedChange?: (unmapped: any[]) => void;
}

/**
 * Performance-optimized specialty mapping component with enterprise-grade caching
 */
export const OptimizedSpecialtyMapping: React.FC<OptimizedSpecialtyMappingProps> = ({
  onMappingChange,
  onUnmappedChange
}) => {
  // Performance state
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  // Cross-category mapping toggle (Call Pay, Physician, APP)
  // Default to false (filtered by current Data View selection) to match expected UI behavior
  const [showAllProviderTypes, setShowAllProviderTypes] = useState(false);

  // Optimized data hook
  const {
    mappings,
    unmappedSpecialties,
    selectedSpecialties,
    learnedMappings,
    learnedMappingsWithSource,
    loading,
    error,
    activeTab,
    searchTerm,
    mappedSearchTerm,
    filteredUnmapped,
    specialtiesBySurvey,
    filteredMappings,
    filteredLearned,
    setActiveTab,
    setSelectedSpecialties,
    selectSpecialty,
    deselectSpecialty,
    clearSelectedSpecialties,
    selectAllSpecialties,
    deselectAllSpecialties,
    loadData,
    createMapping,
    createIndividualMappings,
    createGroupedMapping,
    deleteMapping,
    clearAllMappings,
    removeLearnedMapping,
    clearAllLearnedMappings,
    applyAllLearnedMappings,
    setSearchTerm,
    setMappedSearchTerm,
    clearError,
    refreshData,
    clearCache,
    getCacheStats
  } = useOptimizedMappingData();

  // Performance monitoring
  const handleLoadData = useCallback(async () => {
    const startTime = performance.now();
    await loadData();
    const duration = performance.now() - startTime;
    setLastLoadTime(duration);
    console.log(`🚀 Data loaded in ${duration.toFixed(2)}ms`);
  }, [loadData]);

  // Cache statistics
  const cacheStats = useMemo(() => getCacheStats(), [getCacheStats]);

  // Performance indicators
  const performanceIndicators = useMemo(() => {
    const indicators = [];
    
    if (lastLoadTime > 0) {
      indicators.push({
        label: 'Last Load Time',
        value: `${lastLoadTime.toFixed(0)}ms`,
        color: lastLoadTime < 1000 ? 'success' : lastLoadTime < 3000 ? 'warning' : 'error'
      });
    }
    
    if (cacheStats.size > 0) {
      indicators.push({
        label: 'Cache Entries',
        value: cacheStats.size.toString(),
        color: 'info'
      });
    }
    
    return indicators;
  }, [lastLoadTime, cacheStats]);

  // Loading state with progress
  if (loading) {
    return (
      <Box className="p-6">
        <Box className="flex items-center justify-center mb-4">
          <CircularProgress size={40} className="mr-3" />
          <Typography variant="h6" className="text-gray-700">
            Loading Specialty Mapping Data...
          </Typography>
        </Box>
        
        <LinearProgress className="mb-4" />
        
        <Box className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <Typography variant="body2" className="text-blue-800 mb-2">
            🚀 Performance Optimizations Active
          </Typography>
          <Typography variant="body2" className="text-blue-600">
            • Intelligent caching enabled<br/>
            • Batch query processing<br/>
            • Parallel data loading<br/>
            • Memory optimization
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box className="p-6">
        <Alert severity="error" className="mb-4">
          <Typography variant="h6" className="mb-2">
            Failed to Load Data
          </Typography>
          <Typography variant="body2" className="mb-3">
            {error}
          </Typography>
          <Box className="flex space-x-2">
            <button
              onClick={handleLoadData}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Retry
            </button>
            <button
              onClick={clearCache}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <CpuChipIcon className="h-4 w-4 mr-2" />
              Clear Cache
            </button>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box className="space-y-4">
      {/* Performance Header */}
      <Box className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <Box className="flex items-center space-x-4">
          <Box className="flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5 text-blue-600" />
            <Typography variant="h6" className="text-blue-800 font-semibold">
              Optimized Specialty Mapping
            </Typography>
          </Box>
          
          {/* Performance Indicators */}
          <Box className="flex items-center space-x-2">
            {performanceIndicators.map((indicator, index) => (
              <Chip
                key={index}
                label={`${indicator.label}: ${indicator.value}`}
                size="small"
                color={indicator.color as any}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
        
        <Box className="flex items-center space-x-2">
          <Tooltip title="Refresh Data">
            <IconButton
              onClick={handleLoadData}
              size="small"
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear Cache">
            <IconButton
              onClick={clearCache}
              size="small"
              className="text-gray-600 hover:text-gray-700"
            >
              <CpuChipIcon className="h-4 w-4" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Performance Dashboard">
            <IconButton
              onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
              size="small"
              className="text-indigo-600 hover:text-indigo-700"
            >
              <MemoryIcon className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Performance Dashboard */}
      {showPerformanceDashboard && (
        <PerformanceDashboard
          cacheStats={cacheStats}
          lastLoadTime={lastLoadTime}
          onClearCache={clearCache}
          onRefreshData={handleLoadData}
        />
      )}

      {/* Main Content */}
      <SpecialtyMappingHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unmappedCount={unmappedSpecialties.length}
        mappedCount={mappings.length}
        learnedCount={Object.keys(learnedMappings).length}
        selectedCount={selectedSpecialties.length}
        isBulkSelected={selectedSpecialties.length > 0}
        allUnmappedCount={unmappedSpecialties.length}
        showAllProviderTypes={showAllProviderTypes}
        onToggleProviderTypeFilter={() => setShowAllProviderTypes(!showAllProviderTypes)}
        onShowHelp={() => {}}
        onToggleSelectAll={() => {}}
        onCreateMapping={createMapping}
        onCreateIndividualMappings={createIndividualMappings}
        onCreateGroupedMapping={createGroupedMapping}
        onClearAllMappings={clearAllMappings}
        onApplyAllLearnedMappings={applyAllLearnedMappings}
        onClearAllLearnedMappings={clearAllLearnedMappings}
      />

      <SpecialtyMappingContent
        activeTab={activeTab}
        mappings={mappings}
        unmappedSpecialties={unmappedSpecialties}
        selectedSpecialties={selectedSpecialties}
        unmappedSearchTerm={searchTerm}
        onUnmappedSearchChange={setSearchTerm}
        onSpecialtySelect={selectSpecialty}
        onSpecialtyDeselect={deselectSpecialty}
        onClearSelection={clearSelectedSpecialties}
        onRefresh={handleLoadData}
        showAllProviderTypes={showAllProviderTypes}
        onToggleProviderTypeFilter={() => setShowAllProviderTypes(!showAllProviderTypes)}
        mappedSearchTerm={mappedSearchTerm}
        onMappedSearchChange={setMappedSearchTerm}
        onDeleteMapping={deleteMapping}
        learnedMappings={learnedMappings}
        learnedMappingsWithSource={learnedMappingsWithSource}
        learnedSearchTerm={mappedSearchTerm}
        onLearnedSearchChange={setMappedSearchTerm}
        onRemoveLearnedMapping={removeLearnedMapping}
        onApplyAllLearnedMappings={applyAllLearnedMappings}
      />
    </Box>
  );
};
