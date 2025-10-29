/**
 * Optimized Regional Analytics Component
 * Enterprise-grade performance with loading states and progress indicators
 */

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Alert,
  Chip,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { 
  ArrowPathIcon, 
  CpuChipIcon, 
  ChartBarIcon,
  CpuChipIcon as MemoryIcon
} from '@heroicons/react/24/outline';
import { useOptimizedRegionalData } from '../hooks/useOptimizedRegionalData';
import { PerformanceDashboard } from '../../mapping/components/PerformanceDashboard';
import { UnifiedLoadingSpinner } from '../../../shared/components/UnifiedLoadingSpinner';
import { useSmoothProgress } from '../../../shared/hooks/useSmoothProgress';

/**
 * Performance-optimized regional analytics component with enterprise-grade caching
 */
export const OptimizedRegionalAnalytics: React.FC = () => {
  // Performance state
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  
  // Use smooth progress for dynamic loading
  const { progress, startProgress, completeProgress } = useSmoothProgress({
    duration: 3000,
    maxProgress: 90,
    intervalMs: 100
  });

  // Optimized data hook
  const {
    analyticsData,
    loading,
    error,
    filteredData,
    regionalComparisonData,
    loadData,
    clearCache,
    getCacheStats,
    lastLoadTime,
    cacheHitRate
  } = useOptimizedRegionalData();

  // Performance monitoring
  const handleLoadData = useCallback(async () => {
    const startTime = performance.now();
    await loadData();
    const duration = performance.now() - startTime;
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
    
    if (cacheStats.totalEntries > 0) {
      indicators.push({
        label: 'Cache Entries',
        value: cacheStats.totalEntries.toString(),
        color: 'info'
      });
    }
    
    if (cacheHitRate > 0) {
      indicators.push({
        label: 'Cache Hit Rate',
        value: `${cacheHitRate}%`,
        color: cacheHitRate > 80 ? 'success' : cacheHitRate > 60 ? 'warning' : 'error'
      });
    }
    
    return indicators;
  }, [lastLoadTime, cacheStats, cacheHitRate]);

  // Start progress animation when loading begins
  React.useEffect(() => {
    if (loading) {
      console.log('🔄 Starting progress animation for Regional Analytics');
      startProgress();
    } else {
      console.log('✅ Completing progress animation for Regional Analytics');
      completeProgress();
    }
  }, [loading, startProgress, completeProgress]);

  // Loading state with progress
  if (loading) {
    return (
      <UnifiedLoadingSpinner
        message="Loading regional analytics..."
        recordCount={0}
        progress={progress}
        showProgress={true}
        overlay={true}
      />
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
              Optimized Regional Analytics
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

      {/* Data Summary */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <Typography variant="h6" className="text-gray-800 mb-4">
            Data Summary
          </Typography>
          
          <Box className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Box className="text-center">
              <Typography variant="h4" className="text-blue-600 font-bold">
                {analyticsData.length.toLocaleString()}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Total Records
              </Typography>
            </Box>
            
            <Box className="text-center">
              <Typography variant="h4" className="text-green-600 font-bold">
                {filteredData.length.toLocaleString()}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Filtered Records
              </Typography>
            </Box>
            
            <Box className="text-center">
              <Typography variant="h4" className="text-purple-600 font-bold">
                {regionalComparisonData.length}
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Regions
              </Typography>
            </Box>
            
            <Box className="text-center">
              <Typography variant="h4" className="text-orange-600 font-bold">
                {lastLoadTime.toFixed(0)}ms
              </Typography>
              <Typography variant="body2" className="text-gray-600">
                Load Time
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Regional Comparison Table */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <Typography variant="h6" className="text-gray-800 mb-4">
            Regional Comparison
          </Typography>
          
          <TableContainer component={Paper} className="border border-gray-200">
            <Table size="small">
              <TableHead>
                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold">Region</TableCell>
                  <TableCell className="font-semibold">Records</TableCell>
                  <TableCell className="font-semibold">TCC P50</TableCell>
                  <TableCell className="font-semibold">CF P50</TableCell>
                  <TableCell className="font-semibold">wRVU P50</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regionalComparisonData.map((region, index) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium capitalize">
                      {region.region}
                    </TableCell>
                    <TableCell>
                      {region.count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {region.tcc_p50 > 0 ? `$${region.tcc_p50.toLocaleString()}` : '***'}
                    </TableCell>
                    <TableCell>
                      {region.cf_p50 > 0 ? region.cf_p50.toFixed(2) : '***'}
                    </TableCell>
                    <TableCell>
                      {region.wrvu_p50 > 0 ? region.wrvu_p50.toLocaleString() : '***'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Box className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Typography variant="h6" className="text-blue-800 mb-2">
          🚀 Performance Tips
        </Typography>
        <Box className="space-y-1 text-sm text-blue-700">
          <Typography>• Cache hit rate above 80% indicates optimal performance</Typography>
          <Typography>• Load times under 1 second are considered excellent</Typography>
          <Typography>• Clear cache when switching between provider types</Typography>
          <Typography>• Refresh data after bulk operations for best results</Typography>
        </Box>
      </Box>
    </Box>
  );
};
