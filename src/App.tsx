import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SurveyUpload from './components/SurveyUpload';
import SpecialtyMapping from './components/SpecialtyMapping';
import ColumnMapping from './components/ColumnMapping';
import SurveyAnalytics from './components/SurveyAnalytics';
import PageHeader from './components/PageHeader';
import { RegionalAnalytics } from './components/RegionalAnalytics';
import { SurveyRegionalAnalytics } from './components/SurveyRegionalAnalytics';
import FairMarketValue from './components/FairMarketValue';
import { StorageProvider } from './contexts/StorageContext';
import { MappingProvider } from './contexts/MappingContext';
import { InformationCircleIcon, ArrowUpTrayIcon, LinkIcon, TableCellsIcon, PresentationChartLineIcon, CalculatorIcon, PrinterIcon } from '@heroicons/react/24/outline';

const PageContent = () => {
  const location = useLocation();
  
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
          description: 'Upload and validate your survey data files'
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

  return (
    <>
      <PageHeader title={headerContent.title} description={headerContent.description} />
      <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<SurveyUpload />} />
          <Route path="/specialty-mapping" element={<SpecialtyMapping />} />
          <Route path="/column-mapping" element={<ColumnMapping />} />
          <Route path="/analytics" element={<SurveyAnalytics />} />
          <Route path="/regional-analytics" element={<RegionalAnalytics />} />
          <Route path="/survey-regional-analytics" element={<SurveyRegionalAnalytics />} />
          <Route path="/fair-market-value" element={<FairMarketValue />} />
          <Route path="/instructions" element={
            <div className="p-4 max-w-2xl mx-auto">
              <ol className="space-y-6 ml-0">
                {[
                  { icon: ArrowUpTrayIcon, color: 'text-blue-500', title: 'Upload Your Survey Data', text: 'Go to Survey Processing → Upload Data. Click "Upload" and select your market survey CSV file. Follow the prompts to map your columns to the app\'s required fields.' },
                  { icon: LinkIcon, color: 'text-green-500', title: 'Map Specialties', text: 'After uploading, use Specialty Mapping to standardize specialty names across all surveys. This ensures accurate analytics and comparisons.' },
                  { icon: TableCellsIcon, color: 'text-purple-500', title: 'Map Columns', text: 'Use Column Mapping to match your data columns (e.g., provider type, region) to the app\'s expected format. This step is required for correct data processing.' },
                  { icon: PresentationChartLineIcon, color: 'text-yellow-500', title: 'Analyze Survey Data', text: 'Go to Survey Analytics or Regional Analytics to explore, filter, and compare your survey data. Use filters to focus on specific specialties, provider types, regions, or years.' },
                  { icon: CalculatorIcon, color: 'text-indigo-500', title: 'Calculate Fair Market Value', text: 'Open the Fair Market Value calculator. Enter compensation, wRVUs, or conversion factors to see how your values compare to market percentiles.' },
                  { icon: PrinterIcon, color: 'text-pink-500', title: 'Print or Export Reports', text: 'On analytics or calculator pages, click the Print button to generate a professional report for documentation or compliance.' }
                ].map((step, idx) => (
                  <li key={step.title} className="flex items-center gap-5">
                    <div className="flex flex-col items-center">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg border-4 border-white shadow">{idx + 1}</span>
                      <step.icon className={`w-7 h-7 mt-2 ${step.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-10 text-gray-700 bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <b>Tip:</b> For best results, ensure your uploaded data is clean and columns are mapped correctly. For help, contact your system administrator or refer to the user guide.
              </div>
            </div>
          } />
          <Route path="/reports" element={<div className="p-4">Reports page coming soon</div>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </>
  );
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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

  return (
    <StorageProvider>
      <MappingProvider>
        <Router basename={process.env.PUBLIC_URL}>
          <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            
            <div className={`flex-1 transition-all duration-300 overflow-x-auto ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
              <PageContent />
            </div>
          </div>
        </Router>
      </MappingProvider>
    </StorageProvider>
  );
}

export default App; 