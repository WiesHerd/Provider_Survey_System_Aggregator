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
      case '/documents':
        return {
          title: 'Documents',
          description: 'Access and manage your survey documents'
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
          <Route path="/documents" element={<div className="p-4">Documents page coming soon</div>} />
          <Route path="/reports" element={<div className="p-4">Reports page coming soon</div>} />
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
        <Router>
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