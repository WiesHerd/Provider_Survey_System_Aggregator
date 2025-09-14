import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import PageHeader from './components/PageHeader';
import ProviderAwareRoutes from './components/ProviderAwareRoutes';
import { StorageProvider } from './contexts/StorageContext';
import { MappingProvider } from './contexts/MappingContext';
import { YearProvider } from './contexts/YearContext';
import { ProviderContextProvider } from './contexts/ProviderContext';
import './utils/indexedDBInspector'; // Initialize IndexedDB inspector
import { PageSpinner, SuspenseSpinner } from './shared/components';

// Lazy load dashboard component
const Dashboard = lazy(() => import('./components/Dashboard'));

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
          title: 'Survey Analytics',
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
      {!isDashboard && <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />}
      
      <div className={`flex-1 transition-all duration-300 flex flex-col ${!isDashboard ? (isSidebarOpen ? 'pl-64' : 'pl-20') : ''}`}>
        {!isDashboard && (
          <PageHeader 
            title={headerContent.title} 
            description={headerContent.description} 
            className={location.pathname === '/analytics' ? 'mb-0' : undefined}
          />
        )}
        <main className={`bg-gray-50 flex-1 overflow-auto ${isDashboard ? '' : 'px-8'}`}>
          <Suspense fallback={<SuspenseSpinner message="Loading page..." />}>
            <ProviderAwareRoutes />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

function App() {
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
  );
}

export default App; 