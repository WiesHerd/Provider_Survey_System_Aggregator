import React, { useState, Suspense, lazy, useEffect, memo, useMemo } from 'react';
import { BrowserRouter as Router, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import EnhancedSidebar from './components/EnhancedSidebar';
import PageHeader from './components/PageHeader';
// import ProviderAwareRoutes from './components/ProviderAwareRoutes';
import { StorageProvider } from './contexts/StorageContext';
import { MappingProvider } from './contexts/MappingContext';
import { YearProvider } from './contexts/YearContext';
import { ProviderContextProvider } from './contexts/ProviderContext';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider, useDatabase } from './contexts/DatabaseContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { queryClient, cacheReadyPromise } from './shared/services/queryClient';
import './utils/indexedDBInspector'; // Initialize IndexedDB inspector
import { SuspenseSpinner } from './shared/components';
import { SurveyMigrationService } from './services/SurveyMigrationService';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { DatabaseDiagnostics } from './components/DatabaseDiagnostics';
import { validateAndLog } from './shared/utils/envValidation';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { UploadQueueToast, UploadProgressIndicator } from './components/upload/UploadQueueToast';

/**
 * Gates rendering of the router until the query cache has been restored from IndexedDB
 * (or after timeout), so first navigation hits hydrated cache.
 */
const CacheGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    cacheReadyPromise.then(() => setReady(true));
  }, []);
  if (!ready) {
    return <SuspenseSpinner message="Restoring cache..." />;
  }
  return <>{children}</>;
};

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6366f1', // Indigo color matching the app's design
    },
    secondary: {
      main: '#8b5cf6', // Purple color
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#f3f4f6',
            '&:hover': {
              backgroundColor: '#e5e7eb',
            },
          },
        },
      },
    },
  },
});

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
// IMPORTANT: Keep the legacy Upload screen as the default on /upload.
// The refactored Upload feature is available via /upload-beta for opt-in testing.
const SurveyUpload = lazy(() =>
  import('./components/SurveyUpload').then((module) => ({ default: module.SurveyUpload }))
);
const SurveyUploadBeta = lazy(() =>
  import('./features/upload').then((module) => ({ default: module.SurveyUpload }))
);
// Alias so any stray reference to SurveyUploadLegacy (e.g. from cache) resolves
const SurveyUploadLegacy = SurveyUpload;

// DevTools component - only loads in development
// Using string-based import to avoid TypeScript compile-time resolution
const LazyDevTools = lazy(() => {
  // @ts-ignore - DevTools is optional, module may not be available in all builds
  return import('@tanstack/react-query-devtools').then(module => ({ 
    default: module.ReactQueryDevtools 
  })).catch(() => ({ default: () => null }));
});
// Mapping screens: keep lazy loaders simple to avoid HMR/circular-init edge cases
const SpecialtyMapping = lazy(() =>
  import('./features/mapping/components/SpecialtyMapping').then((module) => ({
    default: module.SpecialtyMapping
  }))
);
const ProviderTypeMapping = lazy(() =>
  import('./features/mapping/components/ProviderTypeMapping').then((module) => ({
    default: module.ProviderTypeMapping
  }))
);
const RegionMapping = lazy(() =>
  import('./features/mapping/components/RegionMapping').then((module) => ({
    default: module.RegionMapping
  }))
);
const VariableMapping = lazy(() =>
  import('./features/mapping/components/VariableMapping').then((module) => ({
    default: module.VariableMapping
  }))
);
const SurveyAnalytics = lazy(() => 
  import('./features/analytics/components/SurveyAnalytics')
    .catch(error => {
      console.error('Failed to load SurveyAnalytics:', error);
      return { default: memo(() => <div>Failed to load analytics component</div>) };
    })
);
const RegionalAnalytics = lazy(() => 
  import('./components/RegionalAnalytics')
    .catch(error => {
      console.error('Failed to load RegionalAnalytics:', error);
      return { default: memo(() => <div>Failed to load regional analytics component</div>) };
    })
);
const FairMarketValue = lazy(() => 
  import('./components/FairMarketValue')
    .catch(error => {
      console.error('Failed to load FairMarketValue:', error);
      return { default: memo(() => <div>Failed to load fair market value component</div>) };
    })
);
const CustomReports = lazy(() => 
  import('./components/CustomReports')
    .catch(error => {
      console.error('Failed to load CustomReports:', error);
      return { default: memo(() => <div>Failed to load custom reports component</div>) };
    })
);
const CannedReports = lazy(() => import('./features/reports/components/CannedReports').then(module => ({ default: module.default })));
const SpecialtyBlending = lazy(() => import('./features/blending/components/SpecialtyBlendingScreenRefactored').then(module => ({ default: module.SpecialtyBlendingScreenRefactored })));
const SimpleAuthScreen = lazy(() => import('./components/auth/SimpleAuthScreen').then(module => ({ default: module.SimpleAuthScreen })));


