import React, { useState, useEffect } from 'react';
import { 
  ArrowDownTrayIcon, 
  TrashIcon, 
  Cog6ToothIcon,
  CircleStackIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { getDataService } from '../services/DataService';
import { IndexedDBInspector } from '../utils/indexedDBInspector';

interface StorageStats {
  usedSpace: number;
  surveys: number;
  lastUpdated: string;
}

interface SystemSettings {
  exportFormat: 'csv' | 'json';
  autoRefresh: boolean;
  showAdvancedOptions: boolean;
  dataRetention: number;
}

const SystemSettings: React.FC = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    exportFormat: 'json',
    autoRefresh: true,
    showAdvancedOptions: false,
    dataRetention: 30
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const dataService = getDataService();
  const indexedDBInspector = new IndexedDBInspector();

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      const status = await indexedDBInspector.getStatus();
      if (status) {
        const estimatedBytesPerSurvey = 5000;
        setStorageStats({
          usedSpace: status.totalSurveys * estimatedBytesPerSurvey,
          surveys: status.totalSurveys,
          lastUpdated: new Date().toLocaleString()
        });
      }
    } catch (error) {
      console.error('Error loading storage stats:', error);
    }
  };

  const exportAllData = async () => {
    setLoading(true);
    try {
      const surveys = await dataService.getAllSurveys();
      const exportData = {
        surveys,
        exportDate: new Date().toISOString(),
        version: '1.0',
        totalSurveys: surveys.length
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchpoint-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Are you sure you want to delete all survey data? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      await indexedDBInspector.clearAllData();
      await loadStorageStats();
      setMessage({ type: 'success', text: 'All data cleared successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear data' });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const saveSettings = () => {
    localStorage.setItem('benchpoint-settings', JSON.stringify(settings));
    setMessage({ type: 'success', text: 'Settings saved successfully' });
  };

  return (
    <>
      <div className="w-full min-h-screen">
        <div className="w-full flex flex-col gap-4">
          
          {/* Message Display */}
          {message && (
            <div className={`w-full flex items-center p-3 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              ) : (
                <XCircleIcon className="w-4 h-4 mr-2 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {/* Storage Overview */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Overview</h3>
            
            {storageStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{storageStats.surveys}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Surveys</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{formatBytes(storageStats.usedSpace)}</div>
                  <div className="text-sm text-gray-600 mt-1">Storage Used</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date(storageStats.lastUpdated).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Last Updated</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading storage information...</p>
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={loadStorageStats}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                <ChartBarIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Data Management */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <ArrowDownTrayIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Export All Data</div>
                    <div className="text-sm text-gray-500">Download as JSON backup</div>
                  </div>
                </div>
                <button
                  onClick={exportAllData}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Export
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <TrashIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Clear All Data</div>
                    <div className="text-sm text-gray-500">Permanently delete all data</div>
                  </div>
                </div>
                <button
                  onClick={clearAllData}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <strong>Note:</strong> Data is stored locally in your browser. Use the export feature to create backups before clearing data.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Settings */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Export Format
                </label>
                <select
                  value={settings.exportFormat}
                  onChange={(e) => setSettings(prev => ({ ...prev, exportFormat: e.target.value as 'csv' | 'json' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-sm"
                >
                  <option value="json">JSON (Recommended)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={settings.autoRefresh}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRefresh" className="ml-3 text-sm text-gray-700">
                  Auto-refresh data on page load
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={saveSettings}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Storage Type</span>
                <span className="text-sm font-medium text-gray-900">IndexedDB (Local)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Browser</span>
                <span className="text-sm font-medium text-gray-900">
                  {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 
                   navigator.userAgent.includes('Edge') ? 'Edge' : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">App Version</span>
                <span className="text-sm font-medium text-gray-900">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Data Location</span>
                <span className="text-sm font-medium text-gray-900">Browser Storage</span>
              </div>
            </div>

            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-700">
                <strong>Tip:</strong> Use the export feature regularly to backup your data.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3 shadow-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
            <span className="text-gray-700 font-medium">Processing...</span>
          </div>
        </div>
      )}
    </>
  );
};

export default SystemSettings;
