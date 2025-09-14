/**
 * Provider-Aware Routes Component
 * 
 * This component handles routing logic based on the selected provider type,
 * enabling provider-specific views and data filtering.
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useProviderContext } from '../contexts/ProviderContext';
import { useProviderData } from '../hooks/useProviderData';
import { SuspenseSpinner, ProviderEmptyState } from '../shared/components';

// Lazy load route components
const SurveyUpload = lazy(() => import('./SurveyUpload'));
const SpecialtyMapping = lazy(() => import('../features/mapping').then(module => ({ default: module.SpecialtyMapping })));
const ColumnMapping = lazy(() => import('./ColumnMapping'));
const VariableMapping = lazy(() => import('../features/mapping').then(module => ({ default: module.VariableMapping })));
const RegionMapping = lazy(() => import('../features/mapping').then(module => ({ default: module.RegionMapping })));
const ProviderTypeMapping = lazy(() => import('../features/mapping').then(module => ({ default: module.ProviderTypeMapping })));
const SurveyAnalytics = lazy(() => import('../features/analytics/components/SurveyAnalytics'));
const RegionalAnalytics = lazy(() => import('./RegionalAnalytics'));
const SurveyRegionalAnalytics = lazy(() => import('./SurveyRegionalAnalytics').then(module => ({ default: module.SurveyRegionalAnalytics })));
const FairMarketValue = lazy(() => import('./FairMarketValue'));
const CustomReportsWrapper = lazy(() => import('./CustomReportsWrapper'));
const SystemSettings = lazy(() => import('./SystemSettings'));
const DownloadTest = lazy(() => import('./DownloadTest').then(module => ({ default: module.DownloadTest })));
const NormalizedDataScreen = lazy(() => import('../features/normalized/components/NormalizedDataScreen'));

// Provider-specific components
const PhysicianAnalytics = lazy(() => import('../features/analytics/components/PhysicianAnalytics'));
const APPAnalytics = lazy(() => import('../features/analytics/components/APPAnalytics'));
const PhysicianFMV = lazy(() => import('../features/fmv/components/PhysicianFMV'));
const APPFMV = lazy(() => import('../features/fmv/components/APPFMV'));

interface ProviderAwareRoutesProps {
  // Additional props can be added here if needed
}

/**
 * Provider-Aware Routes Component
 * 
 * This component renders different routes based on the selected provider type,
 * enabling provider-specific views and functionality.
 */
export const ProviderAwareRoutes: React.FC<ProviderAwareRoutesProps> = () => {
  const { selectedProviderType, isPhysicianSelected, isAPPSelected, isBothSelected } = useProviderContext();
  
  // Load provider data for current selection
  const physicianData = useProviderData('PHYSICIAN', isPhysicianSelected || isBothSelected);
  const appData = useProviderData('APP', isAPPSelected || isBothSelected);

  // Render provider-specific analytics
  const renderAnalyticsRoute = () => {
    if (isPhysicianSelected) {
      if (physicianData.isEmpty) {
        return (
          <ProviderEmptyState
            providerType="PHYSICIAN"
            message={physicianData.emptyStateMessage || undefined}
            actions={physicianData.emptyStateActions || undefined}
            onAction={(action) => {
              if (action === 'upload') {
                // Navigate to upload page
                window.location.href = '/upload';
              } else if (action === 'switch_to_app') {
                // Switch to APP data
                // This would be handled by the context
              }
            }}
          />
        );
      }
      return <PhysicianAnalytics />;
    } else if (isAPPSelected) {
      if (appData.isEmpty) {
        return (
          <ProviderEmptyState
            providerType="APP"
            message={appData.emptyStateMessage || undefined}
            actions={appData.emptyStateActions || undefined}
            onAction={(action) => {
              if (action === 'upload') {
                // Navigate to upload page
                window.location.href = '/upload';
              } else if (action === 'switch_to_physician') {
                // Switch to Physician data
                // This would be handled by the context
              }
            }}
          />
        );
      }
      return <APPAnalytics />;
    } else {
      return <SurveyAnalytics />; // Combined view
    }
  };

  // Render provider-specific FMV
  const renderFMVRoute = () => {
    if (isPhysicianSelected) {
      return <PhysicianFMV />;
    } else if (isAPPSelected) {
      return <APPFMV />;
    } else {
      return <FairMarketValue />; // Combined view
    }
  };

  // Render provider-specific specialty mapping
  const renderSpecialtyMappingRoute = () => {
    return <SpecialtyMapping />;
  };

  // Render provider-specific regional analytics
  const renderRegionalAnalyticsRoute = () => {
    return <RegionalAnalytics />;
  };

  return (
    <Suspense fallback={<SuspenseSpinner />}>
      <Routes>
        {/* Dashboard - always available */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Upload - always available */}
        <Route path="/upload" element={<SurveyUpload />} />

        {/* Data Mapping - provider-aware */}
        <Route path="/specialty-mapping" element={renderSpecialtyMappingRoute()} />
        <Route path="/provider-type-mapping" element={<ProviderTypeMapping />} />
        <Route path="/region-mapping" element={<RegionMapping />} />
        <Route path="/variable-mapping" element={<VariableMapping />} />
        <Route path="/column-mapping" element={<ColumnMapping />} />

        {/* Analytics - provider-specific */}
        <Route path="/analytics" element={renderAnalyticsRoute()} />
        <Route path="/regional-analytics" element={renderRegionalAnalyticsRoute()} />
        <Route path="/survey-regional-analytics" element={<SurveyRegionalAnalytics />} />

        {/* FMV - provider-specific */}
        <Route path="/fair-market-value" element={renderFMVRoute()} />

        {/* Reports - always available */}
        <Route path="/custom-reports" element={<CustomReportsWrapper />} />

        {/* Data Views - always available */}
        <Route path="/normalized-data" element={<NormalizedDataScreen />} />

        {/* System - always available */}
        <Route path="/system-settings" element={<SystemSettings />} />
        <Route path="/download-test" element={<DownloadTest />} />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default ProviderAwareRoutes;