/**
 * Database Initialization Screen
 * Shows while database is initializing or if there are errors
 */
const DatabaseInitializationScreen: React.FC = () => {
  const { isReady, isInitializing, healthStatus, error, initialize, repair, reset, clearError } = useDatabase();
  const [showAdvancedOptions, setShowAdvancedOptions] = React.useState(false);

  if (isReady && healthStatus === 'healthy') {
    return null; // Database is ready, show main app
  }

  const handleRetry = async () => {
    clearError();
    await initialize();
  };

  const handleRepair = async () => {
    clearError();
    await repair();
  };

  const handleReset = async () => {
    clearError();
    await reset();
  };

  const handleSkipInitialization = () => {
    // Force the app to continue even if database isn't ready
    // This is a fallback for corporate environments
    console.warn('⚠️ Skipping database initialization - app may not function properly');
    window.location.reload();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: 'background.default'
      }}
    >
      <Box
        sx={{
          maxWidth: 500,
          width: '100%',
          textAlign: 'center'
        }}
      >
        {isInitializing ? (
          <>
            <CircularProgress size={48} sx={{ mb: 3, color: 'primary.main' }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Initializing Database
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Setting up your local data storage. This may take a few moments...
            </Typography>
          </>
        ) : error ? (
          <>
            <Box sx={{ mb: 3 }}>
              <ExclamationTriangleIcon 
                style={{ 
                  width: 48, 
                  height: 48, 
                  color: '#6366f1',
                  margin: '0 auto'
                }} 
              />
            </Box>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
              Database Error
            </Typography>
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left', borderRadius: '8px' }}>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {error}
              </Typography>
            </Alert>
            
            {/* Troubleshooting tips */}
            <Box sx={{ mb: 3, p: 2.5, bgcolor: 'grey.50', borderRadius: '8px', border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                Troubleshooting Tips:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Try refreshing the page
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Check if your browser supports IndexedDB
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Clear browser cache and cookies
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Try a different browser (Chrome, Firefox, Edge)
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleRetry}
                sx={{ borderRadius: '8px', px: 3, textTransform: 'none', fontWeight: 500 }}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleRepair}
                sx={{ borderRadius: '8px', px: 3, textTransform: 'none', fontWeight: 500 }}
              >
                Repair Database
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="text"
                color="primary"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                sx={{ borderRadius: '8px', px: 2, textTransform: 'none', fontSize: '0.875rem' }}
              >
                {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
              </Button>
            </Box>
            
            {showAdvancedOptions && (
              <Box sx={{ mt: 3 }}>
                <DatabaseDiagnostics />
                
                <Box sx={{ mt: 3, p: 2.5, bgcolor: 'grey.50', borderRadius: '8px', border: '1px solid', borderColor: 'grey.200' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'text.primary' }}>
                    Advanced Options (Use with caution):
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleReset}
                        sx={{ borderRadius: '8px', px: 3, textTransform: 'none', fontWeight: 500 }}
                      >
                        Reset Database (Delete All Data)
                      </Button>
                      <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        Completely wipe and recreate the database. This will delete all surveys, mappings, and settings.
                      </Typography>
                    </Box>
                    <Box>
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleSkipInitialization}
                        sx={{ borderRadius: '8px', px: 3, textTransform: 'none', fontWeight: 500 }}
                      >
                        Skip Database Initialization
                      </Button>
                      <Typography variant="caption" display="block" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        This will bypass database initialization but may cause the app to malfunction.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <CheckCircleIcon 
                style={{ 
                  width: 48, 
                  height: 48, 
                  color: '#10b981',
                  margin: '0 auto'
                }} 
              />
            </Box>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              Database Ready
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your local data storage is ready to use.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};

const PageContent = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Check if we're on the dashboard (welcome screen)
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';
  
  const getHeaderContent = () => {
    // Provider-specific routes
    if (location.pathname.startsWith('/physician/')) {
      switch (location.pathname) {
        case '/physician/specialty-mapping':
          return {
            title: 'Physician Specialty Mapping',
            description: 'Map physician specialty names to standardized categories'
          };
        case '/physician/provider-type-mapping':
          return {
            title: 'Physician Provider Type Mapping',
            description: 'Map physician provider types to standardized categories'
          };
        case '/physician/region-mapping':
          return {
            title: 'Physician Region Mapping',
            description: 'Map geographic regions for physician data'
          };
        case '/physician/variable-mapping':
          return {
            title: 'Physician Variable Mapping',
            description: 'Map compensation variables for physician data'
          };
      }
    }

    if (location.pathname.startsWith('/app/')) {
      switch (location.pathname) {
        case '/app/specialty-mapping':
          return {
            title: 'APP Specialty Mapping',
            description: 'Map APP specialty names to standardized categories'
          };
        case '/app/provider-type-mapping':
          return {
            title: 'APP Provider Type Mapping',
            description: 'Map APP provider types (NP, PA, CRNA, etc.) to standardized categories'
          };
        case '/app/practice-setting-mapping':
          return {
            title: 'APP Practice Setting Mapping',
            description: 'Map APP practice settings (Hospital, Clinic, etc.) to standardized categories'
          };
        case '/app/supervision-level-mapping':
          return {
            title: 'APP Supervision Level Mapping',
            description: 'Map APP supervision levels (Independent, Supervised, etc.) to standardized categories'
          };
        case '/app/variable-mapping':
          return {
            title: 'APP Variable Mapping',
            description: 'Map compensation variables for APP data'
          };
      }
    }

    if (location.pathname.startsWith('/cross-provider/')) {
      switch (location.pathname) {
        case '/cross-provider/comparison':
          return {
            title: 'Provider Comparison',
            description: 'Compare compensation data between Physician and APP providers'
          };
        case '/cross-provider/market-analysis':
          return {
            title: 'Market Analysis',
            description: 'Cross-provider market analysis and trends'
          };
        case '/cross-provider/trends':
          return {
            title: 'Compensation Trends',
            description: 'Analyze compensation trends across provider types'
          };
      }
    }

    // Legacy routes (for backward compatibility)
    switch (location.pathname) {
      case '/dashboard':
        return {
          title: 'Dashboard',
          description: 'Overview of your survey data and analytics'
        };
      case '/upload':
        return {
          title: 'Upload Survey Data',
          description: 'Upload and process your compensation survey data'
        };
      case '/specialty-mapping':
        return {
          title: 'Specialty Mapping',
          description: 'Map specialty names to standardized categories'
        };
      case '/provider-type-mapping':
        return {
          title: 'Provider Type Mapping',
          description: 'Map provider types to standardized categories'
        };
      case '/region-mapping':
        return {
          title: 'Region Mapping',
          description: 'Map geographic regions to standardized categories'
        };
      case '/variable-mapping':
        return {
          title: 'Variable Mapping',
          description: 'Map compensation variables to standardized metrics'
        };
      case '/normalized-data':
        return {
          title: 'Normalized Data',
          description: 'View processed and standardized survey data'
        };
      case '/benchmarking':
        return {
          title: 'Benchmarking',
          description: 'Comprehensive analysis of your compensation data'
        };
      case '/regional-analytics':
        return {
          title: 'Regional Analytics',
          description: 'Geographic analysis of compensation data'
        };
      case '/survey-regional-analytics':
        return {
          title: 'Survey Regional Analytics',
          description: 'Regional analysis by survey source'
        };
       case '/custom-reports':
         return {
           title: 'Chart & Report Builder',
           description: 'Create custom reports and visualizations from your survey data'
         };
      case '/canned-reports':
        // Check for report name in URL search params
        const searchParams = new URLSearchParams(location.search);
        const reportName = searchParams.get('report');
        if (reportName) {
          // Format report name (e.g., "total-cash-compensation" -> "Total Cash Compensation")
          const formattedName = reportName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          return {
            title: `${formattedName} Report`,
            description: 'View and export your report data'
          };
        }
        return {
          title: 'Report Library',
          description: 'Select a pre-formatted report template and generate professional reports'
        };
      case '/fair-market-value':
        return {
          title: 'Fair Market Value',
          description: 'Calculate and compare fair market value'
        };
      case '/specialty-blending':
        return {
          title: 'Specialty Blending',
          description: 'Create custom specialty blends with precision weight controls'
        };
      default:
        return {
          title: 'Survey Aggregator',
          description: 'Professional survey data analysis platform'
        };
    }
  };

  const headerContent = useMemo(
    () => getHeaderContent(),
    [location.pathname, location.search]
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {!isDashboard && <EnhancedSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
      
      <div className={`flex-1 transition-all duration-300 flex flex-col ${!isDashboard ? (isSidebarOpen ? 'pl-64' : 'pl-16') : ''}`}>
        {!isDashboard && (
          <PageHeader 
            title={headerContent.title} 
            description={headerContent.description} 
            className={location.pathname === '/benchmarking' ? 'mb-0' : undefined}
          />
        )}
        <main className={`bg-gray-50 flex-1 ${isDashboard ? '' : 'px-8'}`}>
          <Suspense fallback={<SuspenseSpinner message="Loading page..." />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ErrorBoundary componentName="Dashboard">
                  <Dashboard />
                </ErrorBoundary>
              } />
              <Route path="/upload" element={
                <ErrorBoundary componentName="Upload">
                  <SurveyUpload />
                </ErrorBoundary>
              } />
              <Route path="/upload-beta" element={<SurveyUploadBeta />} />
              
              {/* Legacy routes (for backward compatibility) */}
              <Route path="/specialty-mapping" element={<SpecialtyMapping />} />
              <Route path="/provider-type-mapping" element={<ProviderTypeMapping />} />
              <Route path="/region-mapping" element={<RegionMapping />} />
              <Route path="/variable-mapping" element={<VariableMapping />} />
              <Route path="/benchmarking" element={
                <ErrorBoundary componentName="Analytics">
                  <SurveyAnalytics />
                </ErrorBoundary>
              } />
              <Route path="/regional-analytics" element={
                <ErrorBoundary componentName="Regional Analytics">
                  <RegionalAnalytics />
                </ErrorBoundary>
              } />
              <Route path="/fair-market-value" element={
                <ErrorBoundary componentName="Fair Market Value">
                  <FairMarketValue />
                </ErrorBoundary>
              } />
              <Route path="/custom-reports" element={
                <ErrorBoundary componentName="Custom Reports">
                  <CustomReports />
                </ErrorBoundary>
              } />
              <Route path="/canned-reports" element={
                <ErrorBoundary componentName="Canned Reports">
                  <CannedReports />
                </ErrorBoundary>
              } />
              <Route path="/specialty-blending" element={<SpecialtyBlending />} />
              
              {/* Provider-specific routes */}
              <Route path="/physician/specialty-mapping" element={<SpecialtyMapping />} />
              <Route path="/physician/provider-type-mapping" element={<ProviderTypeMapping />} />
              <Route path="/physician/region-mapping" element={<RegionMapping />} />
              <Route path="/physician/variable-mapping" element={<VariableMapping />} />
              <Route path="/physician/analytics" element={<SurveyAnalytics />} />
              <Route path="/physician/regional-analytics" element={<RegionalAnalytics />} />
              <Route path="/physician/fair-market-value" element={<FairMarketValue />} />
              <Route path="/physician/custom-reports" element={<CustomReports />} />
              
              <Route path="/app/specialty-mapping" element={<SpecialtyMapping />} />
              <Route path="/app/provider-type-mapping" element={<ProviderTypeMapping />} />
              <Route path="/app/practice-setting-mapping" element={<ProviderTypeMapping />} />
              <Route path="/app/supervision-level-mapping" element={<ProviderTypeMapping />} />
              <Route path="/app/variable-mapping" element={<VariableMapping />} />
              <Route path="/app/analytics" element={<SurveyAnalytics />} />
              <Route path="/app/regional-analytics" element={<RegionalAnalytics />} />
              <Route path="/app/fair-market-value" element={<FairMarketValue />} />
              <Route path="/app/custom-reports" element={<CustomReports />} />
              
              {/* Cross-provider routes */}
              <Route path="/cross-provider/comparison" element={<CustomReports />} />
              <Route path="/cross-provider/market-analysis" element={<SurveyAnalytics />} />
              <Route path="/cross-provider/trends" element={<RegionalAnalytics />} />
              
              {/* Simple authentication test route */}
              <Route path="/auth-test" element={<SimpleAuthScreen />} />
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

function App() {
  // Validate environment variables on app startup
  useEffect(() => {
    validateAndLog(process.env.NODE_ENV === 'development');
  }, []);

  // Run migration on app startup
  useEffect(() => {
    const runMigration = async () => {
      try {
        const migrationService = SurveyMigrationService.getInstance();
        const needsMigration = await migrationService.checkMigrationNeeded();
        
        if (needsMigration) {
          await migrationService.migrateSurveys();
        }
      } catch (error) {
        // Migration failed silently - app will continue to function
      }
    };

    runMigration();
  }, []);

  // Run user scoping migration on app startup
  useEffect(() => {
    const runUserScopingMigration = async () => {
      try {
        const { UserScopedMigrationService } = await import('./services/UserScopedMigrationService');
        const migrationService = UserScopedMigrationService.getInstance();
        const needsMigration = await migrationService.checkMigrationNeeded();
        
        if (needsMigration) {
          console.log('🔄 User scoping migration needed, starting migration...');
          const result = await migrationService.migrateToUserScoped();
          if (result.success) {
            console.log(`✅ User scoping migration completed: ${result.surveysMigrated} surveys, ${result.mappingsMigrated} mappings, ${result.dataRowsMigrated} data rows`);
          } else {
            console.warn('⚠️ User scoping migration completed with errors:', result.errors);
          }
        }
      } catch (error) {
        // Migration failed silently - app will continue to function
        console.error('❌ User scoping migration failed:', error);
      }
    };

    // Run after a short delay to ensure database is initialized
    const timeoutId = setTimeout(runUserScopingMigration, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Derive basename from PUBLIC_URL only when available (e.g., GitHub Pages build)
  const getBasename = (): string | undefined => {
    const publicUrl = process.env.PUBLIC_URL;
    if (!publicUrl) return undefined; // development: no basename
    try {
      const pathname = new URL(publicUrl, window.location.origin).pathname;
      return pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    } catch {
      // Fallback if PUBLIC_URL is a relative path
      return publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`;
    }
  };
  const basename = getBasename();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider>
          <DatabaseInitializationScreen />
          <AuthProvider>
            <ToastProvider>
              <StorageProvider>
                <MappingProvider>
                  <YearProvider>
                    <ProviderContextProvider>
                      <AuthGuard requireAuth={true}>
                        <CacheGate>
                          <Router basename={basename}>
                            <PageContent />
                          </Router>
                        </CacheGate>
                        <UploadQueueToast />
                        <UploadProgressIndicator />
                      </AuthGuard>
                    </ProviderContextProvider>
                  </YearProvider>
                </MappingProvider>
              </StorageProvider>
            </ToastProvider>
          </AuthProvider>
        </DatabaseProvider>
        {process.env.NODE_ENV === 'development' && (
          <Suspense fallback={null}>
            <LazyDevTools />
          </Suspense>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App; 