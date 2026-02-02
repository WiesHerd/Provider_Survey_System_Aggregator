/**
 * Route chunk preload map for sidebar hover.
 * Triggering the import starts loading the JS chunk so navigation shows content faster.
 * Paths must match the sidebar menu paths in EnhancedSidebar.
 */

export const routeChunkPreload: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('../components/Dashboard'),
  '/upload': () => import('../components/SurveyUpload'),
  '/upload-beta': () => import('../features/upload'),
  '/specialty-mapping': () => import('../features/mapping/components/SpecialtyMapping'),
  '/provider-type-mapping': () => import('../features/mapping/components/ProviderTypeMapping'),
  '/region-mapping': () => import('../features/mapping/components/RegionMapping'),
  '/variable-mapping': () => import('../features/mapping/components/VariableMapping'),
  '/benchmarking': () => import('../features/analytics/components/SurveyAnalytics'),
  '/regional-analytics': () => import('../components/RegionalAnalytics'),
  '/specialty-blending': () => import('../features/blending/components/SpecialtyBlendingScreenRefactored'),
  '/custom-reports': () => import('../components/CustomReports'),
  '/canned-reports': () => import('../features/reports/components/CannedReports'),
  '/fair-market-value': () => import('../components/FairMarketValue'),
};
