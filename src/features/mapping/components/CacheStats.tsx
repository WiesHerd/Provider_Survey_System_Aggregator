/**
 * Cache Statistics Component
 * Shows real-time cache performance metrics
 */

import React, { memo, useState, useEffect } from 'react';
import { ChartBarIcon, ClockIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { useMappingCache } from '../hooks/useMappingCache';

interface CacheStatsProps {
  className?: string;
}

export const CacheStats: React.FC<CacheStatsProps> = memo(({ className = '' }) => {
  const cache = useMappingCache();
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(cache.getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [cache]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getHitRateColor = (hitRate: number): string => {
    if (hitRate >= 80) return 'text-green-600';
    if (hitRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHitRateIcon = (hitRate: number) => {
    if (hitRate >= 80) return '🟢';
    if (hitRate >= 60) return '🟡';
    return '🔴';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <CpuChipIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Cache Performance</span>
          <span className="text-xs text-gray-500">
            {getHitRateIcon(stats.hitRate)} {stats.hitRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <ChartBarIcon className="h-4 w-4" />
            <span>{stats.totalEntries} entries</span>
          </div>
          <div className="flex items-center space-x-1">
            <ClockIcon className="h-4 w-4" />
            <span>{formatBytes(stats.totalSize)}</span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hit Rate */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHitRateColor(stats.hitRate)}`}>
                {stats.hitRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Cache Hit Rate</div>
              <div className="text-xs text-gray-400 mt-1">
                {stats.hitRate >= 80 ? 'Excellent' : 
                 stats.hitRate >= 60 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>

            {/* Total Entries */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalEntries}
              </div>
              <div className="text-xs text-gray-500">Cached Entries</div>
              <div className="text-xs text-gray-400 mt-1">
                Mappings, Unmapped, Learned
              </div>
            </div>

            {/* Cache Size */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatBytes(stats.totalSize)}
              </div>
              <div className="text-xs text-gray-500">Memory Usage</div>
              <div className="text-xs text-gray-400 mt-1">
                JSON serialized size
              </div>
            </div>
          </div>

          {/* Cache Status */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-xs text-gray-600">Mappings</span>
              <span className={`text-xs px-2 py-1 rounded ${
                cache.isCached('mappings') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {cache.isCached('mappings') ? 'Cached' : 'Not Cached'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-xs text-gray-600">Unmapped</span>
              <span className={`text-xs px-2 py-1 rounded ${
                cache.isCached('unmappedSpecialties') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {cache.isCached('unmappedSpecialties') ? 'Cached' : 'Not Cached'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-xs text-gray-600">Learned</span>
              <span className={`text-xs px-2 py-1 rounded ${
                cache.isCached('learnedMappings') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {cache.isCached('learnedMappings') ? 'Cached' : 'Not Cached'}
              </span>
            </div>
          </div>

          {/* Cache Actions */}
          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => cache.invalidateAllCache()}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Clear Cache
            </button>
            <button
              onClick={() => setStats(cache.getCacheStats())}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              Refresh Stats
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

CacheStats.displayName = 'CacheStats';






























