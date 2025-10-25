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
import { InlineSpinner, ButtonSpinner } from '../shared/components';
import { getDataService } from '../services/DataService';
import { IndexedDBInspector } from '../utils/indexedDBInspector';
// LearnedMappingsTrigger removed - functionality moved to mapping features

interface StorageStats {
  usedSpace: number;
  surveys: number;
  lastUpdated: string;
}

interface SystemSettingsConfig {
  exportFormat: 'csv' | 'json';
  autoRefresh: boolean;
  showAdvancedOptions: boolean;
  dataRetention: number;
}

const SystemSettings: React.FC = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [settings, setSettings] = useState<SystemSettingsConfig>({
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

      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data' });
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    if (!window.confirm('Are you sure you want to delete ALL survey data? This action cannot be undone and will remove all uploaded surveys, mappings, and analytics data.')) {
      return;
    }

    setLoading(true);
    try {
      await indexedDBInspector.clearAllData();
      await loadStorageStats();
      setMessage({ type: 'success', text: 'All data cleared successfully!' });
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
    setMessage({ type: 'success', text: 'Settings saved successfully!' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                System Settings
              </h1>
              <p className="mt-2 text-lg text-gray-600">
                Manage your data storage, export preferences, and system configuration
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                <CircleStackIcon className="w-4 h-4" />
                <span>IndexedDB Storage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 flex items-center p-4 rounded-xl border ${
            message.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
            ) : (
              <XCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Storage & Data Management */}
          <div className="xl:col-span-2 space-y-8">
            {/* Storage Overview */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">Storage Overview</h2>
                  <p className="text-gray-600">Monitor your data usage and storage status</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CircleStackIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              {storageStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Total Surveys</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">{storageStats.surveys}</div>
                    <div className="text-xs text-gray-500 mt-1">Active datasets</div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Storage Used</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{formatBytes(storageStats.usedSpace)}</div>
                    <div className="text-xs text-gray-500 mt-1">Local storage</div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Last Updated</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {new Date(storageStats.lastUpdated).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(storageStats.lastUpdated).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center">
                  <InlineSpinner message="Clearing data..." size="md" />
                  <p className="text-gray-500">Loading storage information...</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => loadStorageStats()}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <ChartBarIcon className="w-4 h-4 mr-2" />
                  Refresh Stats
                </button>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
                    <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Data Management</h2>
                    <p className="text-gray-600">Export your data or clear all stored information</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={exportAllData}
                    disabled={loading}
                    className="group relative bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                        <ArrowDownTrayIcon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-semibold">Export All Data</div>
                        <div className="text-blue-100 text-sm">Download as JSON backup</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={clearAllData}
                    disabled={loading}
                    className="group relative bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-6 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-all duration-200"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center mr-4">
                        <TrashIcon className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-semibold">Clear All Data</div>
                        <div className="text-red-100 text-sm">Permanently delete all data</div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <strong>Important:</strong> Your data is stored locally in your browser. 
                      Clearing data will permanently remove all surveys and mappings. 
                      Use the export feature to create backups before clearing data.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Settings & Info */}
          <div className="space-y-8">
            {/* Export Settings */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Cog6ToothIcon className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Export Settings</h3>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Default Export Format
                  </label>
                  <select
                    value={settings.exportFormat}
                    onChange={(e) => setSettings((prev: SystemSettingsConfig) => ({ ...prev, exportFormat: e.target.value as 'csv' | 'json' }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
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
                    onChange={(e) => setSettings((prev: SystemSettingsConfig) => ({ ...prev, autoRefresh: e.target.checked }))}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRefresh" className="ml-3 text-sm text-gray-700">
                    Auto-refresh data on page load
                  </label>
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                >
                  Save Settings
                </button>
              </div>
            </div>

            {/* Learned Mappings Management */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-8 py-6 border-b border-gray-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                    <Cog6ToothIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Learned Mappings</h2>
                    <p className="text-gray-600">Apply your learned mappings to existing survey data</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="text-center text-gray-500">
                  <p>Learned mappings functionality has been moved to the mapping features.</p>
                  <p className="mt-2">Use the mapping screens to manage learned mappings.</p>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <InformationCircleIcon className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Storage Type</span>
                  <span className="text-sm font-medium text-gray-900">IndexedDB (Local)</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Browser</span>
                  <span className="text-sm font-medium text-gray-900">
                    {navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                     navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                     navigator.userAgent.includes('Safari') ? 'Safari' : 
                     navigator.userAgent.includes('Edge') ? 'Edge' : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">App Version</span>
                  <span className="text-sm font-medium text-gray-900">1.0.0</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Data Location</span>
                  <span className="text-sm font-medium text-gray-900">Browser Storage</span>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-blue-800">
                  <strong>Pro Tip:</strong> Your data is stored locally in your browser. 
                  For backup, use the export feature regularly to save your work.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 flex items-center space-x-4 shadow-2xl">
            <ButtonSpinner size="md" />
            <span className="text-gray-700 font-medium">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
