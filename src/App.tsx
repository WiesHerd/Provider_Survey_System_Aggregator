import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PageHeader from './components/PageHeader';
import { StorageProvider } from './contexts/StorageContext';
import { MappingProvider } from './contexts/MappingContext';
import { YearProvider } from './contexts/YearContext';
import './utils/indexedDBInspector'; // Initialize IndexedDB inspector
import { ArrowUpTrayIcon, LinkIcon, TableCellsIcon, PresentationChartLineIcon, CalculatorIcon, PrinterIcon } from '@heroicons/react/24/outline';

// Lazy load all route components for code splitting
const SurveyUpload = lazy(() => import('./components/SurveyUpload'));
const SpecialtyMapping = lazy(() => import('./features/mapping').then(module => ({ default: module.SpecialtyMapping })));
const ColumnMapping = lazy(() => import('./components/ColumnMapping'));
const SurveyAnalytics = lazy(() => import('./components/AnalyticsWrapper'));
const RegionalAnalytics = lazy(() => import('./components/RegionalAnalytics'));
const SurveyRegionalAnalytics = lazy(() => import('./components/SurveyRegionalAnalytics').then(module => ({ default: module.SurveyRegionalAnalytics })));
const FairMarketValue = lazy(() => import('./components/FairMarketValue'));
const CustomReportsWrapper = lazy(() => import('./components/CustomReportsWrapper'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
          title: 'Survey Data Upload',
          description: 'Upload and validate your survey data files',
          showDownloadButton: false
        };
      case '/specialty-mapping':
        return {
          title: 'Specialty Mapping',
          description: 'Map and standardize specialty names across surveys'
        };
      case '/column-mapping':
        return {
          title: 'Column Mapping',
          description: 'Define column mappings and data transformations'
        };
      case '/analytics':
        return {
          title: 'Survey Analytics',
          description: 'Analyze and compare data across multiple surveys'
        };
      case '/regional-analytics':
        return {
          title: 'Regional Analytics',
          description: 'Analyze data across multiple regions'
        };
      case '/survey-regional-analytics':
        return {
          title: 'Survey Regional Analytics',
          description: 'Analyze regional survey data with detailed filtering'
        };
      case '/custom-reports':
        return {
          title: 'Custom Reports',
          description: 'Create custom reports and visualizations from your survey data'
        };
      case '/fair-market-value':
        return {
          title: 'Fair Market Value Calculator',
          description: 'Calculate and compare compensation with market data'
        };
      case '/instructions':
        return {
          title: 'Instructions',
          description: 'How to use the BenchPoint Survey Aggregator and Market Analytics App'
        };
      case '/reports':
        return {
          title: 'Reports',
          description: 'View and generate survey reports'
        };
      default:
        return {
          title: 'Market Intelligence',
          description: 'Survey data processing and analysis'
        };
    }
  };

  const headerContent = getHeaderContent();

  // Restore and persist sidebar open state
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebarOpen');
      if (stored !== null) {
        setIsSidebarOpen(stored === '1');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('sidebarOpen', isSidebarOpen ? '1' : '0');
    } catch {}
  }, [isSidebarOpen]);

  // Auto-close sidebar on route change for small screens
  React.useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // If it's the dashboard, render without sidebar
  if (isDashboard) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  // For all other pages, render with sidebar
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'pl-64' : 'pl-20'}`}>
        <PageHeader 
          title={headerContent.title} 
          description={headerContent.description} 
          showDownloadButton={headerContent.showDownloadButton}
          titleClassName={location.pathname === '/upload' ? 'text-lg' : undefined}
          className={location.pathname === '/analytics' ? 'mb-0' : undefined}
        />
        <main className="bg-gray-50 px-8">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/upload" element={<SurveyUpload />} />
              <Route path="/specialty-mapping" element={<SpecialtyMapping />} />
              <Route path="/column-mapping" element={<ColumnMapping />} />
              <Route path="/analytics" element={<SurveyAnalytics />} />
              <Route path="/regional-analytics" element={<RegionalAnalytics />} />
              <Route path="/survey-regional-analytics" element={<SurveyRegionalAnalytics />} />
              <Route path="/custom-reports" element={<CustomReportsWrapper />} />
              <Route path="/fair-market-value" element={<FairMarketValue />} />
              <Route path="/instructions" element={
                <div className="min-h-screen bg-gray-50">
                  <div className="max-w-5xl mx-auto py-4">
                    {/* Header Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                      <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                          Getting Started Guide
                        </h1>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                          Follow these steps to set up and use the Survey Aggregator system effectively.
                        </p>
                      </div>
                    </div>

                    {/* Instructions Steps */}
                    <div className="space-y-4">
                      {[
                        { 
                          icon: ArrowUpTrayIcon, 
                          color: 'bg-blue-500', 
                          iconColor: 'text-blue-600',
                          title: 'Upload Your Survey Data', 
                          text: 'Go to Survey Processing → Upload Data. Click "Upload" and select your market survey CSV file. Follow the prompts to map your columns to the app\'s required fields.',
                          details: 'Supported formats: CSV, Excel. Ensure your data includes provider information, compensation metrics, and specialty classifications.'
                        },
                        { 
                          icon: LinkIcon, 
                          color: 'bg-green-500', 
                          iconColor: 'text-green-600',
                          title: 'Map Specialties', 
                          text: 'After uploading, use Specialty Mapping to standardize specialty names across all surveys. This ensures accurate analytics and comparisons.',
                          details: 'The system will suggest mappings based on common patterns. Review and approve each mapping for accuracy.'
                        },
                        { 
                          icon: TableCellsIcon, 
                          color: 'bg-purple-500', 
                          iconColor: 'text-purple-600',
                          title: 'Map Columns', 
                          text: 'Use Column Mapping to match your data columns (e.g., provider type, region) to the app\'s expected format. This step is required for correct data processing.',
                          details: 'Map key fields like geographic region, provider type, and survey year to enable advanced filtering and analysis.'
                        },
                        { 
                          icon: PresentationChartLineIcon, 
                          color: 'bg-yellow-500', 
                          iconColor: 'text-yellow-600',
                          title: 'Analyze Survey Data', 
                          text: 'Go to Survey Analytics or Regional Analytics to explore, filter, and compare your survey data. Use filters to focus on specific specialties, provider types, regions, or years.',
                          details: 'Use the interactive charts and tables to identify trends, compare compensation across regions, and analyze productivity metrics.'
                        },
                        { 
                          icon: CalculatorIcon, 
                          color: 'bg-indigo-500', 
                          iconColor: 'text-indigo-600',
                          title: 'Calculate Fair Market Value', 
                          text: 'Open the Fair Market Value calculator. Enter compensation, wRVUs, or conversion factors to see how your values compare to market percentiles.',
                          details: 'Compare your compensation data against market benchmarks to ensure compliance and competitive positioning.'
                        },
                        { 
                          icon: PrinterIcon, 
                          color: 'bg-pink-500', 
                          iconColor: 'text-pink-600',
                          title: 'Print or Export Reports', 
                          text: 'On analytics or calculator pages, click the Print button to generate a professional report for documentation or compliance.',
                          details: 'Export data to Excel or generate PDF reports for presentations, compliance documentation, or executive summaries.'
                        }
                      ].map((step, idx) => (
                        <div key={step.title} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start gap-4">
                            {/* Step Number and Icon */}
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full ${step.color} text-white font-bold text-base flex items-center justify-center shadow-lg mb-2`}>
                                {idx + 1}
                              </div>
                              <div className={`w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-200`}>
                                <step.icon className={`w-5 h-5 ${step.iconColor}`} />
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                              <p className="text-gray-700 mb-2 leading-relaxed text-sm">{step.text}</p>
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-700">Pro Tip:</span> {step.details}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Help Section */}
                    <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 mb-2">Need Help?</h3>
                          <p className="text-gray-700 mb-3 text-sm">
                            For best results, ensure your uploaded data is clean and columns are mapped correctly. 
                            If you encounter issues or need assistance, our support team is here to help.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Data Quality
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Column Mapping
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Analytics
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              FMV Calculator
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              } />
              <Route path="/reports" element={<div className="p-4">Reports page coming soon</div>} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

function App() {
  // Close year picker when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const yearPicker = document.querySelector('[data-year-picker]');
      if (yearPicker && !yearPicker.contains(e.target as Node)) {
        // This will be handled by the SurveyUpload component
        window.dispatchEvent(new CustomEvent('closeYearPicker'));
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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
    <StorageProvider>
      <MappingProvider>
        <YearProvider>
          <Router basename={basename}>
            <PageContent />
          </Router>
        </YearProvider>
      </MappingProvider>
    </StorageProvider>
  );
}

export default App; 