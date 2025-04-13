import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SurveyUpload from './components/SurveyUpload';

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
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className={`flex-1 transition-all duration-300 overflow-x-auto ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <header className="h-16 border-b border-gray-100 bg-white flex items-center px-8 mb-6">
          <div>
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
              Survey Data Processing
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Upload and manage your survey data</p>
          </div>
        </header>
        
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-8">
          <div className="w-full">
            <SurveyUpload />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App; 