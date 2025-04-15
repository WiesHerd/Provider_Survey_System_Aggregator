import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SurveyUpload from './components/SurveyUpload';
import SpecialtyMapping from './components/SpecialtyMapping';
import ColumnMapping from './components/ColumnMapping';
import SurveyAnalytics from './components/SurveyAnalytics';
import PageHeader from './components/PageHeader';

const PageContent = () => {
  const location = useLocation();
  
  const getHeaderContent = () => {
    switch (location.pathname) {
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
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<SurveyUpload />} />
          <Route path="/specialty-mapping" element={<SpecialtyMapping />} />
          <Route path="/column-mapping" element={<ColumnMapping />} />
          <Route path="/analytics" element={<SurveyAnalytics />} />
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
    <Router>
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className={`flex-1 transition-all duration-300 overflow-x-auto ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
          <PageContent />
          </div>
      </div>
    </Router>
  );
}

export default App; 