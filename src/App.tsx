import React, { useState, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import EnhancedSidebar from './components/EnhancedSidebar';
import PageHeader from './components/PageHeader';
// import ProviderAwareRoutes from './components/ProviderAwareRoutes';
import { StorageProvider } from './contexts/StorageContext';
import { MappingProvider } from './contexts/MappingContext';
import { YearProvider } from './contexts/YearContext';
import { ProviderContextProvider } from './contexts/ProviderContext';
import './utils/indexedDBInspector'; // Initialize IndexedDB inspector
import { PageSpinner, SuspenseSpinner } from './shared/components';
import { SurveyMigrationService } from './services/SurveyMigrationService';

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
const SurveyUpload = lazy(() => import('./components/SurveyUpload'));
const SpecialtyMapping = lazy(() => import('./features/mapping/components/SpecialtyMapping').then(module => ({ default: module.SpecialtyMapping })));
const ProviderTypeMapping = lazy(() => import('./features/mapping/components/ProviderTypeMapping').then(module => ({ default: module.ProviderTypeMapping })));
const RegionMapping = lazy(() => import('./features/mapping/components/RegionMapping').then(module => ({ default: module.RegionMapping })));
const VariableMapping = lazy(() => import('./features/mapping/components/VariableMapping').then(module => ({ default: module.VariableMapping })));
const ColumnMapping = lazy(() => import('./components/ColumnMapping'));
const SurveyAnalytics = lazy(() => import('./features/analytics/components/SurveyAnalytics'));
const RegionalAnalytics = lazy(() => import('./components/RegionalAnalytics'));
const FairMarketValue = lazy(() => import('./components/FairMarketValue'));
const CustomReports = lazy(() => import('./components/CustomReports'));
const SystemSettings = lazy(() => import('./components/SystemSettings'));
const SpecialtyBlending = lazy(() => import('./features/blending/components/SpecialtyBlendingScreenRefactored').then(module => ({ default: module.SpecialtyBlendingScreenRefactored })));

// Loading component for Suspense fallback
const AppLoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <PageSpinner message="Initializing application..." />
  </div>
);

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
        case '/physician/column-mapping':
          return {
            title: 'Physician Column Mapping',
            description: 'Map data columns for physician surveys'
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
        case '/app/column-mapping':
          return {
            title: 'APP Column Mapping',
            description: 'Map data columns for APP surveys'
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
      case '/column-mapping':
        return {
          title: 'Column Mapping',
          description: 'Map data columns to required fields'
        };
      case '/normalized-data':
        return {
          title: 'Normalized Data',
          description: 'View processed and standardized survey data'
        };
      case '/analytics':
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
          title: 'Custom Reports',
          description: 'Generate custom reports and exports'
        };
      case '/fair-market-value':
        return {
          title: 'Fair Market Value',
          description: 'Calculate and compare fair market value'
        };
      case '/system-settings':
        return {
          title: 'System Settings',
          description: 'Configure system preferences and settings'
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

  const headerContent = getHeaderContent();

  return (
    <div className="flex h-screen bg-gray-50">
      {!isDashboard && <EnhancedSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
      
      <div className={`flex-1 transition-all duration-300 flex flex-col ${!isDashboard ? (isSidebarOpen ? 'pl-64' : 'pl-16') : ''}`}>
        {!isDashboard && (
          <PageHeader 
            title={headerContent.title} 
            description={headerContent.description} 
            className={location.pathname === '/analytics' ? 'mb-0' : undefined}
          />
        )}
        <main className={`bg-gray-50 flex-1 overflow-auto ${isDashboard ? '' : 'px-8'}`}>
          <Suspense fallback={<SuspenseSpinner message="Loading page..." />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<SurveyUpload />} />
              
              {/* Legacy routes (for backward compatibility) */}
              <Route path="/specialty-mapping" element={<SpecialtyMapping />} />
              <Route path="/provider-type-mapping" element={<ProviderTypeMapping />} />
              <Route path="/region-mapping" element={<RegionMapping />} />
              <Route path="/variable-mapping" element={<VariableMapping />} />
              <Route path="/column-mapping" element={<ColumnMapping />} />
              <Route path="/analytics" element={<SurveyAnalytics />} />
              <Route path="/regional-analytics" element={<RegionalAnalytics />} />
              <Route path="/fair-market-value" element={<FairMarketValue />} />
              <Route path="/custom-reports" element={<CustomReports />} />
              <Route path="/system-settings" element={<SystemSettings />} />
              <Route path="/specialty-blending" element={<SpecialtyBlending />} />
              
              {/* Provider-specific routes */}
              <Route path="/physician/specialty-mapping" element={<SpecialtyMapping />} />
              <Route path="/physician/provider-type-mapping" element={<ProviderTypeMapping />} />
              <Route path="/physician/region-mapping" element={<RegionMapping />} />
              <Route path="/physician/variable-mapping" element={<VariableMapping />} />
              <Route path="/physician/column-mapping" element={<ColumnMapping />} />
              <Route path="/physician/analytics" element={<SurveyAnalytics />} />
              <Route path="/physician/regional-analytics" element={<RegionalAnalytics />} />
              <Route path="/physician/fair-market-value" element={<FairMarketValue />} />
              <Route path="/physician/custom-reports" element={<CustomReports />} />
              
              <Route path="/app/specialty-mapping" element={<SpecialtyMapping />} />
              <Route path="/app/provider-type-mapping" element={<ProviderTypeMapping />} />
              <Route path="/app/practice-setting-mapping" element={<ProviderTypeMapping />} />
              <Route path="/app/supervision-level-mapping" element={<ProviderTypeMapping />} />
              <Route path="/app/variable-mapping" element={<VariableMapping />} />
              <Route path="/app/column-mapping" element={<ColumnMapping />} />
              <Route path="/app/analytics" element={<SurveyAnalytics />} />
              <Route path="/app/regional-analytics" element={<RegionalAnalytics />} />
              <Route path="/app/fair-market-value" element={<FairMarketValue />} />
              <Route path="/app/custom-reports" element={<CustomReports />} />
              
              {/* Cross-provider routes */}
              <Route path="/cross-provider/comparison" element={<CustomReports />} />
              <Route path="/cross-provider/market-analysis" element={<SurveyAnalytics />} />
              <Route path="/cross-provider/trends" element={<RegionalAnalytics />} />
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

function App() {
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
      <StorageProvider>
        <MappingProvider>
          <YearProvider>
            <ProviderContextProvider>
              <Router basename={basename}>
                <PageContent />
              </Router>
            </ProviderContextProvider>
          </YearProvider>
        </MappingProvider>
      </StorageProvider>
    </ThemeProvider>
  );
}

export default App; 